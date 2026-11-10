# Stage 3: A Fixed Number of Machines

The number of machines is now fixed at `K`. A machine runs one task at a time; once started, a task cannot be interrupted or moved to another machine.

A task is "ready" when it has not started yet and all the tasks it depends on have finished. The scheduler works by the following rules:

1. At time `0` all machines are idle.
2. At any time `t`, completions are handled first: every task that ends at time `t` finishes, its machine becomes idle, and tasks depending on it may become ready as a result.
3. Then starts are handled: as long as there is an idle machine and a ready task, the ready task with the smallest id starts at time `t` on an idle machine. This step repeats until there is no idle machine or no ready task.

In other words, a machine never stays idle while a task is ready. The total completion time produced by this rule is not necessarily the shortest among all possible schedules; you only need to output the result of running this rule.

## Input

One line is added after the stage-2 input:

```
WORKERS K
```

If the input has no `WORKERS` line, it is a stage-1 or stage-2 input and must be answered as in that stage. `WORKERS` only appears in inputs that have a `DURATION` section.

## Output

Same format as stage 2. If the dependencies contain a cycle, print one line `CYCLE`.

Otherwise print two lines:

- Line 1: one integer, the time at which all tasks are finished when running the rule above.
- Line 2: `N` integers, the start times of tasks `1` to `N`, separated by single spaces.

## Constraints

- `1 ≤ K ≤ 10^5`
- Everything else is the same as in stage 2.

## Example 1

Input

```
5 4
1 3
2 3
3 5
4 5
DURATION
3 2 4 6 1
WORKERS 2
```

Output

```
9
0 0 3 2 8
```

Explanation: at time 0 the ready tasks are 1, 2 and 4; there are only two machines, so the smaller ids 1 and 2 start. At time 2 task 2 finishes and frees a machine; the only ready task is 4, which starts at 2 and finishes at 8. At time 3 task 1 finishes, task 3 becomes ready and starts, finishing at 7. At time 7 task 5 is still waiting for task 4. At time 8 task 4 finishes and task 5 starts, finishing at 9.

## Example 2

Input

```
3 1
3 1
DURATION
2 2 5
WORKERS 1
```

Output

```
9
7 0 2
```

Explanation: there is one machine. At time 0 the ready tasks are 2 and 3 (task 1 depends on task 3); task 2 runs first. At time 2 the only ready task is 3, which runs until time 7. Then task 1 runs and finishes at time 9.
