import sys
from collections import OrderedDict


def main() -> None:
    data = sys.stdin.read().split()
    if not data:
        return
    capacity, q = int(data[0]), int(data[1])
    idx = 2
    # Order: front is least recently used, back is most recently used
    cache = OrderedDict()
    out = []
    for _ in range(q):
        op = data[idx]
        idx += 1
        if op == "GET":
            k = int(data[idx]); idx += 1
            if k in cache:
                cache.move_to_end(k)
                out.append(str(cache[k]))
            else:
                out.append("-1")
        elif op == "PUT":
            k = int(data[idx]); v = int(data[idx + 1]); idx += 2
            if k in cache:
                cache[k] = v
                cache.move_to_end(k)
            else:
                if len(cache) >= capacity:
                    cache.popitem(last=False)
                cache[k] = v
        elif op == "DEL":
            k = int(data[idx]); idx += 1
            if k in cache:
                del cache[k]
                out.append("1")
            else:
                out.append("0")
        elif op == "RESIZE":
            capacity = int(data[idx]); idx += 1
            cnt = 0
            while len(cache) > capacity:
                cache.popitem(last=False)
                cnt += 1
            out.append(str(cnt))
    if out:
        sys.stdout.write("\n".join(out) + "\n")


if __name__ == "__main__":
    main()
