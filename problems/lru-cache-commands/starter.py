import sys


class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        # TODO: initialize your data structures

    def get(self, key: int) -> int:
        # TODO: on a hit, return the value and mark the key as most recently used; otherwise return -1
        return 0

    def put(self, key: int, value: int) -> None:
        # TODO: insert or update; evict the least recently used key when necessary
        pass

    def remove(self, key: int) -> bool:
        # TODO: used by a later stage (DEL command); the return value is printed as 1 (True) or 0 (False)
        return False

    def resize(self, new_capacity: int) -> int:
        # TODO: used by a later stage (RESIZE command); the returned number is printed
        return -1


def main() -> None:
    data = sys.stdin.read().split()
    if not data:
        return
    capacity, q = int(data[0]), int(data[1])
    idx = 2
    cache = LRUCache(capacity)
    out = []
    for _ in range(q):
        if idx >= len(data):
            break
        op = data[idx]
        idx += 1
        if op == "GET":
            key = int(data[idx]); idx += 1
            out.append(str(cache.get(key)))
        elif op == "PUT":
            key, value = int(data[idx]), int(data[idx + 1]); idx += 2
            cache.put(key, value)
        elif op == "DEL":
            key = int(data[idx]); idx += 1
            out.append("1" if cache.remove(key) else "0")
        elif op == "RESIZE":
            new_capacity = int(data[idx]); idx += 1
            out.append(str(cache.resize(new_capacity)))
    if out:
        sys.stdout.write("\n".join(out) + "\n")


if __name__ == "__main__":
    main()
