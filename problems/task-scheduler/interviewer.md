# Expected approach

**Stage 1.** Kahn's algorithm (in-degree counting) with a min-heap (priority queue) of tasks whose in-degree is 0. Pop the smallest, append it to the order, decrement the in-degree of its successors and push those that reach 0. If fewer than N tasks were output, there is a cycle. Time O((N + M) log N), space O(N + M). An ordered set works equally well.

A DFS-based topological sort detects cycles but does not produce this particular order (reverse post-order is a valid order, not the smallest-available-first one). If the candidate starts with DFS, let them test on example 1 and find out, or use hint 1.

**Stage 2.** Earliest start of a task = max over its dependencies of (their start + duration), 0 if none. Compute in any topological order (a plain FIFO queue is enough, no heap needed); the answer is the max of start + duration over all tasks. This is the longest path in a DAG / critical path. Time O(N + M). Cycle detection is the same as stage 1.

**Stage 3.** Event-driven simulation. Keep a min-heap of running tasks keyed by end time, a min-heap of ready task ids, and a count of idle machines. Loop: pop every running task whose end time equals the current time (free the machine, release successors); then start ready tasks smallest id first while machines are idle; then advance the time to the smallest end time in the running heap. Stop when nothing is running. If fewer than N tasks completed, print `CYCLE`. Time O((N + M) log N).

Input handling: after the M pairs, the next token is either absent (stage 1), or `DURATION` followed by N integers, optionally followed by `WORKERS K`. The starter already parses all three formats and prints all outputs; the candidate never touches I/O. It dispatches to `schedule(n, deps)` (stage 1, returns the order or null for `CYCLE`), `solve_stage2(n, deps, durations)` and `solve_stage3(n, deps, durations, k)`. The last two return the total and the per-task start times (C++: `std::optional<Summary>` with `total` and `per_task`, durations as `long long`; Python: a `(total, per_task)` tuple), or null for `CYCLE`. The stubs return an empty order / `(0, [])` so the unmodified starter passes no test, including the `CYCLE` ones. When a stage is revealed, point the candidate at the matching stub; the stage-2 and stage-3 functions are independent, so the candidate may share code between them as they like. Because the starter uses `long long` for durations, the C++ overflow mistake below only happens if the candidate does sums in `int` inside their own code.

Note on test sizes: the platform caps each input at 20KB, so the tests cannot enforce the stated limits (N up to 10^5). The largest tests have N = 20000 with about 1400 pairs, and a few thousand pairs with N around 2000. An O(N^2) scan for the smallest available task passes in C++. Ask for the complexity explicitly and push for the heap if the candidate rescans.

# Common mistakes

- Using a FIFO queue or a stack in stage 1: gives a valid order but not the required one. In example 1 a FIFO queue gives `5 6 1 2 3 4`.
- Sorting the initial zero in-degree tasks once and then using a FIFO queue: still wrong, newly released small ids must jump ahead (example 1 again: 1 and 2 must come before 6).
- Duplicate pairs: deduplicating the adjacency list but not the in-degree (or the reverse), so the in-degree never reaches 0 and the program prints `CYCLE` for a valid input. Counting each occurrence on both sides is the simplest correct handling.
- Cycle detection: printing a partial order instead of `CYCLE`; printing some output before knowing whether there is a cycle. A cycle anywhere makes the whole answer `CYCLE`, even if other components are fine.
- Direction of the pair: `a b` means a before b. Some candidates read it as "a depends on b".
- 0-based vs 1-based ids.
- Stage 2: 32-bit overflow. Durations go up to 10^9, so start times exceed 2^31 with a chain of three tasks. Need 64-bit.
- Stage 2: total time taken as the finish time of the last task in the topological order, or of tasks with no successors computed incorrectly; it is the max over all tasks. An isolated long task can decide the answer.
- Stage 2: adding up durations along the stage-1 order (i.e. answering for one machine).
- Stage 2: breaking stage 1 by refactoring `schedule` while sharing code with `solve_stage2` (e.g. switching the shared ready structure to a FIFO queue). Stage-1 tests still run; ask the candidate to rerun them.
- Stage 3: starting tasks before handling all completions at the same time `t`. A task released at `t` with a smaller id must win over a larger id that was already ready.
- Stage 3: advancing time by 1 each step. With durations up to 10^9 this does not finish; time must jump to the next completion.
- Stage 3: when several tasks end at the same time, handling only one of them before starting new tasks.
- Stage 3: keeping the ready heap ordered by release time instead of by id.
- Stage 3: cyclic input makes the simulation end early with tasks never started; must print `CYCLE`, not a partial schedule.

# Standard answers to clarifying questions

- Can a pair repeat: yes, and it means the same as a single occurrence.
- Self-dependency `a a`: does not appear.
- Are all tasks connected: no. There may be tasks with no dependencies at all, and several independent groups.
- If there is a cycle but some tasks can run: print only `CYCLE`.
- Output separator: single spaces, one line.
- Stage 2: can durations be 0: no, at least 1.
- Stage 2: is the order from stage 1 still printed: no. With a `DURATION` section the output is the total time and the start times.
- Stage 2: when is a dependent task allowed to start: at the same instant its last dependency finishes.
- Stage 3: do machines differ: no, they are identical, and the output does not say which machine runs which task.
- Stage 3: can K be larger than N: yes; then the result equals stage 2.
- Stage 3: is the greedy rule optimal: no, and it does not need to be. Output exactly what the rule produces.
- Stage 3: can a ready task be held back to wait for a better one: no. If a machine is idle and a task is ready, it starts.

# Follow-ups

After stage 1:
- Time and space complexity? What if the tie-break were not required, could it be done in O(N + M)?
- How would you report which tasks are on a cycle? (The tasks never output are on a cycle or downstream of one; to list one actual cycle, DFS with colors among the remaining tasks, or repeatedly follow an unfinished predecessor.)
- Why does a DFS-based topological sort not give this order?

After stage 2:
- Which tasks are critical, i.e. delaying them delays the whole build? (Backward pass for latest start times; slack = latest - earliest; critical tasks have slack 0.)
- If one task's duration changes, how would you update the result without recomputing everything?

After stage 3:
- Show an input where this greedy rule is not optimal. (K = 2, tasks 1, 2, 3 with durations 1, 1, 2, and task 4 with duration 2 depending on task 3. Greedy starts 1 and 2 at time 0, then 3 at time 1, 4 at time 3, total 5. Starting 3 at time 0 gives total 4.)
- Is finding the optimal schedule for K machines easy? (No, NP-hard in general; list scheduling like this is a 2 - 1/K approximation.)
- How would you add priorities, or tasks that need more than one machine?

# Hint ladder

Stage 1:
1. "At the very beginning, which tasks are allowed to run? After you run one of them, what changes for the others?"
2. "For each task, keep the number of dependencies that have not finished yet. When does a task become available, and which of the available tasks does the rule tell you to pick?"
3. "Keep the available tasks in a min-heap. Pop the smallest, output it, decrement the counters of the tasks that depend on it, and push those whose counter reaches zero. If you output fewer than N tasks, there is a cycle."

Stage 2:
1. "For one task, what determines the earliest moment it can start?"
2. "If you already know the finish times of all dependencies of a task, you know its start time. In what order should you process the tasks so that this is always the case?"
3. "Process tasks in topological order; start[v] = max(start[u] + d[u]) over dependencies u. The answer is the largest start + duration."

Stage 3:
1. "At which moments can anything change in the system?"
2. "Only completions change the state. Keep the running tasks so that you can find the next one to finish, and jump the clock straight to it."
3. "Two heaps: running tasks by end time, ready tasks by id. At each event time, first pop all tasks ending now and release their successors, then start ready tasks while a machine is idle, then move the clock to the earliest end time."
