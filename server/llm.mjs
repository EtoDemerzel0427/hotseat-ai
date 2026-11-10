// Claude Agent SDK 的公共配置。鉴权由 SDK 处理：ANTHROPIC_API_KEY，或本机已登录的 Claude Code。
import './config.mjs';
import { query } from '@anthropic-ai/claude-agent-sdk';

// 默认用 SDK 自带的可执行文件；CLAUDE_PATH 可以指定本机安装的 claude。
export const CLAUDE_PATH = process.env.CLAUDE_PATH || undefined;

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
