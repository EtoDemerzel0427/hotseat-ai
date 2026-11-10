import sys


class RateLimiter:
    def __init__(self, window: int, limit: int):
        # TODO
        pass

    def request(self, t: int, user: str) -> bool:
        """User `user` sends a request at time t. Return whether it is allowed."""
        # TODO
        return False

    def stat(self, t: int, user: str) -> int:
        """Handle a STAT command at time t for `user`. Return the number to print."""
        # TODO
        return -1


def main():
    data = sys.stdin.read().split()
    w, k, q = int(data[0]), int(data[1]), int(data[2])
    limiter = RateLimiter(w, k)
    out = []
    pos = 3
    for _ in range(q):
        op, t, user = data[pos], int(data[pos + 1]), data[pos + 2]
        pos += 3
        if op == "REQ":
            out.append("ALLOW" if limiter.request(t, user) else "DENY")
        elif op == "STAT":
            out.append(str(limiter.stat(t, user)))
    sys.stdout.write("\n".join(out) + ("\n" if out else ""))


main()
