import sys

sys.setrecursionlimit(10000)


class CalcError(Exception):
    pass


def tokenize(s):
    tokens = []
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c.isspace():
            i += 1
        elif c.isdigit():
            j = i
            while j < n and s[j].isdigit():
                j += 1
            tokens.append(("num", int(s[i:j])))
            i = j
        elif c.isalpha() or c == "_":
            j = i
            while j < n and (s[j].isalnum() or s[j] == "_"):
                j += 1
            tokens.append(("name", s[i:j]))
            i = j
        else:
            tokens.append((c, c))
            i += 1
    tokens.append(("end", None))
    return tokens


def trunc_div(a, b):
    # Python's // floors; the problem wants truncation toward zero.
    q = abs(a) // abs(b)
    return q if (a < 0) == (b < 0) else -q


class Parser:
    """Recursive descent. Errors do not stop parsing: every operand is still
    consumed, the error is carried as None, so the grammar stays in sync."""

    def __init__(self, tokens, pos, env):
        self.t = tokens
        self.p = pos
        self.env = env

    def expr(self):
        v = self.term()
        while self.t[self.p][0] in ("+", "-"):
            op = self.t[self.p][0]
            self.p += 1
            r = self.term()
            if v is None or r is None:
                v = None
            else:
                v = v + r if op == "+" else v - r
        return v

    def term(self):
        v = self.unary()
        while self.t[self.p][0] in ("*", "/"):
            op = self.t[self.p][0]
            self.p += 1
            r = self.unary()
            if v is None or r is None:
                v = None
            elif op == "*":
                v = v * r
            elif r == 0:
                v = None
            else:
                v = trunc_div(v, r)
        return v

    def unary(self):
        neg = False
        while self.t[self.p][0] == "-":
            neg = not neg
            self.p += 1
        v = self.primary()
        if v is not None and neg:
            v = -v
        return v

    def primary(self):
        kind, val = self.t[self.p]
        self.p += 1
        if kind == "num":
            return val
        if kind == "name":
            return self.env.get(val)
        # kind == "("
        v = self.expr()
        self.p += 1  # ")"
        return v


def main():
    env = {}
    out = []
    for line in sys.stdin:
        if not line.strip():
            continue
        tokens = tokenize(line)
        target = None
        pos = 0
        if tokens[0][0] == "name" and tokens[1][0] == "=":
            target = tokens[0][1]
            pos = 2
        v = Parser(tokens, pos, env).expr()
        if v is None:
            out.append("ERROR")
        else:
            if target is not None:
                env[target] = v
            out.append(str(v))
    if out:
        print("\n".join(out))


main()
