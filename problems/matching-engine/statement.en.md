# Matching Engine

Implement an in-memory matching engine. It reads order messages from standard input one line at a time, processes them in order, prints every trade as soon as it happens, and prints a snapshot of each symbol's order book after the input ends.

## Rules

**Order book.** Orders that have not been fully filled and are waiting in the system form the order book. Each symbol has its own book; orders for different symbols never trade with each other. A book has two sides: buy orders form the bid side, sell orders form the ask side.

**Limit orders.** Every order carries a limit price: a buy means "buy at this price or lower", a sell means "sell at this price or higher".

**Matching.** When a new order enters the engine, it is first matched against the opposite side:

- A buy can trade with sells priced at or below its limit; a sell can trade with buys priced at or above its limit.
- Price priority: a buy trades with the lowest ask first, a sell trades with the highest bid first.
- Time priority: at the same price, the order that entered the book earlier trades first.
- The trade price is the price of the order already on the book (the resting order), not the limit of the incoming order (the aggressor).
- Each trade is for the smaller of the two remaining quantities. An incoming order may trade with several orders across several price levels.

After matching, if the incoming order still has remaining quantity, it rests on its own side of the book at its limit price, behind the orders already at that price.

## Input

One message per line, fields separated by spaces. Blank lines are ignored.

```
INSERT <id> <symbol> <BUY|SELL> <price> <qty>
```

- `id`: a positive 64-bit unsigned integer.
- `symbol`: a non-empty string of uppercase letters.
- `price`: a positive decimal number with 1 to 12 integer digits and at most 2 fractional digits. `100`, `100.5` and `100.25` are all valid spellings.
- `qty`: an integer from 1 to 10^9.

In this stage every message is valid and all `id`s are distinct. There are at most 10^5 messages.

## Output

Whenever a trade happens, immediately print one line:

```
TRADE <symbol> <price> <qty> <aggressor id> <resting id>
```

After the input ends, print every book that still has resting orders, in lexicographic order of symbol. Symbols with no resting orders are not printed.

```
BOOK <symbol>
BID <price> <total quantity at this price> <number of orders at this price>
ASK <price> <total quantity at this price> <number of orders at this price>
```

`BID` lines go from the highest bid to the lowest, followed by `ASK` lines from the lowest ask to the highest. One line per price level.

All prices are printed with exactly two decimal places.

## Example 1

Input

```
INSERT 1 AAPL BUY 100.00 10
INSERT 2 AAPL SELL 101.00 5
```

Output

```
BOOK AAPL
BID 100.00 10 1
ASK 101.00 5 1
```

The buyer pays at most 100 and the seller wants at least 101, so nothing trades and both orders rest.

## Example 2

Input

```
INSERT 1 AAPL SELL 101 5
INSERT 2 AAPL SELL 100 5
INSERT 3 AAPL SELL 100 5
INSERT 4 AAPL SELL 102 5
INSERT 5 AAPL BUY 101 12
```

Output

```
TRADE AAPL 100.00 5 5 2
TRADE AAPL 100.00 5 5 3
TRADE AAPL 101.00 2 5 1
BOOK AAPL
ASK 101.00 3 1
ASK 102.00 5 1
```

Buy #5 first takes the lowest ask, 100: at that price #2 arrived before #3, so they trade in that order. It then takes #1 at 101 for 2, which completes its 12. The remaining 3 of #1 stay on the book.
