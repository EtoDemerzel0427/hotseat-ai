# Stage 3: Amends

A new message type:

```
AMEND <id> <price> <qty>
```

Modifies order `id`, which must currently be resting on a book: its limit price becomes `price` and its **total quantity** becomes `qty`.

## What the quantity means

`qty` is the order's new total quantity, including the part that has already traded. If the order has traded `cum` so far, its remaining quantity after the amend is `qty - cum`.

For example, a sell for 10 has traded 4, leaving 6 on the book. An `AMEND` to a total of 6 makes the remaining quantity 6 - 4 = 2.

If `qty` is not greater than `cum`, the amount already traded has reached the new target: the order is done and leaves the book. Trades that already happened stand, and nothing is printed.

## Queue position

- Same price, remaining quantity does not increase: modified in place; the order keeps its position in the queue.
- Same price, remaining quantity increases: the order loses time priority and moves to the back of the queue at that price.
- Price changes: equivalent to cancelling the order and re-entering the engine with the same `id`, the new price and the new remaining quantity. It may trade immediately as the aggressor; whatever is left rests at the back of the queue at the new price. The cumulative traded quantity `cum` is kept and is still used by later amends.

Quantity that an order traded as the aggressor also counts toward its `cum`.

A successful `AMEND` prints nothing by itself; trades it causes are printed as `TRADE` lines as usual.

## Rejects

Same check order as in stage 2:

1. `INVALID`: the `price` or `qty` of the `AMEND` is not valid (same ranges as for `INSERT`).
2. `UNKNOWN_ID`: the `id` of the `AMEND` is not currently on any book.

## Example 1

Input

```
INSERT 1 AAPL BUY 100 10
INSERT 2 AAPL BUY 100 10
AMEND 1 100 4
INSERT 3 AAPL SELL 100 6
```

Output

```
TRADE AAPL 100.00 4 3 1
TRADE AAPL 100.00 2 3 2
BOOK AAPL
BID 100.00 8 1
```

#1 is reduced at the same price and stays ahead of #2, so sell #3 trades 4 with #1 first and then 2 with #2.

## Example 2

Input

```
INSERT 1 AAPL SELL 100 10
INSERT 2 AAPL BUY 100 4
INSERT 3 AAPL SELL 100 5
AMEND 1 100 6
INSERT 4 AAPL BUY 100 7
```

Output

```
TRADE AAPL 100.00 4 2 1
TRADE AAPL 100.00 2 4 1
TRADE AAPL 100.00 5 4 3
```

#1 trades 4 and has 6 left. `AMEND 1 100 6` sets the total to 6, so the remaining quantity becomes 2 — a reduction, so #1 stays ahead of #3. Buy #4 takes 2 from #1 and then 5 from #3.
