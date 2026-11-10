// 用法: node scripts/check-problem.mjs <slug> [<slug> ...]
// 校验题目目录：双语题面齐全、参考解能跑出所有期望输出、起始代码能编译并在每个用例上正常退出。
import { validateProblem } from '../server/problems.mjs';

let failed = false;
for (const slug of process.argv.slice(2)) {
  const v = await validateProblem(slug);
  if (!v.ok) failed = true;
  console.log(`${slug}: ${v.message}`);
}
process.exit(failed ? 1 : 0);
