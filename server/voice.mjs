// 语音。
// 识别：本机的 whisper.cpp（whisper-server 常驻，模型只加载一次）。
// 朗读：TTS_PROVIDER 选择 edge（微软 Edge 朗读的在线接口，非官方）、openai（任何兼容 /audio/speech 的服务）、
//       say（macOS 自带，完全本地）或 off。
import { DATA_DIR, MODELS_DIR } from './config.mjs';
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, readdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

// ---------- 识别 ----------
const WHISPER_BIN = process.env.WHISPER_SERVER || 'whisper-server';
const WHISPER_PORT = Number(process.env.WHISPER_PORT || 4478);

export function whisperModel() {
  if (process.env.WHISPER_MODEL) return path.resolve(DATA_DIR, process.env.WHISPER_MODEL);
  const found = existsSync(MODELS_DIR) ? readdirSync(MODELS_DIR).filter((f) => /^ggml-.*\.bin$/.test(f)) : [];
  const best = found.find((f) => f.includes('turbo')) || found.find((f) => f.includes('small')) || found[0];
  return best ? path.join(MODELS_DIR, best) : null;
}
let binOk = null;
export const whisperBinOk = () => (binOk ??= (() => { try { return !spawnSync(WHISPER_BIN, ['--help'], { stdio: 'ignore', timeout: 10_000 }).error; } catch { return false; } })());

let whisperProc = null, whisperReady = null;

export function ensureWhisper() {
  if (whisperReady) return whisperReady;
  whisperReady = new Promise((resolve, reject) => {
    const model = whisperModel();
    if (!whisperBinOk()) return reject(new Error(`${WHISPER_BIN} not found. Run "npx hotseat-ai setup-voice" for install instructions.`));
    if (!model || !existsSync(model)) return reject(new Error('No Whisper model found. Run "npx hotseat-ai setup-voice" to download one.'));
    whisperProc = spawn(WHISPER_BIN, ['-m', model, '--host', '127.0.0.1', '--port', String(WHISPER_PORT), '-sns', '-nt'], { stdio: 'ignore' });
    whisperProc.on('error', (e) => { whisperReady = null; reject(new Error(`cannot start ${WHISPER_BIN}: ${e.message}`)); });
    whisperProc.on('exit', () => { whisperProc = null; whisperReady = null; });
    const t0 = Date.now();
    const poll = async () => {
      if (!whisperProc) return reject(new Error('whisper-server exited during startup'));
      try { await fetch(`http://127.0.0.1:${WHISPER_PORT}/`); resolve(); } catch {
        if (Date.now() - t0 > 90_000) reject(new Error('whisper-server did not become ready'));
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
const PROVIDERS = ['edge', 'openai', 'say', 'off'];
export const TTS_PROVIDER = PROVIDERS.includes(process.env.TTS_PROVIDER) ? process.env.TTS_PROVIDER : 'edge';
const env = (k, d) => process.env[k] || d;
const VOICES = {
  edge: { en: env('TTS_VOICE_EN', 'en-US-AvaNeural'), zh: env('TTS_VOICE_ZH', 'zh-CN-YunxiNeural') },
  openai: { en: env('TTS_VOICE_EN', 'alloy'), zh: env('TTS_VOICE_ZH', 'alloy') },
  say: { en: env('TTS_VOICE_EN', 'Samantha'), zh: env('TTS_VOICE_ZH', 'Tingting') },
};

const edgeClients = new Map();
async function edgeTts(text, voice) {
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
  for (let attempt = 0; ; attempt++) {
    try {
      let c = edgeClients.get(voice);
      if (!c) {
        c = new MsEdgeTTS();
        await c.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        edgeClients.set(voice, c);
      }
      const { audioStream } = await c.toStream(text, { rate: 1.08 });
      audioStream.once('error', () => edgeClients.delete(voice));
      return { stream: audioStream, type: 'audio/mpeg' };
    } catch (e) {
      edgeClients.delete(voice);
      if (attempt) throw e;
    }
  }
}

async function openaiTts(text, voice) {
  const base = env('TTS_OPENAI_BASE_URL', 'https://api.openai.com/v1').replace(/\/$/, '');
  const key = process.env.TTS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('TTS_PROVIDER=openai needs TTS_OPENAI_API_KEY');
  const r = await fetch(`${base}/audio/speech`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: env('TTS_OPENAI_MODEL', 'gpt-4o-mini-tts'), voice, input: text, response_format: 'mp3' }),
  });
  if (!r.ok) throw new Error(`TTS request failed: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return { stream: Readable.fromWeb(r.body), type: 'audio/mpeg' };
}

async function sayTts(text, voice) {
  if (process.platform !== 'darwin') throw new Error('TTS_PROVIDER=say only works on macOS');
  const file = path.join(os.tmpdir(), `say-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);
  await new Promise((resolve, reject) => {
    const p = spawn('say', ['-v', voice, '--data-format=LEI16@22050', '-o', file, text], { stdio: 'ignore' });
    p.on('error', reject);
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`say exited with ${code}`))));
  });
  const stream = createReadStream(file);
  stream.on('close', () => rm(file, { force: true }));
  return { stream, type: 'audio/wav' };
}

// 返回 { stream, type }。
export async function ttsStream(text, locale) {
  if (TTS_PROVIDER === 'off') throw new Error('TTS is turned off');
  const voice = VOICES[TTS_PROVIDER][locale] || VOICES[TTS_PROVIDER].en;
  return { edge: edgeTts, openai: openaiTts, say: sayTts }[TTS_PROVIDER](text, voice);
}

export function voiceStatus() {
  const model = whisperModel();
  const sttReason = !whisperBinOk() ? 'whisper-server not installed' : !model || !existsSync(model) ? 'no Whisper model downloaded' : '';
  return { stt: !sttReason, sttReason, tts: TTS_PROVIDER };
}
