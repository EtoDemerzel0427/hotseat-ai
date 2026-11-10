# Stage 2: Cancels and Rejects

## Cancel

A new message type:

```
CANCEL <id>
```

Cancels order `id`, which must currently be resting on a book. A successful cancel prints nothing. Note that the cancel message carries no symbol.

## Rejects

From this stage on, the input may contain invalid messages. Check each message in the order below; on the first rule that applies, print `REJECT <id> <reason>` and ignore the message:

1. `INVALID`: the `price` or `qty` of an `INSERT` is not valid.
   - A valid `price` is a positive decimal number with 1 to 12 integer digits and at most 2 fractional digits. `0`, `0.00`, `-1`, `100.123`, `1e2` and `.5` are all invalid.
   - A valid `qty` is an integer from 1 to 10^9. `0`, `-5` and `1.5` are all invalid.
2. `DUPLICATE_ID`: the `id` of an `INSERT` was already used by a successfully accepted `INSERT` earlier in this run, even if that order has since been fully filled or cancelled.
3. `UNKNOWN_ID`: the `id` of a `CANCEL` is not currently on any book (never seen, fully filled, or already cancelled).

A rejected `INSERT` does not consume its `id`; the same `id` may be used again later.

Apart from `price` and `qty`, all fields are guaranteed to be well formed.

## Output

```
REJECT <id> <INVALID|DUPLICATE_ID|UNKNOWN_ID>
```

Like `TRADE`, a `REJECT` line is printed at the moment the message is processed.

## Example 1

Input

```
INSERT 1 AAPL BUY 100 10
INSERT 2 AAPL BUY 100 20
CANCEL 1
CANCEL 1
CANCEL 99
INSERT 3 AAPL SELL 100 5
```

Output

```
REJECT 1 UNKNOWN_ID
REJECT 99 UNKNOWN_ID
TRADE AAPL 100.00 5 3 2
BOOK AAPL
BID 100.00 15 1
```

The first `CANCEL 1` succeeds. By the second one, #1 is no longer on the book, so it is rejected. #99 never existed. With #1 gone, sell #3 trades with #2.

## Example 2

Input

```
INSERT 1 AAPL BUY 0 10
INSERT 2 AAPL BUY 100.123 10
INSERT 3 AAPL BUY 100 0
INSERT 4 AAPL BUY 100 -5
INSERT 5 AAPL BUY 1e2 5
INSERT 1 AAPL BUY 100 1
```

Output

```
REJECT 1 INVALID
REJECT 2 INVALID
REJECT 3 INVALID
REJECT 4 INVALID
REJECT 5 INVALID
BOOK AAPL
BID 100.00 1 1
```

The first `INSERT 1` is rejected and does not consume id 1, so the last `INSERT 1` is accepted normally.
