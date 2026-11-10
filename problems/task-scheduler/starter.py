import sys
from typing import List, Optional, Tuple


def schedule(n: int, deps: List[Tuple[int, int]]) -> Optional[List[int]]:
    """n tasks numbered 1..n. Each pair (a, b) in deps means task a must
    finish before task b starts.

    Returns the execution order, or None if no valid order exists.
    """
    # TODO
    return []


# Answers for later stages: return (total, per_task) or None.
# main() prints None as CYCLE; otherwise `total` on one line, then
# `per_task` (values for tasks 1..n, in order) on the next line.
# durations[i] belongs to task i + 1.

def solve_stage2(n: int, deps: List[Tuple[int, int]],
                 durations: List[int]) -> Optional[Tuple[int, List[int]]]:
    """Used from a later stage."""
    # TODO
    return 0, []


def solve_stage3(n: int, deps: List[Tuple[int, int]],
                 durations: List[int], k: int) -> Optional[Tuple[int, List[int]]]:
    """Used from a later stage."""
    # TODO
    return 0, []


def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n, m = int(data[0]), int(data[1])
    deps = [(int(data[2 + 2 * i]), int(data[3 + 2 * i])) for i in range(m)]
    pos = 2 + 2 * m

    if pos >= len(data) or data[pos] != "DURATION":
        order = schedule(n, deps)
        if order is None:
            print("CYCLE")
        else:
            print(" ".join(map(str, order)))
        return

    durations = [int(x) for x in data[pos + 1:pos + 1 + n]]
    pos += 1 + n

    if pos + 1 < len(data) and data[pos] == "WORKERS":
        result = solve_stage3(n, deps, durations, int(data[pos + 1]))
    else:
        result = solve_stage2(n, deps, durations)

    if result is None:
        print("CYCLE")
    else:
        total, per_task = result
        print(total)
        print(" ".join(map(str, per_task)))


main()
