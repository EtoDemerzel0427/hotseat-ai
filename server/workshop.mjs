// 题目工作台：一个能直接改这道题文件的 Claude 长会话。规则写在 prompts/author.md。
import { PROMPTS_DIR } from './config.mjs';
import { createSdkMcpServer, query, tool } from '@anthropic-ai/claude-agent-sdk';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { Inbox } from './interviewer.mjs';
import { PYTHON, exec } from './judge.mjs';
import { DEEP_MODEL, baseOptions } from './llm.mjs';
import { listFiles, problemDir, validateProblem } from './problems.mjs';

const PLAYBOOK = path.join(PROMPTS_DIR, 'author.md');

export class Workshop {
  constructor(ws) {
    this.ws = ws;
    this.inbox = new Inbox();
    this.busy = false;
  }

  send(obj) { if (this.ws.readyState === 1) this.ws.send(JSON.stringify(obj)); }

  async open(slug) {
    this.slug = slug;
    this.dir = problemDir(slug);
    const ok = (text) => ({ content: [{ type: 'text', text }] });
    const server = createSdkMcpServer({
      name: 'ws',
      version: '1.0.0',
      tools: [
        tool('validate', 'Regenerate tests.json from the reference solution and check the whole problem: files present in both languages, solution runs on every input, starters compile and exit cleanly.', {}, async () => {
          const v = await validateProblem(slug);
          this.send({ t: 'validation', ...v });
          return ok(v.message);
        }),
        tool('run_python', 'Run a short Python 3 script in the problem directory (e.g. to generate large inputs or to run the reference solution on an input). Returns stdout and stderr. 20 second limit.', { code: z.string() }, async ({ code }) => {
          const r = await exec(PYTHON || 'python3', ['-c', code], { cwd: this.dir, timeoutMs: 20_000 });
          return ok(`exit ${r.timedOut ? 'timeout' : r.code}\n--- stdout ---\n${r.stdout.slice(0, 6000)}\n--- stderr ---\n${r.stderr.slice(0, 3000)}`);
        }),
      ],
    });

    const files = await listFiles(slug);
    const systemPrompt = `${await readFile(PLAYBOOK, 'utf8')}\n\n# Current state\n\nProblem directory: ${this.dir}\nFiles: ${files.length ? files.join(', ') : '(empty — this is a new problem)'}`;
    this.q = query({
      prompt: this.inbox,
      options: baseOptions({
        systemPrompt,
        model: DEEP_MODEL,
        cwd: this.dir,
        tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep'],
        allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'mcp__ws__validate', 'mcp__ws__run_python'],
        permissionMode: 'acceptEdits',
        mcpServers: { ws: server },
      }),
    });
    this.loop();
    this.send({ t: 'opened', slug, files });
  }

  async loop() {
    try {
      for await (const m of this.q) {
        if (m.type === 'assistant') {
          for (const b of m.message.content) {
            if (b.type === 'text' && b.text.trim()) this.send({ t: 'text', text: b.text });
            else if (b.type === 'tool_use') {
              const name = b.name.replace(/^mcp__ws__/, '');
              const file = b.input?.file_path ? path.basename(b.input.file_path) : '';
              this.send({ t: 'tool', name, file });
            }
          }
        } else if (m.type === 'user' && this.busy) {
          // 工具执行完了，文件可能变了。
          this.send({ t: 'files', files: await listFiles(this.slug).catch(() => []) });
        } else if (m.type === 'result') {
          this.busy = false;
          this.send({ t: 'turnEnd', error: m.subtype === 'success' ? null : m.subtype, files: await listFiles(this.slug).catch(() => []) });
        }
      }
    } catch (e) {
      if (!this.closed) this.send({ t: 'turnEnd', error: e.message, files: [] });
    }
  }

  async onMessage(m) {
    if (m.t === 'open' && !this.slug) return this.open(String(m.slug));
    if (m.t === 'chat' && this.slug) {
      const text = String(m.text || '').trim();
      if (!text) return;
      this.busy = true;
      this.inbox.push({ type: 'user', message: { role: 'user', content: text }, parent_tool_use_id: null });
    }
    if (m.t === 'stop' && this.busy) { try { await this.q.interrupt(); } catch { /* 忽略 */ } }
  }

  close() {
    this.closed = true;
    this.inbox.close();
    try { this.q?.close(); } catch { /* 已结束 */ }
  }
}
