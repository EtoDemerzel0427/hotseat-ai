// 本地编译运行：C++ 和 Python，带超时和输出上限。
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CXX = process.env.CXX || (existsSync('/usr/bin/clang++') ? '/usr/bin/clang++' : 'clang++');
const PYTHON = process.env.PYTHON || 'python3';

export const LANGS = {
  cpp: {
    label: 'C++20',
    file: 'main.cpp',
    monaco: 'cpp',
    compile: [CXX, ['-std=c++20', '-O2', '-Wall', '-Wextra', '-o', 'main', 'main.cpp']],
    run: ['./main', []],
  },
  py: {
    label: 'Python 3',
    file: 'main.py',
    monaco: 'python',
    compile: null,
    run: [PYTHON, ['main.py']],
  },
};

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
  if (!L) return { ok: false, stderr: `不支持的语言: ${lang}` };
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, L.file), code);
  if (!L.compile) return { ok: true, stderr: '' };
  const r = await exec(L.compile[0], L.compile[1], { cwd: dir, timeoutMs: 30_000 });
  if (r.timedOut) return { ok: false, stderr: '编译超时' };
  return { ok: r.code === 0, stderr: r.stderr };
}

export function run(dir, lang, stdin, timeoutMs = 3000) {
  const L = LANGS[lang];
  return exec(L.run[0], L.run[1], { cwd: dir, stdin, timeoutMs });
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
