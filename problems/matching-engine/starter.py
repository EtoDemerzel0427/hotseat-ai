import re
import sys
from dataclasses import dataclass, field
from typing import List, Optional

# Implement an in-memory matching engine.
#
# All input parsing and output formatting is done for you below main().
# You only fill in the MatchingEngine methods.
#
# Conventions:
#   - order ids are Python ints (they can be as large as 2**64 - 1)
#   - side is the string "BUY" or "SELL"
#   - prices are integers in cents: "100.5" -> 10050, "7" -> 700
#   - price / qty are None when the input token is not a well-formed
#     price / quantity (see the statement for what well-formed means)
#
# To produce output while processing a message, call the reporter:
#   self.out.trade(symbol, price_cents, qty, aggressor_id, resting_id)
#   self.out.reject(order_id, reason)   # reason: one of the REJECT_* constants
# Lines are printed in the order you call these methods.

REJECT_INVALID = "INVALID"
REJECT_DUPLICATE_ID = "DUPLICATE_ID"
REJECT_UNKNOWN_ID = "UNKNOWN_ID"


@dataclass
class Level:
    price: int        # cents
    total_qty: int    # total quantity at this price
    order_count: int  # number of orders at this price


@dataclass
class BookSnapshot:
    symbol: str
    bids: List[Level] = field(default_factory=list)  # highest price first
    asks: List[Level] = field(default_factory=list)  # lowest price first


class MatchingEngine:
    def __init__(self, out):
        self.out = out  # Reporter

    def insert(self, order_id: int, symbol: str, side: str,
               price: Optional[int], qty: Optional[int]) -> None:
        # TODO
        pass

    def cancel(self, order_id: int) -> None:
        # TODO
        pass

    def amend(self, order_id: int, price: Optional[int], qty: Optional[int]) -> None:
        # TODO
        pass

    def snapshot(self) -> List[BookSnapshot]:
        """Called once after the last message. Return the books to print,
        in the order they should be printed."""
        # TODO
        return []


# ---------------------------------------------------------------------------
# I/O below. You should not need to change anything here.
# ---------------------------------------------------------------------------

_PRICE_RE = re.compile(r"^\d{1,12}(\.\d{1,2})?$")
_QTY_RE = re.compile(r"^\d{1,10}$")


def parse_price(tok: str) -> Optional[int]:
    if not _PRICE_RE.match(tok):
        return None
    whole, _, frac = tok.partition(".")
    cents = int(whole) * 100 + int((frac + "00")[:2])
    return cents if cents > 0 else None


def parse_qty(tok: str) -> Optional[int]:
    if not _QTY_RE.match(tok):
        return None
    q = int(tok)
    return q if 1 <= q <= 10**9 else None


def fmt_price(cents: int) -> str:
    return "%d.%02d" % (cents // 100, cents % 100)


class Reporter:
    def __init__(self):
        self.lines = []

    def trade(self, symbol: str, price: int, qty: int, aggressor_id: int, resting_id: int) -> None:
        self.lines.append("TRADE %s %s %d %d %d" % (symbol, fmt_price(price), qty, aggressor_id, resting_id))

    def reject(self, order_id: int, reason: str) -> None:
        self.lines.append("REJECT %d %s" % (order_id, reason))


def main():
    out = Reporter()
    engine = MatchingEngine(out)
    for line in sys.stdin:
        t = line.split()
        if not t:
            continue
        op = t[0]
        if op == "INSERT":
            engine.insert(int(t[1]), t[2], t[3], parse_price(t[4]), parse_qty(t[5]))
        elif op == "CANCEL":
            engine.cancel(int(t[1]))
        elif op == "AMEND":
            engine.amend(int(t[1]), parse_price(t[2]), parse_qty(t[3]))

    lines = out.lines
    for book in engine.snapshot():
        lines.append("BOOK %s" % book.symbol)
        for lv in book.bids:
            lines.append("BID %s %d %d" % (fmt_price(lv.price), lv.total_qty, lv.order_count))
        for lv in book.asks:
            lines.append("ASK %s %d %d" % (fmt_price(lv.price), lv.total_qty, lv.order_count))
    if lines:
        sys.stdout.write("\n".join(lines) + "\n")


main()
