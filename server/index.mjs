import express from 'express';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { LANGS } from './judge.mjs';
import { ROOT, createDraft, deleteDraft, listFiles, listProblems, publishDraft, readProblemFile, validateProblem, writeProblemFile } from './problems.mjs';
import { Workshop } from './workshop.mjs';
import { SESSIONS_DIR, Session, generateReview } from './session.mjs';
import { ttsStream } from './voice.mjs';

const PORT = Number(process.env.PORT || 4477);
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/vs', express.static(path.join(ROOT, 'node_modules/monaco-editor/min/vs')));
app.get('/lib/marked.js', (_, res) => res.sendFile(path.join(ROOT, 'node_modules/marked/lib/marked.esm.js')));
app.use('/fonts/inter', express.static(path.join(ROOT, 'node_modules/@fontsource-variable/inter/files')));
app.use('/fonts/mono', express.static(path.join(ROOT, 'node_modules/@fontsource-variable/jetbrains-mono/files')));
app.use(express.static(path.join(ROOT, 'public')));

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => res.status(500).json({ error: e.message }));

app.get('/api/problems', wrap(async (_, res) => {
  res.json({ problems: await listProblems(), langs: Object.fromEntries(Object.entries(LANGS).map(([k, v]) => [k, v.label])) });
}));

// ---------- 题目工作台 ----------
app.post('/api/drafts', wrap(async (_, res) => res.json({ slug: await createDraft() })));
app.get('/api/problems/:slug/files', wrap(async (req, res) => res.json({ files: await listFiles(req.params.slug) })));
app.get('/api/problems/:slug/file', wrap(async (req, res) => res.json({ content: await readProblemFile(req.params.slug, String(req.query.name)) })));
app.post('/api/problems/:slug/file', wrap(async (req, res) => {
  await writeProblemFile(req.params.slug, String(req.body.name), String(req.body.content ?? ''));
  res.json({ ok: true });
}));
app.post('/api/problems/:slug/validate', wrap(async (req, res) => res.json(await validateProblem(req.params.slug))));
app.post('/api/problems/:slug/publish', wrap(async (req, res) => res.json({ slug: await publishDraft(req.params.slug) })));
app.post('/api/problems/:slug/delete', wrap(async (req, res) => { await deleteDraft(req.params.slug); res.json({ ok: true }); }));

app.get('/api/tts', wrap(async (req, res) => {
  const text = String(req.query.text || '').slice(0, 2000);
  if (!text.trim()) return res.status(400).json({ error: 'empty text' });
  const stream = await ttsStream(text, req.query.locale === 'zh' ? 'zh' : 'en');
  res.set({ 'content-type': 'audio/mpeg', 'cache-control': 'no-store' });
  stream.on('error', () => res.end());
  stream.pipe(res);
}));

const sessionDir = (id) => {
  if (!/^[\w-]+$/.test(id)) throw new Error('非法 id');
  return path.join(SESSIONS_DIR, id);
};

app.get('/api/sessions', wrap(async (_, res) => {
  await mkdir(SESSIONS_DIR, { recursive: true });
  const out = [];
  for (const d of await readdir(SESSIONS_DIR, { withFileTypes: true })) {
    const mp = path.join(SESSIONS_DIR, d.name, 'meta.json');
    if (!d.isDirectory() || !existsSync(mp)) continue;
    const meta = JSON.parse(await readFile(mp, 'utf8'));
    out.push({ ...meta, hasReview: existsSync(path.join(SESSIONS_DIR, d.name, 'review.md')) });
  }
  out.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  res.json(out);
}));

app.get('/api/sessions/:id/review', wrap(async (req, res) => {
  const p = path.join(sessionDir(req.params.id), 'review.md');
  res.json({ md: existsSync(p) ? await readFile(p, 'utf8') : null });
}));

app.post('/api/sessions/:id/review', wrap(async (req, res) => {
  req.setTimeout(0);
  const dir = sessionDir(req.params.id);
  const meta = JSON.parse(await readFile(path.join(dir, 'meta.json'), 'utf8'));
  res.json({ md: await generateReview(dir, meta) });
}));

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const wssAuthor = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  const target = req.url === '/ws' ? wss : req.url === '/ws-author' ? wssAuthor : null;
  if (!target) return socket.destroy();
  target.handleUpgrade(req, socket, head, (ws) => target.emit('connection', ws, req));
});
wssAuthor.on('connection', (ws) => {
  const shop = new Workshop(ws);
  ws.on('message', (data) => {
    let m;
    try { m = JSON.parse(data.toString()); } catch { return; }
    shop.onMessage(m).catch((e) => shop.send({ t: 'turnEnd', error: e.message, files: [] }));
  });
  ws.on('close', () => shop.close());
});
wss.on('connection', (ws) => {
  const session = new Session(ws);
  let chain = Promise.resolve();
  ws.on('message', (data, isBinary) => {
    // 二进制消息是一段录音（16kHz 单声道 WAV），不排进消息队列，避免识别期间卡住按键记录。
    if (isBinary) { session.onAudio(data).catch((e) => session.send({ t: 'heard', text: '', error: e.message })); return; }
    let m;
    try { m = JSON.parse(data.toString()); } catch { return; }
    chain = chain.then(() => session.onMessage(m)).catch((e) => session.send({ t: 'error', text: e.message }));
  });
  ws.on('close', () => { chain = chain.then(() => session.end(false)).catch(() => {}); });
});

server.listen(PORT, '127.0.0.1', () => console.log(`mock-interview: http://localhost:${PORT}`));
