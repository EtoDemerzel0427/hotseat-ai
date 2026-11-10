// 检查运行环境：Node、Claude 鉴权、编译器、Python、语音。用法：npm run doctor
import { DATA_DIR } from '../server/config.mjs';
import { CXX, PYTHON, prepare, run } from '../server/judge.mjs';
import { LIVE_MODEL, oneShot } from '../server/llm.mjs';
import { TTS_PROVIDER, voiceStatus, whisperModel } from '../server/voice.mjs';
import { rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const ok = (s) => console.log(`  \x1b[32m✓\x1b[0m ${s}`);
const warn = (s) => console.log(`  \x1b[33m!\x1b[0m ${s}`);
const bad = (s) => { failed = true; console.log(`  \x1b[31m✗\x1b[0m ${s}`); };
let failed = false;
const INSTALL = {
  cxx: { darwin: 'xcode-select --install', linux: 'sudo apt install g++   (or your distro\'s equivalent)', win32: 'use the Docker image, or install LLVM/MinGW and set CXX in .env' },
  py: { darwin: 'brew install python', linux: 'sudo apt install python3', win32: 'install Python 3 from python.org' },
};
const hint = (k) => INSTALL[k][process.platform] || INSTALL[k].linux;

console.log(`\nEnvironment check  (data directory: ${DATA_DIR})\n`);

const [maj, min] = process.versions.node.split('.').map(Number);
if (maj > 20 || (maj === 20 && min >= 12)) ok(`Node ${process.versions.node}`); else bad(`Node ${process.versions.node} is too old; 20.12 or newer is required`);

// 编译器和 Python：真的编译运行一次。
const tmp = path.join(os.tmpdir(), `doctor-${Date.now()}`);
if (!CXX) warn(`No C++ compiler found. C++ problems will be unavailable. Install: ${hint('cxx')}`);
else {
  const c = await prepare(tmp, 'cpp', '#include <iostream>\n#include <span>\nint main(){ std::cout << 42 << "\\n"; }\n');
  const r = c.ok ? await run(tmp, 'cpp', '') : null;
  if (r?.stdout.trim() === '42') ok(`C++20 compiler: ${CXX}`); else bad(`${CXX} cannot build a C++20 program:\n${(c.stderr || r?.stderr || '').slice(0, 400)}`);
}
if (!PYTHON) warn(`Python 3.8+ not found. Python problems and the problem workshop's validation need it. Install: ${hint('py')}`);
else {
  await prepare(tmp, 'py', 'print(42)\n');
  const r = await run(tmp, 'py', '');
  if (r.stdout.trim() === '42') ok(`Python: ${PYTHON}`); else bad(`${PYTHON} failed to run a script: ${r.stderr.slice(0, 200)}`);
}
await rm(tmp, { recursive: true, force: true });
if (!CXX && !PYTHON) bad('Neither a C++ compiler nor Python is available; no problem can be judged');

// Claude：发一个最小的请求。
const mode = process.env.ANTHROPIC_API_KEY ? 'ANTHROPIC_API_KEY' : process.env.CLAUDE_CODE_OAUTH_TOKEN ? 'CLAUDE_CODE_OAUTH_TOKEN'
  : process.env.CLAUDE_CODE_USE_BEDROCK ? 'Amazon Bedrock' : process.env.CLAUDE_CODE_USE_VERTEX ? 'Google Vertex AI' : 'local Claude Code login';
try {
  const t0 = Date.now();
  const out = await Promise.race([
    oneShot('Reply with the single word: ready', { model: LIVE_MODEL }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('no answer within 60 seconds')), 60_000)),
  ]);
  if (/ready/i.test(out)) ok(`Claude reachable via ${mode} (${LIVE_MODEL}, ${Date.now() - t0} ms)`); else bad(`Claude answered unexpectedly: ${out.slice(0, 100)}`);
} catch (e) {
  bad(`Claude is not reachable via ${mode}: ${e.message}\n      Set ANTHROPIC_API_KEY in .env, or install Claude Code and log in (claude /login).`);
}

// 语音是可选的。
const v = voiceStatus();
if (v.stt) ok(`Speech-to-text: whisper.cpp with ${path.basename(whisperModel())}`);
else warn(`Speech-to-text is off: ${v.sttReason}. Optional; run "npx hotseat-ai setup-voice" to enable the microphone.`);
if (TTS_PROVIDER === 'off') warn('Text-to-speech is off (TTS_PROVIDER=off)');
else if (TTS_PROVIDER === 'say' && process.platform !== 'darwin') bad('TTS_PROVIDER=say only works on macOS');
else if (TTS_PROVIDER === 'openai' && !(process.env.TTS_OPENAI_API_KEY || process.env.OPENAI_API_KEY)) bad('TTS_PROVIDER=openai needs TTS_OPENAI_API_KEY');
else ok(`Text-to-speech: ${TTS_PROVIDER}${TTS_PROVIDER === 'edge' ? ' (unofficial Microsoft Edge read-aloud endpoint; needs internet)' : ''}`);

console.log(failed ? '\nSome required checks failed.\n' : '\nAll required checks passed.\n');
process.exit(failed ? 1 : 0);
