import sys
from collections import defaultdict, deque


def main():
    data = sys.stdin.read().split()
    w, k, q = int(data[0]), int(data[1]), int(data[2])
    logs = defaultdict(deque)
    out = []
    pos = 3
    for _ in range(q):
        op, t, user = data[pos], int(data[pos + 1]), data[pos + 2]
        pos += 3
        dq = logs[user]
        while dq and dq[0] <= t - w:
            dq.popleft()
        if op == "REQ":
            if len(dq) < k:
                dq.append(t)
                out.append("ALLOW")
            else:
                out.append("DENY")
        else:
            out.append(str(len(dq)))
    print("\n".join(out))


main()
