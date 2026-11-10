import sys
from typing import List, NamedTuple, Optional

# ---------------------------------------------------------------------------
# Tokens. The starter splits every line into tokens for you; spaces are
# already removed. Every token list you receive ends with one END token.
# ---------------------------------------------------------------------------
NUMBER = "NUMBER"  # non-negative integer literal; see Token.value
NAME = "NAME"      # identifier made of letters, digits and '_'; see Token.name
PLUS = "+"
MINUS = "-"        # the starter does not decide whether it is unary or binary
STAR = "*"
SLASH = "/"
LPAREN = "("
RPAREN = ")"
END = "END"        # end of the token list


class Token(NamedTuple):
    kind: str        # one of the constants above
    value: int = 0   # set when kind == NUMBER
    name: str = ""   # set when kind == NAME


# ---------------------------------------------------------------------------
# Implement this class. One Calculator object is used for the whole input,
# and its methods are called once per line, in input order.
# Return None to make the line print ERROR.
# ---------------------------------------------------------------------------
class Calculator:
    def evaluate(self, tokens: List[Token]) -> Optional[int]:
        """Called for a line that is an expression."""
        # TODO
        return None

    def assign(self, name: str, tokens: List[Token]) -> Optional[int]:
        """Called for a line of the form `name = ...`.

        `tokens` holds everything after the '='.
        """
        # TODO
        return None


# ---------------------------------------------------------------------------
# Input / output. You should not need to change anything below.
# ---------------------------------------------------------------------------
def _is_name_start(c: str) -> bool:
    return c.isascii() and (c.isalpha() or c == "_")


def _is_name_char(c: str) -> bool:
    return c.isascii() and (c.isalnum() or c == "_")


def tokenize(line: str, pos: int) -> List[Token]:
    """Tokenizes line[pos:] and appends an END token."""
    tokens = []
    n = len(line)
    while pos < n:
        c = line[pos]
        if c == " ":
            pos += 1
        elif c.isdigit():
            start = pos
            while pos < n and line[pos].isdigit():
                pos += 1
            tokens.append(Token(NUMBER, value=int(line[start:pos])))
        elif _is_name_start(c):
            start = pos
            while pos < n and _is_name_char(line[pos]):
                pos += 1
            tokens.append(Token(NAME, name=line[start:pos]))
        else:
            if c in (PLUS, MINUS, STAR, SLASH, LPAREN, RPAREN):
                tokens.append(Token(c))
            pos += 1
    tokens.append(Token(END))
    return tokens


def main():
    calc = Calculator()
    out = []
    for line in sys.stdin:
        line = line.rstrip("\r\n")
        if not line.strip(" "):
            continue  # skip blank lines
        first = len(line) - len(line.lstrip(" "))

        # Detect `name = ...` at the start of the line.
        result = None
        handled = False
        p = first
        if _is_name_start(line[p]):
            while p < len(line) and _is_name_char(line[p]):
                p += 1
            name = line[first:p]
            while p < len(line) and line[p] == " ":
                p += 1
            if p < len(line) and line[p] == "=":
                result = calc.assign(name, tokenize(line, p + 1))
                handled = True
        if not handled:
            result = calc.evaluate(tokenize(line, first))

        out.append("ERROR" if result is None else str(result))
    if out:
        print("\n".join(out))


main()
