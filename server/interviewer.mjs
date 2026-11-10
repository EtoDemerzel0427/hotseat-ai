// 面试官：一场面试对应一个 Claude 长会话。平台往里推事件，它通过工具开口或保持沉默。
// 行为规则写在 prompts/interviewer.md 里，改那个文件就能调整面试官，不用动代码。
import { PROMPTS_DIR } from './config.mjs';
import { createSdkMcpServer, query, tool } from '@anthropic-ai/claude-agent-sdk';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { LIVE_MODEL, baseOptions } from './llm.mjs';

const PLAYBOOK = path.join(PROMPTS_DIR, 'interviewer.md');
export const SPEAK_LANG = { zh: 'Chinese (Simplified, Mandarin)', en: 'English' };

export class Inbox {
  items = []; waiters = []; closed = false;
  push(x) { const w = this.waiters.shift(); if (w) w({ value: x, done: false }); else this.items.push(x); }
  close() { this.closed = true; for (const w of this.waiters) w({ value: undefined, done: true }); }
  [Symbol.asyncIterator]() {
    return {
      next: () => {
        if (this.items.length) return Promise.resolve({ value: this.items.shift(), done: false });
        if (this.closed) return Promise.resolve({ value: undefined, done: true });
        return new Promise((r) => this.waiters.push(r));
      },
    };
  }
}

export async function buildSystemPrompt({ problem, langLabel, minutes, locale }) {
  const vars = {
    minutes,
    codeLang: langLabel,
    speakLang: SPEAK_LANG[locale] || SPEAK_LANG.en,
    title: problem.title,
    stageCount: problem.stages.length,
    stages: problem.stages.map((s, i) => `## Stage ${i + 1} statement\n\n${s}`).join('\n\n'),
    notes: problem.interviewerNotes || '(none)',
    solution: problem.solution,
  };
  const tpl = await readFile(PLAYBOOK, 'utf8');
  return tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export class Interviewer {
  constructor({ systemPrompt, onSpeak, onNote, onReveal, onWrite, onTurnEnd, onError }) {
    this.inbox = new Inbox();
    this.cb = { onSpeak, onNote, onReveal, onTurnEnd, onError };
    this.spoke = false;
    this.wrote = false;
    const ok = (text) => ({ content: [{ type: 'text', text }] });

    const server = createSdkMcpServer({
      name: 'iv',
      version: '1.0.0',
      tools: [
        tool('speak', 'Say something to the candidate. This is the only thing the candidate sees.', {
          kind: z.enum(['question', 'answer', 'hint', 'remark']),
          message: z.string(),
        }, async ({ kind, message }) => {
          if (this.spoke) return ok('You already spoke in this event. Output "done" now and do not call any more tools.');
          this.spoke = true;
          onSpeak(message, kind);
          return ok('Delivered. Output "done" now and do not call any more tools.');
        }),
        tool('note', 'Record a private observation for the post-interview review. The candidate cannot see it.', { text: z.string() }, async ({ text }) => {
          onNote(text);
          return ok('Recorded.');
        }),
        tool('reveal_next_stage', 'Show the next stage of the problem to the candidate. Follow it with speak to tell them.', {}, async () => ok(onReveal())),
        tool('write_in_editor', 'Type lines into the candidate\'s code editor, as on a shared pad. The text is inserted verbatim and becomes part of the program, so write comments with the language\'s comment markers and make sure any code you write compiles. Call it before speak.', {
          text: z.string().describe('The lines to insert, at most 30. The indentation of the anchor line is added in front of every line.'),
          after: z.string().optional().describe('Exact content of an existing line of the current code; the text is inserted below that line. Omit it to insert just above the line the candidate\'s cursor is on.'),
        }, async ({ text, after }) => {
          if (this.wrote) return ok('You already wrote in the editor in this event.');
          this.wrote = true;
          return ok(onWrite(text, after));
        }),
      ],
    });

    this.q = query({
      prompt: this.inbox,
      options: baseOptions({
        systemPrompt,
        model: LIVE_MODEL,
        mcpServers: { iv: server },
        allowedTools: ['mcp__iv__speak', 'mcp__iv__note', 'mcp__iv__reveal_next_stage', 'mcp__iv__write_in_editor'],
      }),
    });
    this.loop();
  }

  async loop() {
    try {
      for await (const m of this.q) {
        if (process.env.IV_DEBUG) console.error('MSG', m.type, m.subtype || '', m.type === 'assistant' ? JSON.stringify(m.message.content).slice(0, 300) : '');
        if (m.type === 'result') {
          this.spoke = false;
          this.wrote = false;
          this.cb.onTurnEnd(m.subtype === 'success' ? null : m.subtype);
        }
      }
    } catch (e) {
      if (!this.closed) this.cb.onError(e);
    }
  }

  push(text) {
    this.inbox.push({ type: 'user', message: { role: 'user', content: text }, parent_tool_use_id: null });
  }

  close() {
    this.closed = true;
    this.inbox.close();
    try { this.q.close(); } catch { /* 已结束 */ }
  }
}
