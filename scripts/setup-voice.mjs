// 准备语音识别：检查 whisper-server，下载模型。用法：npx hotseat-ai setup-voice [-- small|turbo|base]
import { MODELS_DIR } from '../server/config.mjs';
import { whisperBinOk } from '../server/voice.mjs';
import { createWriteStream, existsSync } from 'node:fs';
import { rename, rm } from 'node:fs/promises';
import path from 'node:path';

const MODELS = {
  base: ['ggml-base-q5_1.bin', '57 MB — fastest, noticeably less accurate'],
  small: ['ggml-small-q5_1.bin', '181 MB — good on CPU-only machines and in Docker'],
  turbo: ['ggml-large-v3-turbo-q5_0.bin', '547 MB — most accurate; recommended on Apple Silicon or with a GPU'],
};
const choice = process.argv[2] || (process.platform === 'darwin' && process.arch === 'arm64' ? 'turbo' : 'small');
if (!MODELS[choice]) {
  console.log(`Unknown model "${choice}". Choose one of:\n${Object.entries(MODELS).map(([k, [, d]]) => `  ${k.padEnd(6)} ${d}`).join('\n')}`);
  process.exit(1);
}

console.log('\n1. whisper.cpp server');
if (whisperBinOk()) console.log('   found whisper-server');
else {
  console.log('   whisper-server was not found on PATH. Install whisper.cpp:');
  console.log({
    darwin: '     brew install whisper-cpp',
    win32: '     Use the Docker image (it includes whisper.cpp), or download a release from\n     https://github.com/ggml-org/whisper.cpp/releases and set WHISPER_SERVER in .env to whisper-server.exe',
  }[process.platform] || '     git clone https://github.com/ggml-org/whisper.cpp && cd whisper.cpp\n     cmake -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build -j --target whisper-server\n     sudo cp build/bin/whisper-server /usr/local/bin/\n   (or set WHISPER_SERVER in .env to the full path of the binary)');
}

const [file, desc] = MODELS[choice];
const dest = path.join(MODELS_DIR, file);
console.log(`\n2. model "${choice}" (${desc})`);
if (existsSync(dest)) console.log(`   already downloaded: ${dest}`);
else {
  const url = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${file}`;
  console.log(`   downloading ${url}`);
  const r = await fetch(url);
  if (!r.ok) { console.error(`   download failed: HTTP ${r.status}`); process.exit(1); }
  const total = Number(r.headers.get('content-length')) || 0;
  const tmp = `${dest}.part`;
  const out = createWriteStream(tmp);
  let got = 0, last = 0;
  try {
    for await (const chunk of r.body) {
      if (!out.write(chunk)) await new Promise((res) => out.once('drain', res));
      got += chunk.length;
      if (Date.now() - last > 500) { last = Date.now(); process.stdout.write(`\r   ${(got / 1e6).toFixed(0)} / ${(total / 1e6).toFixed(0)} MB`); }
    }
    await new Promise((res, rej) => out.end((e) => (e ? rej(e) : res())));
    await rename(tmp, dest);
    console.log(`\r   saved ${dest}            `);
  } catch (e) {
    await rm(tmp, { force: true });
    console.error(`\n   download failed: ${e.message}`);
    process.exit(1);
  }
}
console.log(`\n${whisperBinOk() ? 'Speech-to-text is ready. Restart the app and turn on the microphone in an interview.' : 'Install whisper-server as shown above, then restart the app.'}\n`);
