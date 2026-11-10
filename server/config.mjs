// 配置：加载 .env，确定数据目录，首次运行时把自带的题目和手册复制过去。
// 其他模块都先 import 这个文件，保证读 process.env 之前 .env 已经加载。
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

export const APP_NAME = 'hotseat-ai';
export const APP_ROOT = path.resolve(import.meta.dirname, '..');

// 从 git 仓库运行时数据就放在仓库里；通过 npx 或全局安装运行时放在用户目录下。
const devMode = existsSync(path.join(APP_ROOT, '.git'));
export const DATA_DIR = path.resolve(process.env.HOTSEAT_HOME || (devMode ? APP_ROOT : path.join(os.homedir(), `.${APP_NAME}`)));
mkdirSync(DATA_DIR, { recursive: true });

// 已有的环境变量优先，其次是当前目录的 .env，最后是数据目录的 .env。
for (const f of new Set([path.join(process.cwd(), '.env'), path.join(DATA_DIR, '.env')])) {
  if (existsSync(f)) { try { process.loadEnvFile(f); } catch (e) { console.warn(`could not read ${f}: ${e.message}`); } }
}

export const PROBLEMS_DIR = path.join(DATA_DIR, 'problems');
export const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
export const MODELS_DIR = path.join(DATA_DIR, 'models');
export const PROMPTS_DIR = path.join(DATA_DIR, 'prompts');

if (DATA_DIR !== APP_ROOT) {
  for (const d of ['problems', 'prompts']) {
    const dst = path.join(DATA_DIR, d);
    if (!existsSync(dst)) cpSync(path.join(APP_ROOT, d), dst, { recursive: true });
  }
}
for (const d of [PROBLEMS_DIR, SESSIONS_DIR, MODELS_DIR]) mkdirSync(d, { recursive: true });

export const PORT = Number(process.env.PORT || 4477);
export const HOST = process.env.HOST || '127.0.0.1';

// 依赖包的目录。通过 npx 安装时依赖和本包平级，不能假设在 APP_ROOT/node_modules 下。
const require = createRequire(import.meta.url);
export function pkgDir(name, probe = 'package.json') {
  let p = path.dirname(require.resolve(probe ? `${name}/${probe}` : name));
  while (!existsSync(path.join(p, 'package.json')) && path.dirname(p) !== p) p = path.dirname(p);
  return p;
}
