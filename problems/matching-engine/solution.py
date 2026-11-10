import re
import sys
from collections import OrderedDict

PRICE_RE = re.compile(r"^\d{1,12}(\.\d{1,2})?$")
QTY_RE = re.compile(r"^\d{1,10}$")

books = {}   # symbol -> {"BUY": {price: OrderedDict(id -> order)}, "SELL": {...}}
live = {}    # id -> order currently resting on a book
used = set() # every id ever accepted by INSERT
out = []


def parse_price(tok):
    if not PRICE_RE.match(tok):
        return None
    whole, _, frac = tok.partition(".")
    cents = int(whole) * 100 + int((frac + "00")[:2])
    return cents if cents > 0 else None


def parse_qty(tok):
    if not QTY_RE.match(tok):
        return None
    q = int(tok)
    return q if 1 <= q <= 10**9 else None


def fmt(cents):
    return "%d.%02d" % (cents // 100, cents % 100)


def remove(order):
    side = books[order["sym"]][order["side"]]
    level = side[order["price"]]
    del level[order["id"]]
    if not level:
        del side[order["price"]]
    del live[order["id"]]


def submit(oid, sym, side, price, qty, cum):
    book = books.setdefault(sym, {"BUY": {}, "SELL": {}})
    opp = book["SELL" if side == "BUY" else "BUY"]
    while qty > 0 and opp:
        best = min(opp) if side == "BUY" else max(opp)
        if (side == "BUY" and best > price) or (side == "SELL" and best < price):
            break
        level = opp[best]
        rest = next(iter(level.values()))
        fill = min(qty, rest["leaves"])
        out.append("TRADE %s %s %d %d %d" % (sym, fmt(best), fill, oid, rest["id"]))
        rest["leaves"] -= fill
        rest["cum"] += fill
        qty -= fill
        cum += fill
        if rest["leaves"] == 0:
            remove(rest)
    if qty > 0:
        order = {"id": oid, "sym": sym, "side": side, "price": price, "leaves": qty, "cum": cum}
        book[side].setdefault(price, OrderedDict())[oid] = order
        live[oid] = order


def main():
    for line in sys.stdin:
        t = line.split()
        if not t:
            continue
        op, oid = t[0], int(t[1])
        if op == "INSERT":
            sym, side = t[2], t[3]
            price, qty = parse_price(t[4]), parse_qty(t[5])
            if price is None or qty is None:
                out.append("REJECT %d INVALID" % oid)
            elif oid in used:
                out.append("REJECT %d DUPLICATE_ID" % oid)
            else:
                used.add(oid)
                submit(oid, sym, side, price, qty, 0)
        elif op == "CANCEL":
            if oid not in live:
                out.append("REJECT %d UNKNOWN_ID" % oid)
            else:
                remove(live[oid])
        elif op == "AMEND":
            price, qty = parse_price(t[2]), parse_qty(t[3])
            if price is None or qty is None:
                out.append("REJECT %d INVALID" % oid)
            elif oid not in live:
                out.append("REJECT %d UNKNOWN_ID" % oid)
            else:
                o = live[oid]
                if qty <= o["cum"]:
                    remove(o)
                    continue
                leaves = qty - o["cum"]
                if price == o["price"] and leaves <= o["leaves"]:
                    o["leaves"] = leaves
                else:
                    remove(o)
                    submit(oid, o["sym"], o["side"], price, leaves, o["cum"])
    for sym in sorted(books):
        b = books[sym]
        if not b["BUY"] and not b["SELL"]:
            continue
        out.append("BOOK %s" % sym)
        for p in sorted(b["BUY"], reverse=True):
            lvl = b["BUY"][p]
            out.append("BID %s %d %d" % (fmt(p), sum(o["leaves"] for o in lvl.values()), len(lvl)))
        for p in sorted(b["SELL"]):
            lvl = b["SELL"][p]
            out.append("ASK %s %d %d" % (fmt(p), sum(o["leaves"] for o in lvl.values()), len(lvl)))
    if out:
        sys.stdout.write("\n".join(out) + "\n")


main()
