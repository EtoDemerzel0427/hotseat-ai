// 题库：problems/<slug>/ 目录的读取、测试构建、校验、发布。
//
// 目录格式（中英双语）：
//   problem.json    { title: { zh, en }, difficulty, minutes, stages: ["statement", "stage2"], timeLimitMs? }
//   <stage>.zh.md / <stage>.en.md   每个阶段的题面，两种语言各一份
//   starter.cpp / starter.py   起始代码（完整程序，读 stdin 写 stdout），注释用英文
//   solution.py 或 solution.cpp  参考解，候选人看不到
//   inputs.json     [{ name: { zh, en }, stage, hidden, input }]
//   interviewer.md  面试官备注（英文）：期望解法、常见坑、追问、分级提示
//   tests.json      由参考解对 inputs.json 跑出来的，自动生成
// 以 _draft- 开头的目录是工作台里还没发布的草稿。
import { PROBLEMS_DIR } from './config.mjs';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { LANGS, prepare, run, runTests } from './judge.mjs';

export { PROBLEMS_DIR };

const read = (p) => readFile(p, 'utf8');
const readOr = async (p, d = '') => (existsSync(p) ? read(p) : d);
export const LOCALES = ['zh', 'en'];
const other = (l) => (l === 'en' ? 'zh' : 'en');
export const pick = (v, locale) => (v && typeof v === 'object' ? v[locale] ?? v[other(locale)] ?? '' : String(v ?? ''));
export const isDraft = (slug) => slug.startsWith('_draft-');

export function problemDir(slug) {
  if (!/^[\w-]+$/.test(slug)) throw new Error('非法题目名');
  return path.join(PROBLEMS_DIR, slug);
}

function stageFile(dir, entry, locale) {
  const base = entry.replace(/\.md$/, '');
  const cands = [`${base}.${locale}.md`, `${base}.md`, `${base}.${other(locale)}.md`];
  const hit = cands.map((f) => path.join(dir, f)).find(existsSync);
  if (!hit) throw new Error(`缺少题面文件 ${base}`);
  return hit;
}

export async function buildTests(slug) {
  const dir = problemDir(slug);
  const inputs = JSON.parse(await read(path.join(dir, 'inputs.json')));
  const lang = existsSync(path.join(dir, 'solution.py')) ? 'py' : 'cpp';
  const solution = await read(path.join(dir, lang === 'py' ? 'solution.py' : 'solution.cpp'));
  const work = path.join(os.tmpdir(), `mock-build-${slug}-${Date.now()}`);
  try {
    const c = await prepare(work, lang, solution);
    if (!c.ok) throw new Error(`reference solution does not compile:\n${c.stderr}`);
    const tests = [];
    for (const t of inputs) {
      const r = await run(work, lang, t.input, 10_000);
      if (r.timedOut || r.code !== 0) {
        throw new Error(`reference solution failed on test "${pick(t.name, 'en')}" (exit ${r.code}${r.timedOut ? ', timeout' : ''}):\n${r.stderr.slice(0, 2000)}`);
      }
      tests.push({ name: t.name, stage: t.stage || 1, hidden: !!t.hidden, input: t.input, expected: r.stdout });
    }
    await writeFile(path.join(dir, 'tests.json'), JSON.stringify(tests, null, 2));
    return tests;
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

// 起始代码必须能编译，并且在每个用例上正常退出。
export async function checkStarters(slug, tests) {
  const dir = problemDir(slug);
  const report = {};
  for (const lang of Object.keys(LANGS)) {
    const p = path.join(dir, `starter.${lang}`);
    if (!existsSync(p)) continue;
    const work = path.join(os.tmpdir(), `mock-starter-${slug}-${lang}-${Date.now()}`);
    try {
      const r = await runTests(work, lang, await read(p), tests, 5000);
      if (!r.compile.ok) throw new Error(`${LANGS[lang].label} starter does not compile:\n${r.compile.stderr.slice(0, 1500)}`);
      const crash = r.results.find((t) => t.timedOut || t.exitCode !== 0);
      if (crash) throw new Error(`${LANGS[lang].label} starter ${crash.timedOut ? 'timed out' : `exited with ${crash.exitCode ?? crash.signal}`} on test "${crash.name}":\n${crash.stderr.slice(0, 800)}`);
      report[lang] = `${r.passed}/${r.total}`;
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }
  return report;
}

// 完整校验一道题。返回 { ok, message }，message 是给人和出题助手看的英文说明。
export async function validateProblem(slug) {
  try {
    const dir = problemDir(slug);
    if (!existsSync(path.join(dir, 'problem.json'))) throw new Error('problem.json is missing');
    const meta = JSON.parse(await read(path.join(dir, 'problem.json')));
    if (!Array.isArray(meta.stages) || !meta.stages.length) throw new Error('problem.json needs a non-empty "stages" array');
    if (!['easy', 'medium', 'hard'].includes(meta.difficulty)) throw new Error('problem.json "difficulty" must be easy, medium or hard');
    for (const k of LOCALES) {
      if (!meta.title?.[k]) throw new Error(`problem.json title.${k} is missing`);
      for (const s of meta.stages) if (!existsSync(path.join(dir, `${s}.${k}.md`))) throw new Error(`missing ${s}.${k}.md`);
    }
    for (const f of ['starter.cpp', 'starter.py', 'interviewer.md', 'inputs.json']) if (!existsSync(path.join(dir, f))) throw new Error(`missing ${f}`);
    if (!['solution.py', 'solution.cpp'].some((f) => existsSync(path.join(dir, f)))) throw new Error('missing solution.py (or solution.cpp)');
    const tests = await buildTests(slug);
    if (!tests.length) throw new Error('inputs.json has no tests');
    for (const t of tests) if (!t.name?.zh || !t.name?.en) throw new Error('every test name must be { "zh": ..., "en": ... }');
    for (let i = 1; i <= meta.stages.length; i++) {
      const st = tests.filter((t) => t.stage === i);
      if (!st.length) throw new Error(`no tests for stage ${i}`);
      if (!st.some((t) => !t.hidden)) throw new Error(`stage ${i} has no public test`);
    }
    const starters = await checkStarters(slug, tests.map((t) => ({ ...t, name: pick(t.name, 'en') })));
    const perStage = meta.stages.map((_, i) => `stage ${i + 1}: ${tests.filter((t) => t.stage === i + 1).length}`).join(', ');
    return {
      ok: true,
      message: `OK. ${tests.length} tests (${perStage}; ${tests.filter((t) => t.hidden).length} hidden). Starters compile and exit cleanly on every test; tests the unmodified starter already passes: ${Object.entries(starters).map(([l, v]) => `${l} ${v}`).join(', ')}.`,
    };
  } catch (e) {
    return { ok: false, message: `FAILED: ${e.message}` };
  }
}

export async function loadProblem(slug, locale = 'zh') {
  const dir = problemDir(slug);
  const meta = JSON.parse(await read(path.join(dir, 'problem.json')));
  const stages = await Promise.all(meta.stages.map((f) => read(stageFile(dir, f, locale))));
  const starters = {};
  for (const lang of Object.keys(LANGS)) {
    const p = path.join(dir, `starter.${lang}`);
    if (existsSync(p)) starters[lang] = await read(p);
  }
  // 任何源文件比 tests.json 新，就重新生成期望输出。
  const testsPath = path.join(dir, 'tests.json');
  let fresh = existsSync(testsPath);
  if (fresh) {
    const tm = (await stat(testsPath)).mtimeMs;
    for (const f of ['inputs.json', 'solution.py', 'solution.cpp']) {
      const p = path.join(dir, f);
      if (existsSync(p) && (await stat(p)).mtimeMs > tm) fresh = false;
    }
  }
  const tests = (fresh ? JSON.parse(await read(testsPath)) : await buildTests(slug))
    .map((t) => ({ ...t, name: pick(t.name, locale) }));
  const solPath = ['solution.py', 'solution.cpp'].map((f) => path.join(dir, f)).find(existsSync);
  return {
    slug, meta, title: pick(meta.title, locale), stages, starters, tests,
    interviewerNotes: await readOr(path.join(dir, 'interviewer.md')),
    solution: solPath ? await read(solPath) : '',
  };
}

export async function listProblems() {
  const out = [];
  for (const d of await readdir(PROBLEMS_DIR, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith('.')) continue;
    const draft = isDraft(d.name);
    if (d.name.startsWith('_') && !draft) continue;
    try {
      const meta = JSON.parse(await read(path.join(PROBLEMS_DIR, d.name, 'problem.json')));
      const langs = Object.keys(LANGS).filter((l) => existsSync(path.join(PROBLEMS_DIR, d.name, `starter.${l}`)));
      out.push({ slug: d.name, draft, title: { zh: pick(meta.title, 'zh'), en: pick(meta.title, 'en') }, difficulty: meta.difficulty, stages: meta.stages?.length || 0, minutes: meta.minutes || 45, langs });
    } catch {
      if (draft) out.push({ slug: d.name, draft, title: { zh: '未命名草稿', en: 'Untitled draft' }, difficulty: '', stages: 0, minutes: 45, langs: [] });
    }
  }
  return out;
}

// ---------- 工作台用的文件接口 ----------
const FILE_RE = /^[\w-]+(\.[\w-]+)+$/;
const ORDER = ['problem.json', 'statement', 'stage', 'starter', 'solution', 'inputs.json', 'interviewer.md'];
const rank = (n) => { const i = ORDER.findIndex((p) => n.startsWith(p)); return i < 0 ? ORDER.length : i; };

export async function listFiles(slug) {
  const dir = problemDir(slug);
  const names = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isFile() && FILE_RE.test(d.name) && d.name !== 'tests.json').map((d) => d.name);
  return names.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export async function readProblemFile(slug, name) {
  if (!FILE_RE.test(name)) throw new Error('bad file name');
  return read(path.join(problemDir(slug), name));
}

export async function writeProblemFile(slug, name, content) {
  if (!FILE_RE.test(name) || name === 'tests.json') throw new Error('bad file name');
  await writeFile(path.join(problemDir(slug), name), content);
}

export async function createDraft() {
  const slug = `_draft-${Date.now()}`;
  await mkdir(problemDir(slug), { recursive: true });
  return slug;
}

export async function publishDraft(slug) {
  if (!isDraft(slug)) throw new Error('not a draft');
  const v = await validateProblem(slug);
  if (!v.ok) throw new Error(v.message);
  const meta = JSON.parse(await read(path.join(problemDir(slug), 'problem.json')));
  let name = String(meta.slug || meta.title.en).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'problem';
  while (existsSync(path.join(PROBLEMS_DIR, name))) name += '-2';
  await rename(problemDir(slug), path.join(PROBLEMS_DIR, name));
  return name;
}

export async function deleteDraft(slug) {
  if (!isDraft(slug)) throw new Error('not a draft');
  await rm(problemDir(slug), { recursive: true, force: true });
}
