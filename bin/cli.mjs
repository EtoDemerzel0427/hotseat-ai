#!/usr/bin/env node
// 命令行入口：启动服务并打开浏览器；doctor 和 setup-voice 作为子命令。
import { spawn } from 'node:child_process';

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'doctor') await import('../scripts/doctor.mjs');
else if (cmd === 'setup-voice') { process.argv.splice(2, 1); await import('../scripts/setup-voice.mjs'); }
else if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
  console.log(`Usage:
  hotseat-ai [--no-open]                      start the app and open it in the browser
  hotseat-ai doctor                           check Node, compilers, Claude access and voice
  hotseat-ai setup-voice [base|small|turbo]   install speech-to-text

Configuration lives in a .env file; see .env.example.`);
} else {
  const { ready } = await import('../server/index.mjs');
  const url = await ready;
  if (![cmd, ...rest].includes('--no-open') && !process.env.NO_OPEN) {
    const [bin, args] = process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
    try { spawn(bin, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref(); } catch { /* 没有桌面环境 */ }
  }
}
