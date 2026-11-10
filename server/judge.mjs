// 本地编译运行：C++ 和 Python，带超时和输出上限。
import './config.mjs';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const works = (cmd, args) => {
  try { return spawnSync(cmd, args, { stdio: 'ignore', timeout: 10_000 }).status === 0; } catch { return false; }
};
const firstWorking = (cands, args) => cands.filter(Boolean).find((c) => works(c, args)) || null;
const WIN = process.platform === 'win32';

export const CXX = firstWorking([process.env.CXX, existsSync('/usr/bin/clang++') ? '/usr/bin/clang++' : null, 'clang++', 'g++', 'c++'], ['--version']);
export const PYTHON = firstWorking([process.env.PYTHON, 'python3', 'python'], ['-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)']);

export const LANGS = {
  cpp: {
    label: 'C++20',
    file: 'main.cpp',
    monaco: 'cpp',
    available: !!CXX,
    compile: (dir) => [CXX, ['-std=c++20', '-O2', '-Wall', '-Wextra', '-o', path.join(dir, WIN ? 'main.exe' : 'main'), 'main.cpp']],
    run: (dir) => [path.join(dir, WIN ? 'main.exe' : 'main'), []],
  },
  py: {
    label: 'Python 3',
    file: 'main.py',
    monaco: 'python',
    available: !!PYTHON,
    compile: null,
    run: () => [PYTHON, ['main.py']],
  },
};
export const availableLangs = () => Object.keys(LANGS).filter((l) => LANGS[l].available);

const MAX_OUT = 200_000;

export function exec(cmd, args, { cwd, stdin = '', timeoutMs = 5000 }) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let stdout = '', stderr = '', timedOut = false, done = false;
    let child;
    try {
      child = spawn(cmd, args, { cwd });
    } catch (e) {
      return resolve({ code: -1, signal: null, stdout: '', stderr: String(e), timedOut: false, ms: 0 });
    }
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
    const cap = (cur, chunk) => (cur.length < MAX_OUT ? cur + chunk.toString().slice(0, MAX_OUT - cur.length) : cur);
    child.stdout.on('data', (d) => { stdout = cap(stdout, d); });
    child.stderr.on('data', (d) => { stderr = cap(stderr, d); });
    const finish = (code, signal, err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr: err ? stderr + String(err) : stderr, timedOut, ms: Date.now() - t0 });
    };
    child.on('error', (e) => finish(-1, null, e));
    child.on('close', (code, signal) => finish(code, signal));
    child.stdin.on('error', () => {});
    child.stdin.end(stdin);
  });
}

// 写入源码并编译。返回 { ok, stderr }。
export async function prepare(dir, lang, code) {
  const L = LANGS[lang];
  if (!L || !L.available) return { ok: false, stderr: `${L?.label || lang} is not available on this machine` };
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, L.file), code);
  if (!L.compile) return { ok: true, stderr: '' };
  const [cmd, args] = L.compile(dir);
  const r = await exec(cmd, args, { cwd: dir, timeoutMs: 30_000 });
  if (r.timedOut) return { ok: false, stderr: 'compilation timed out' };
  return { ok: r.code === 0, stderr: r.stderr };
}

export function run(dir, lang, stdin, timeoutMs = 3000) {
  const [cmd, args] = LANGS[lang].run(dir);
  return exec(cmd, args, { cwd: dir, stdin, timeoutMs });
}

const norm = (s) => s.replace(/\r/g, '').split('\n').map((l) => l.trimEnd()).join('\n').trimEnd();

export async function runTests(dir, lang, code, tests, timeoutMs = 3000) {
  const compile = await prepare(dir, lang, code);
  if (!compile.ok) return { compile, results: [], passed: 0, total: tests.length };
  const results = [];
  for (const t of tests) {
    const r = await run(dir, lang, t.input, timeoutMs);
    const pass = !r.timedOut && r.code === 0 && norm(r.stdout) === norm(t.expected);
    results.push({
      name: t.name, stage: t.stage, hidden: !!t.hidden, pass, ms: r.ms,
      timedOut: r.timedOut, exitCode: r.code, signal: r.signal,
      input: t.input, expected: t.expected, stdout: r.stdout, stderr: r.stderr.slice(0, 4000),
    });
  }
  return { compile, results, passed: results.filter((r) => r.pass).length, total: results.length };
}
