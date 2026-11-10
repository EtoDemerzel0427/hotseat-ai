// Claude Agent SDK 的公共配置。走本机 claude 的登录态（订阅额度），不需要 API key。
import { query } from '@anthropic-ai/claude-agent-sdk';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const localClaude = path.join(os.homedir(), '.local/bin/claude');
export const CLAUDE_PATH = process.env.CLAUDE_PATH || (existsSync(localClaude) ? localClaude : undefined);

export const LIVE_MODEL = process.env.LIVE_MODEL || 'sonnet';     // 实时面试官
export const DEEP_MODEL = process.env.DEEP_MODEL || 'opus';       // 出题、复盘

export function baseOptions(extra = {}) {
  return {
    tools: [],
    settingSources: [],
    persistSession: false,
    ...(CLAUDE_PATH ? { pathToClaudeCodeExecutable: CLAUDE_PATH } : {}),
    ...extra,
  };
}

// 一次性问答，返回最终文本。
export async function oneShot(prompt, options = {}) {
  let text = '';
  for await (const m of query({ prompt, options: baseOptions(options) })) {
    if (m.type === 'result') {
      if (m.subtype !== 'success') throw new Error(`LLM 调用失败: ${m.subtype}`);
      text = m.result;
    }
  }
  return text;
}
