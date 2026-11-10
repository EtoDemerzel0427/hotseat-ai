import heapq
import sys


def main():
    data = sys.stdin.read().split()
    n, m = int(data[0]), int(data[1])
    succ = [[] for _ in range(n + 1)]
    indeg = [0] * (n + 1)
    pos = 2
    for _ in range(m):
        a, b = int(data[pos]), int(data[pos + 1])
        pos += 2
        succ[a].append(b)
        indeg[b] += 1

    dur = None
    workers = None
    if pos < len(data) and data[pos] == "DURATION":
        dur = [0] + [int(x) for x in data[pos + 1:pos + 1 + n]]
        pos += 1 + n
        if pos < len(data) and data[pos] == "WORKERS":
            workers = int(data[pos + 1])

    if dur is None:
        # Stage 1: Kahn's algorithm with a min-heap of available tasks.
        ready = [i for i in range(1, n + 1) if indeg[i] == 0]
        heapq.heapify(ready)
        order = []
        while ready:
            u = heapq.heappop(ready)
            order.append(u)
            for v in succ[u]:
                indeg[v] -= 1
                if indeg[v] == 0:
                    heapq.heappush(ready, v)
        print(" ".join(map(str, order)) if len(order) == n else "CYCLE")
        return

    start = [0] * (n + 1)
    if workers is None:
        # Stage 2: longest path over a topological order.
        queue = [i for i in range(1, n + 1) if indeg[i] == 0]
        head = 0
        total = 0
        while head < len(queue):
            u = queue[head]
            head += 1
            end = start[u] + dur[u]
            if end > total:
                total = end
            for v in succ[u]:
                if end > start[v]:
                    start[v] = end
                indeg[v] -= 1
                if indeg[v] == 0:
                    queue.append(v)
        done = len(queue)
    else:
        # Stage 3: event simulation. `running` is a heap of (end time, task),
        # `ready` a heap of task ids.
        ready = [i for i in range(1, n + 1) if indeg[i] == 0]
        heapq.heapify(ready)
        running = []
        idle = workers
        t = 0
        total = 0
        done = 0
        while True:
            while running and running[0][0] == t:
                _, u = heapq.heappop(running)
                idle += 1
                done += 1
                for v in succ[u]:
                    indeg[v] -= 1
                    if indeg[v] == 0:
                        heapq.heappush(ready, v)
            while idle > 0 and ready:
                u = heapq.heappop(ready)
                start[u] = t
                idle -= 1
                heapq.heappush(running, (t + dur[u], u))
            if not running:
                break
            t = running[0][0]
            total = t

    if done != n:
        print("CYCLE")
    else:
        print(total)
        print(" ".join(map(str, start[1:])))


main()
