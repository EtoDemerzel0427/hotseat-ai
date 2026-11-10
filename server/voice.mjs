// 语音：识别用本机的 whisper.cpp（whisper-server 常驻，模型只加载一次），朗读用 edge-tts（微软在线服务，需要联网）。
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const ROOT = path.resolve(import.meta.dirname, '..');
const MODEL = process.env.WHISPER_MODEL || path.join(ROOT, 'models/ggml-large-v3-turbo-q5_0.bin');
const WHISPER_BIN = process.env.WHISPER_SERVER || 'whisper-server';
const WHISPER_PORT = Number(process.env.WHISPER_PORT || 4478);
export const VOICES = {
  en: process.env.TTS_VOICE_EN || 'en-US-AvaNeural',
  zh: process.env.TTS_VOICE_ZH || 'zh-CN-YunxiNeural',
};

// ---------- 识别 ----------
let whisperProc = null, whisperReady = null;

export function ensureWhisper() {
  if (whisperReady) return whisperReady;
  whisperReady = new Promise((resolve, reject) => {
    if (!existsSync(MODEL)) return reject(new Error(`Whisper model not found: ${MODEL}`));
    whisperProc = spawn(WHISPER_BIN, ['-m', MODEL, '--host', '127.0.0.1', '--port', String(WHISPER_PORT), '-sns', '-nt'], { stdio: 'ignore' });
    whisperProc.on('error', (e) => { whisperReady = null; reject(new Error(`cannot start ${WHISPER_BIN}: ${e.message} (brew install whisper-cpp)`)); });
    whisperProc.on('exit', () => { whisperProc = null; whisperReady = null; });
    const t0 = Date.now();
    const poll = async () => {
      if (!whisperProc) return reject(new Error('whisper-server exited during startup'));
      try { await fetch(`http://127.0.0.1:${WHISPER_PORT}/`); resolve(); } catch {
        if (Date.now() - t0 > 60_000) reject(new Error('whisper-server did not become ready'));
        else setTimeout(poll, 200);
      }
    };
    poll();
  });
  whisperReady.catch(() => { whisperReady = null; });
  return whisperReady;
}
const stop = () => { try { whisperProc?.kill(); } catch { /* 已退出 */ } };
process.on('exit', stop);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stop(); process.exit(0); });

// Whisper 在静音或噪声上常见的幻觉输出。
const JUNK = /^[\s.。,，!！?？…-]*$|^\s*[[(（【].*[\])）】]\s*$|^\s*(thank you|thanks)( (very|so) much)?( for watching)?[.!]*\s*$|^\s*(you|bye|okay)[.!]*\s*$|字幕|谢谢观看|謝謝觀看|请不吝点赞|明镜/i;

const BASE_PROMPT = {
  en: 'A coding interview. The candidate talks through C++ and Python code: hash map, unordered_map, deque, std::list, iterator, vector, priority queue, amortized O(1), O(log n), O(n log n), time complexity, edge case, stdin, stdout.',
  zh: '以下是普通话的编程面试，夹杂英文术语：哈希表、unordered_map、deque、迭代器、vector、优先队列、均摊 O(1)、O(log n)、时间复杂度、空间复杂度、边界情况、标准输入。',
};

// 用题目名和代码里的标识符给 Whisper 提示词，技术名词和变量名才认得准。
export function sttPrompt(locale, title, code) {
  const ids = [...new Set((code.match(/[A-Za-z_][A-Za-z0-9_]{3,}/g) || []))].slice(0, 60).join(', ');
  return `${BASE_PROMPT[locale] || BASE_PROMPT.en} ${title}. ${ids}`.slice(0, 900);
}

export async function transcribe(wav, { locale, prompt }) {
  await ensureWhisper();
  const form = new FormData();
  form.append('file', new Blob([wav], { type: 'audio/wav' }), 'audio.wav');
  form.append('response_format', 'json');
  form.append('temperature', '0');
  form.append('language', locale === 'zh' ? 'zh' : 'en');
  if (prompt) form.append('prompt', prompt);
  const r = await fetch(`http://127.0.0.1:${WHISPER_PORT}/inference`, { method: 'POST', body: form });
  if (!r.ok) throw new Error(`whisper-server ${r.status}`);
  const text = String((await r.json()).text || '').replace(/\s+/g, ' ').trim();
  return JUNK.test(text) ? '' : text;
}

// ---------- 朗读 ----------
const ttsClients = new Map();

async function ttsClient(voice) {
  let c = ttsClients.get(voice);
  if (!c) {
    c = new MsEdgeTTS();
    await c.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    ttsClients.set(voice, c);
  }
  return c;
}

// 返回 mp3 的可读流。连接失效时重建一次。
export async function ttsStream(text, locale) {
  const voice = VOICES[locale] || VOICES.en;
  for (let attempt = 0; ; attempt++) {
    try {
      const c = await ttsClient(voice);
      const { audioStream } = await c.toStream(text, { rate: 1.08 });
      audioStream.once('error', () => ttsClients.delete(voice));
      return audioStream;
    } catch (e) {
      ttsClients.delete(voice);
      if (attempt) throw e;
    }
  }
}
