import sys


def main() -> None:
    lines = sys.stdin.read().split("\n")
    q = int(lines[0])
    store = {}    # key -> value
    counts = {}   # value -> number of keys holding it
    log = []      # undo log: (key, previous value or None)
    marks = []    # for each open transaction, the log length at its BEGIN
    out = []

    def apply(key, new):
        old = store.get(key)
        if old is not None:
            c = counts[old] - 1
            if c:
                counts[old] = c
            else:
                del counts[old]
        if new is None:
            store.pop(key, None)
        else:
            store[key] = new
            counts[new] = counts.get(new, 0) + 1

    def write(key, new):
        old = store.get(key)
        if old == new:
            return
        if marks:
            log.append((key, old))
        apply(key, new)

    for line in lines[1:q + 1]:
        parts = line.split()
        if not parts:
            continue
        op = parts[0]
        if op == "SET":
            write(parts[1], parts[2])
        elif op == "GET":
            out.append(store.get(parts[1], "NULL"))
        elif op == "DELETE":
            write(parts[1], None)
        elif op == "COUNT":
            out.append(str(counts.get(parts[1], 0)))
        elif op == "BEGIN":
            marks.append(len(log))
        elif op == "ROLLBACK":
            if not marks:
                out.append("NO TRANSACTION")
            else:
                m = marks.pop()
                while len(log) > m:
                    key, old = log.pop()
                    apply(key, old)
        elif op == "COMMIT":
            if not marks:
                out.append("NO TRANSACTION")
            else:
                marks.clear()
                log.clear()
    if out:
        sys.stdout.write("\n".join(out) + "\n")


main()
