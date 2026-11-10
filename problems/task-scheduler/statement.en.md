# Task Scheduler with Dependencies

A build system has `N` tasks numbered `1` to `N`. Tasks depend on each other: a dependency pair `a b` means task `a` must finish before task `b` starts.

There is a single machine, so tasks run one after another. Produce an execution order in which every task runs only after all the tasks it depends on have finished.

## Rules

Many orders may be valid. Use the following rule to pick exactly one: at every step, among all tasks that have not run yet and whose dependencies have all run, run the one with the smallest id.

If the dependencies contain a cycle, no valid order exists; print `CYCLE` in that case.

## Input

The first line contains two integers `N M`, the number of tasks and the number of dependency pairs.

Each of the next `M` lines contains two integers `a b`, meaning task `a` must finish before task `b`. The same pair may appear more than once.

## Output

If a valid order exists, print one line with `N` integers, the execution order obtained by the rule above, separated by single spaces.

Otherwise print one line `CYCLE`.

## Constraints

- `1 ≤ N ≤ 10^5`, `0 ≤ M ≤ 2×10^5`
- `1 ≤ a, b ≤ N`, `a ≠ b`

## Example 1

Input

```
6 5
5 1
5 2
3 4
6 3
2 4
```

Output

```
5 1 2 6 3 4
```

Explanation: at the start the tasks with no unfinished dependencies are 5 and 6; the smaller id, 5, is chosen. Once 5 is done, 1 and 2 become runnable, so the choices are 1, 2 and 6; 1 is chosen, then 2. After that only 6 is runnable (task 4 is still waiting for task 3). After 6 comes 3, and finally 4.

## Example 2

Input

```
4 4
1 2
2 3
3 2
3 4
```

Output

```
CYCLE
```

Explanation: tasks 2 and 3 each wait for the other to finish.
