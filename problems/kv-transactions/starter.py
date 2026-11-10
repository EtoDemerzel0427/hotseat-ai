import sys
from typing import Optional


class KVStore:
    def __init__(self):
        # TODO: initialize your data structures
        pass

    def set(self, key: str, value: str) -> None:
        # TODO: set key to value
        pass

    def get(self, key: str) -> Optional[str]:
        # TODO: return the value of key, or None if the key does not exist
        return ""

    def delete(self, key: str) -> None:
        # TODO: remove key; do nothing if it does not exist
        pass

    def count(self, value: str) -> int:
        # TODO: return the number of keys whose current value equals value
        return -1

    def begin(self) -> None:
        # TODO: handle the BEGIN command (not used in stage 1)
        pass

    def rollback(self) -> bool:
        # TODO: handle the ROLLBACK command (not used in stage 1)
        # Return True on success, False if the command cannot be applied.
        return True

    def commit(self) -> bool:
        # TODO: handle the COMMIT command (not used in stage 1)
        # Return True on success, False if the command cannot be applied.
        return True


def main() -> None:
    lines = sys.stdin.read().split("\n")
    if not lines or not lines[0].strip():
        return
    q = int(lines[0])
    store = KVStore()
    out = []
    for line in lines[1:q + 1]:
        parts = line.split()
        if not parts:
            continue
        op = parts[0]
        if op == "SET":
            store.set(parts[1], parts[2])
        elif op == "GET":
            value = store.get(parts[1])
            out.append("NULL" if value is None else value)
        elif op == "DELETE":
            store.delete(parts[1])
        elif op == "COUNT":
            out.append(str(store.count(parts[1])))
        elif op == "BEGIN":
            store.begin()
        elif op == "ROLLBACK":
            if not store.rollback():
                out.append("NO TRANSACTION")
        elif op == "COMMIT":
            if not store.commit():
                out.append("NO TRANSACTION")
    if out:
        sys.stdout.write("\n".join(out) + "\n")


if __name__ == "__main__":
    main()
