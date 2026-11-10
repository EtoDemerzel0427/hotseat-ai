# Stage 2: Durations and Parallel Execution

Each task now has a duration, and the number of machines is unlimited: any number of tasks can run at the same time. The condition for starting a task is unchanged: all the tasks it depends on must have finished. Once started, a task runs without interruption; a task with duration `d` that starts at time `s` finishes at time `s + d`. If a dependency finishes at time `t`, the dependent task can start at time `t` at the earliest.

All tasks may start from time `0`. Compute the earliest time at which all tasks are finished, and the earliest start time of every task.

## Input

Two lines are added after the stage-1 input:

```
DURATION
d1 d2 ... dN
```

The first is the fixed word `DURATION`; the second contains `N` integers, where `di` is the duration of task `i`.

If the input has no `DURATION` section, it is a stage-1 input and must be answered as in stage 1.

## Output

If the dependencies contain a cycle, print one line `CYCLE`.

Otherwise print two lines:

- Line 1: one integer, the earliest time at which all tasks are finished.
- Line 2: `N` integers, the earliest start times of tasks `1` to `N`, separated by single spaces.

## Constraints

- `1 ≤ di ≤ 10^9`
- Everything else is the same as in stage 1.

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
```

Output

```
8
0 0 3 0 7
```

Explanation: tasks 1, 2 and 4 have no dependencies and start at time 0. Task 3 waits for task 1 (finishes at 3) and task 2 (finishes at 2), so it starts at 3 and finishes at 7. Task 5 waits for task 3 (time 7) and task 4 (time 6), so it starts at 7 and finishes at 8.

## Example 2

Input

```
3 3
1 2
2 3
3 1
DURATION
5 5 5
```

Output

```
CYCLE
```
