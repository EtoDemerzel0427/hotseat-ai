// 一场面试：记录事件、判题、决定什么时候叫醒面试官。
import { createTwoFilesPatch } from 'diff';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Interviewer, buildSystemPrompt } from './interviewer.mjs';
import { LANGS, prepare, run, runTests } from './judge.mjs';
import { ROOT, loadProblem } from './problems.mjs';
import { readEvents, writeReview } from './review.mjs';
import { ensureWhisper, sttPrompt, transcribe } from './voice.mjs';

export const SESSIONS_DIR = path.join(ROOT, 'sessions');

const num = (name, d) => Number(process.env[name] || d);
const IDLE_MS = num('IDLE_MS', 30_000);       // 改动后停顿多久叫醒面试官
const STALL_MS = num('STALL_MS', 240_000);    // 多久没有任何改动算卡住
const MIN_GAP_MS = num('MIN_GAP_MS', 45_000); // 两次非紧急事件的最小间隔
const PASTE_CHARS = 200;
const SNAP_GAP_MS = 10_000;
const VOICE_GAP_MS = num('VOICE_GAP_MS', 6_000); // 两次只由说话触发的事件的最小间隔
const URGENT = new Set(['start', 'chat', 'voice', 'test', 'timeup']);

const mmss = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

export class Session {
  constructor(ws) {
    this.ws = ws;
    this.started = false;
    this.ended = false;
    this.busy = false;
    this.pending = this.freshPending();
    this.lastTurnEnd = 0;
    this.lastSnapTs = -Infinity;
    this.logChain = Promise.resolve();
  }

  tr(zh, en) { return this.locale === 'en' ? en : zh; }
  freshPending() { return { kinds: new Set(), chats: [], said: [], test: null, runs: 0, pasteChars: 0 }; }
  send(obj) { if (this.ws.readyState === 1) this.ws.send(JSON.stringify(obj)); }
  now() { return Date.now() - this.t0; }

  log(ev) {
    const line = JSON.stringify({ ts: this.now(), ...ev }) + '\n';
    this.logChain = this.logChain.then(() => appendFile(path.join(this.dir, 'events.jsonl'), line)).catch(() => {});
  }

  async start({ slug, lang, minutes, locale }) {
    this.locale = locale === 'en' ? 'en' : 'zh';
    this.problem = await loadProblem(slug, this.locale);
    minutes = Math.min(180, Math.max(5, Number(minutes) || this.problem.meta.minutes || 45));
    if (!LANGS[lang] || !this.problem.starters[lang]) throw new Error(this.tr('这道题没有该语言的起始代码', 'This problem has no starter code for that language'));
    this.lang = lang;
    this.minutes = minutes;
    this.stage = 0;
    this.t0 = Date.now();
    this.id = `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}_${slug}`;
    this.dir = path.join(SESSIONS_DIR, this.id);
    this.buildDir = path.join(this.dir, 'build');
    await mkdir(this.buildDir, { recursive: true });
    this.code = this.lastSentCode = this.problem.starters[lang];
    this.meta = { id: this.id, slug, title: this.problem.title, lang, locale: this.locale, minutes, startedAt: new Date().toISOString() };
    await writeFile(path.join(this.dir, 'meta.json'), JSON.stringify(this.meta, null, 2));
    await writeFile(path.join(this.dir, `starter${path.extname(LANGS[lang].file)}`), this.code);
    this.log({ type: 'start', slug, lang });

    this.iv = new Interviewer({
      systemPrompt: await buildSystemPrompt({ problem: this.problem, langLabel: LANGS[lang].label, minutes, locale: this.locale }),
      onSpeak: (text, kind) => { this.log({ type: 'speak', kind, text }); this.send({ t: 'interviewer', text, kind }); },
      onNote: (text) => this.log({ type: 'note', text }),
      onReveal: () => this.revealNext(),
      onTurnEnd: (err) => {
        this.busy = false;
        this.lastTurnEnd = Date.now();
        this.send({ t: 'busy', on: false });
        if (err) this.send({ t: 'error', text: `${this.tr('面试官出错', 'Interviewer error')}: ${err}` });
        this.flush();
      },
      onError: (e) => { this.busy = false; this.send({ t: 'busy', on: false }); this.send({ t: 'error', text: `${this.tr('面试官连接出错', 'Interviewer connection error')}: ${e.message}` }); },
    });

    this.started = true;
    this.send({
      t: 'started', id: this.id, title: this.problem.title, lang, langLabel: LANGS[lang].label, monaco: LANGS[lang].monaco,
      minutes, stages: [this.problem.stages[0]], totalStages: this.problem.stages.length, starter: this.code,
    });
    this.timeupTimer = setTimeout(() => this.trigger('timeup'), minutes * 60_000);
    this.warnTimer = setTimeout(() => this.trigger('timewarn'), Math.max(0, minutes - 5) * 60_000);
    this.resetStall();
    this.trigger('start');
  }

  revealNext() {
    if (this.stage + 1 >= this.problem.stages.length) return 'This is already the last stage; there are no further requirements.';
    this.stage += 1;
    this.log({ type: 'stage', index: this.stage });
    this.send({ t: 'stage', index: this.stage, md: this.problem.stages[this.stage] });
    return `Stage ${this.stage + 1} is now visible to the candidate, below the earlier statement.`;
  }

  activeTests() { return this.problem.tests.filter((t) => t.stage <= this.stage + 1); }

  resetStall() {
    clearTimeout(this.stallTimer);
    this.stallTimer = setTimeout(() => this.trigger('stall'), STALL_MS);
  }

  setCode(code, forceSnap = false) {
    if (typeof code !== 'string') return;
    const changed = code !== this.code;
    this.code = code;
    if ((changed && this.now() - this.lastSnapTs >= SNAP_GAP_MS) || (forceSnap && code !== this.lastSnapCode)) {
      this.lastSnapTs = this.now();
      this.lastSnapCode = code;
      this.log({ type: 'snap', code });
    }
    if (changed) {
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => this.trigger('pause'), IDLE_MS);
      this.resetStall();
    }
  }

  trigger(kind) {
    if (this.ended) return;
    this.pending.kinds.add(kind);
    this.flush();
  }

  flush() {
    if (this.busy || this.ended || !this.started || !this.pending.kinds.size) return;
    const p = this.pending;
    const urgent = [...p.kinds].some((k) => URGENT.has(k));
    const wait = this.lastTurnEnd + MIN_GAP_MS - Date.now();
    clearTimeout(this.gapTimer);
    if (!urgent && wait > 0) { this.gapTimer = setTimeout(() => this.flush(), wait); return; }
    // 边写边说会连续产生很多句话，只由说话触发时攒一攒再发。
    const voiceOnly = p.kinds.has('voice') && [...p.kinds].every((k) => k === 'voice' || !URGENT.has(k));
    const voiceWait = this.lastTurnEnd + VOICE_GAP_MS - Date.now();
    if (voiceOnly && voiceWait > 0) { this.gapTimer = setTimeout(() => this.flush(), voiceWait); return; }
    // 停顿和卡住事件在代码没变化时没有信息量，stall 除外。
    if (p.kinds.size === 1 && p.kinds.has('pause') && this.code === this.lastSentCode) { this.pending = this.freshPending(); return; }

    this.pending = this.freshPending();
    this.busy = true;
    if (p.kinds.has('chat')) this.send({ t: 'busy', on: true });
    this.log({ type: 'tick', kinds: [...p.kinds] });
    this.iv.push(this.buildEvent(p));
    this.lastSentCode = this.code;
  }

  buildEvent(p) {
    const desc = {
      start: 'The interview starts now. Open it.',
      pause: `The candidate edited the code and then paused for about ${Math.round(IDLE_MS / 1000)} seconds.`,
      stall: `The candidate has not changed the code for about ${Math.round(STALL_MS / 60000)} minutes.`,
      paste: `The candidate pasted ${p.pasteChars} characters at once.`,
      test: 'The candidate ran the tests.',
      chat: 'The candidate sent you a message.',
      voice: 'The candidate spoke.',
      timewarn: 'Five minutes left.',
      timeup: 'Time is up. Wrap up and tell the candidate they can click "End interview".',
    };
    const out = [];
    out.push(`[EVENT] ${[...p.kinds].map((k) => desc[k]).join(' ')}`);
    out.push(`Elapsed ${mmss(this.now())} of ${this.minutes}:00 | candidate is on stage ${this.stage + 1} of ${this.problem.stages.length}`);
    for (const c of p.chats) out.push(`Candidate says (typed): "${c}"`);
    if (p.said.length) out.push(`Candidate said aloud (speech-to-text transcript; may contain recognition errors):\n${p.said.map((c) => `- "${c}"`).join('\n')}`);
    if (p.runs) out.push(`The candidate ran the program with custom input ${p.runs} time(s).`);
    if (p.test) {
      const r = p.test;
      this.failStreak = !r.compile.ok || r.passed < r.total ? (this.failStreak || 0) + 1 : 0;
      if (!r.compile.ok) out.push(`Test run: compilation failed\n${r.compile.stderr.slice(0, 1500)}`);
      else {
        const rows = r.results.map((t) => `- ${t.name}${t.hidden ? ' (hidden)' : ''}: ${t.pass ? 'pass' : t.timedOut ? 'timeout' : t.exitCode !== 0 ? `runtime error, exit ${t.exitCode ?? t.signal}` : 'wrong answer'}`);
        out.push(`Test run: ${r.passed}/${r.total} passed${r.passed === r.total ? ' — all tests of the current stage pass' : ''}\n${rows.join('\n')}`);
      }
      if (this.failStreak) out.push(`Consecutive failing test runs: ${this.failStreak}`);
    }
    if (this.code === this.lastSentCode) {
      out.push(p.kinds.has('start') ? `Starter code:\n\`\`\`\n${this.code}\n\`\`\`` : 'The code has not changed since the previous event.');
    } else {
      const patch = createTwoFilesPatch('before', 'after', this.lastSentCode, this.code, '', '', { context: 2 }).split('\n').slice(4).join('\n');
      out.push(`Changes since the previous event:\n\`\`\`diff\n${patch}\n\`\`\``);
      out.push(`Full current code:\n\`\`\`\n${this.code}\n\`\`\``);
    }
    return out.join('\n\n');
  }

  // 一段录音：本地 Whisper 转写，然后当作候选人说的话处理。
  async onAudio(wav) {
    if (!this.started || this.ended) return;
    const text = await transcribe(wav, { locale: this.locale, prompt: sttPrompt(this.locale, this.problem.title, this.code) });
    this.send({ t: 'heard', text });
    if (!text || this.ended) return;
    this.log({ type: 'chat', voice: true, text });
    this.pending.said.push(text);
    this.trigger('voice');
  }

  async onMessage(m) {
    if (m.t === 'start') {
      if (this.started) return;
      try { await this.start(m); } catch (e) { this.send({ t: 'error', text: e.message, fatal: true }); }
      return;
    }
    if (!this.started || this.ended) return;
    switch (m.t) {
      case 'edit': {
        this.log({ type: 'edit', ch: m.ch });
        const big = m.ch.reduce((a, c) => Math.max(a, c.t.length), 0);
        if (big >= PASTE_CHARS) {
          this.log({ type: 'paste', chars: big });
          this.pending.pasteChars = big;
          this.pending.kinds.add('paste');
        }
        break;
      }
      case 'code':
        this.setCode(m.code);
        if (this.pending.kinds.has('paste')) this.flush();
        break;
      case 'chat': {
        const text = String(m.text || '').trim();
        if (!text) break;
        this.setCode(m.code);
        this.log({ type: 'chat', text });
        this.pending.chats.push(text);
        this.trigger('chat');
        break;
      }
      case 'mic':
        // 打开麦克风时预先加载模型，第一句话就不用等。
        if (m.on) ensureWhisper().then(() => this.send({ t: 'micReady' }), (e) => this.send({ t: 'micError', text: e.message }));
        break;
      case 'run': {
        this.setCode(m.code, true);
        const c = await prepare(this.buildDir, this.lang, this.code);
        let r = null;
        if (c.ok) r = await run(this.buildDir, this.lang, String(m.stdin || ''), 5000);
        this.log({ type: 'run', compileOk: c.ok, exitCode: r?.code, timedOut: r?.timedOut });
        this.pending.runs += 1;
        this.send({ t: 'runResult', compile: c, run: r });
        break;
      }
      case 'test': {
        this.setCode(m.code, true);
        const r = await runTests(this.buildDir, this.lang, this.code, this.activeTests(), this.problem.meta.timeLimitMs || 3000);
        this.log({
          type: 'test', compileOk: r.compile.ok, compileErr: r.compile.ok ? undefined : r.compile.stderr,
          passed: r.passed, total: r.total, failed: r.results.filter((t) => !t.pass).map((t) => t.name),
        });
        this.pending.test = r;
        this.send({
          t: 'testResult', compile: r.compile, passed: r.passed, total: r.total,
          results: r.results.map((t) => (t.hidden
            ? { name: t.name, hidden: true, pass: t.pass, ms: t.ms, timedOut: t.timedOut, exitCode: t.exitCode }
            : t)),
        });
        this.trigger('test');
        break;
      }
      case 'end':
        this.setCode(m.code);
        await this.end(true);
        break;
    }
  }

  async end(withReview) {
    if (this.ended || !this.started) return;
    this.ended = true;
    for (const t of [this.idleTimer, this.stallTimer, this.gapTimer, this.timeupTimer, this.warnTimer]) clearTimeout(t);
    this.iv.close();
    this.log({ type: 'end', code: this.code });
    await this.logChain;
    await writeFile(path.join(this.dir, `final${path.extname(LANGS[this.lang].file)}`), this.code);
    this.meta.endedAt = new Date().toISOString();
    await writeFile(path.join(this.dir, 'meta.json'), JSON.stringify(this.meta, null, 2));
    if (!withReview) return;
    this.send({ t: 'reviewing' });
    try {
      const md = await generateReview(this.dir, this.meta);
      this.send({ t: 'review', id: this.id, md });
    } catch (e) {
      this.send({ t: 'error', text: this.tr(`复盘生成失败: ${e.message}。可以稍后在首页的历史记录里重新生成。`, `Review failed: ${e.message}. You can regenerate it later from History on the home page.`), fatal: true });
    }
  }
}

// 也用于事后对历史记录重新生成复盘。
export async function generateReview(dir, meta) {
  const locale = meta.locale || 'zh';
  const problem = await loadProblem(meta.slug, locale);
  const events = await readEvents(dir);
  const md = await writeReview({ problem, langLabel: LANGS[meta.lang].label, events, starter: problem.starters[meta.lang], locale });
  await writeFile(path.join(dir, 'review.md'), md);
  return md;
}
