# Matching Engine — interviewer notes

This is a trading-firm style onsite problem. It is long: three stages, 90 minutes by default. Finishing stage 3 is not required for a pass; clean stage 1 + 2 with good discussion is a solid result. What matters across the session:

| Area | What to look for |
|---|---|
| Requirements | Does the candidate ask about semantics before coding and restate the rules? |
| Data structures | Correct structures, complexity of every operation, awareness of cache/allocation cost |
| Coding | Clear structure, buy and sell sides not copy-pasted, tests the simple case first |
| Testing and edge cases | Can explain how they know it is correct; finds the edge cases themselves |

## How to run this problem

- The statement already explains the trading rules. If the candidate asks what a term means (resting order, aggressor, spread, best bid/ask, tick), explain it plainly, as a real interviewer would. Do not assume trading background.
- Before any code is written, ask for the data structure design and the complexity of each operation: insert that rests, insert that matches k orders, find best price, and (looking ahead) cancel by id. Ask them one at a time.
- Do not reveal stage 2 or 3 requirements early, but if the candidate asks "will there be cancels?", say that cancel by id is coming so they can design for it.

## What the starter gives the candidate

The starter does all I/O. The candidate implements `MatchingEngine` only:

- `insert(id, symbol, side, price, qty)`, `cancel(id)`, `amend(id, price, qty)`: all three are wired from the start; `cancel`/`amend` just receive no messages until stage 2/3 tests run.
- Prices arrive as integer cents. `price`/`qty` arrive as `None` / `std::nullopt` when the token is malformed (out of range, `0`, `1e2`, `100.123`, ...). Deciding to print `REJECT INVALID` for them, and in which order relative to the other checks, is still the candidate's job.
- Output goes through `out.trade(symbol, price, qty, aggressor_id, resting_id)` and `out.reject(id, reason)`; the reporter formats the line (two-decimal prices included).
- `snapshot()` returns a list of `BookSnapshot { symbol, bids, asks }` with `Level { price, total_qty, order_count }`. The starter prints it as given, so the candidate is responsible for the order (symbols ascending, bids high→low, asks low→high) and for leaving out empty books.

## Expected design

Per symbol: two ordered price→level maps (bids descending, asks ascending), each level a FIFO queue of orders plus a running total. An id→order-location index for cancel/amend. An outer symbol→book map (ordered, or sorted at the end for the snapshot). Since CANCEL/AMEND carry no symbol, the id index must be global or map id→book.

Typical C++: `std::map<Price, Level>` (or one with `std::greater`), `Level { std::list<Order> orders; uint64_t total; }`, `std::unordered_map<OrderId, std::list<Order>::iterator>`.

Complexity with L price levels, k orders filled:
- Insert that rests: O(log L).
- Insert that matches: O(k + log L) — each fill is O(1) at the front of the best level; emptied levels are erased.
- Best bid/ask: O(1) via `begin()`.
- Cancel: O(1) to find and unlink with a list iterator (plus O(log L) if the level becomes empty and is looked up by price; O(1) if the order stores a level iterator).
- Amend down in place: O(1). Amend up at same price: O(1) with `list::splice`. Price change: cancel + insert.
- Snapshot: O(total levels).

Prices are already integer cents from the starter; keep them as integers throughout. Level totals need 64 bits: many orders of 10^9 at one price overflow 32 bits. `id` needs `uint64_t` (the tests include 2^64 - 1).

## Common mistakes

Stage 1
- Trade price taken from the aggressor's limit instead of the resting order's price.
- Snapshot in the wrong order (symbols, bid/ask direction) — the starter prints whatever `snapshot()` returns.
- Not erasing an empty price level, so the snapshot prints a level with total 0 or the best-price lookup hits an empty level.
- Buy and sell logic duplicated with one side's comparison wrong (`>=` vs `<=`).
- Level total in a 32-bit integer.
- Printing a `BOOK` header for a symbol whose book became empty.
- `std::deque` or `std::vector` as the level queue: fine for stage 1, but ask how cancel from the middle will work.

Stage 2
- Check order: INVALID must come before DUPLICATE_ID.
- A rejected INSERT must not be recorded in the used-id set.
- DUPLICATE_ID must consider the whole history, not just live orders (a fully filled or cancelled id cannot be reused). This needs a separate set that only grows; ask about its memory cost.
- Cancelling an order that has fully traded must be UNKNOWN_ID: the id index entry has to be removed when a resting order is filled, not only on cancel.
- Iterator invalidation: storing `vector`/`deque` iterators or indices in the id index and then erasing.
- Ignoring a `None`/`nullopt` price or qty (stage 1 code never saw one) instead of rejecting it as INVALID, or dereferencing it and crashing.

Stage 3
- Treating `qty` as the new remaining quantity instead of the new total.
- Computing `qty - cum` in unsigned arithmetic before checking `qty <= cum`.
- Forgetting that an aggressor that partially fills and then rests has `cum > 0`.
- Losing `cum` on a price change.
- Amend up not moving to the back of the queue; amend down moving to the back.
- Using a reference to the order after cancelling it inside amend (dangling).
- An amended order that crosses must trade as the aggressor (trade lines show its id first).
- INVALID before UNKNOWN_ID for AMEND as well.

## Clarifying questions — standard answers

- Trade price: the resting order's price.
- Same price on both sides (buy 100 vs sell 100): they trade.
- Order types: only good-till-cancel limit orders. No market orders, IOC or FOK.
- Self-trade prevention: none.
- Are ids unique across symbols: yes, an id identifies an order globally.
- Is the input guaranteed valid: in stage 1 yes. Later stages define exactly what can be invalid.
- Threading: single-threaded, messages processed strictly in order.
- Performance target: at most 10^5 messages; the tests are small. Correctness first, but the design should not have anything worse than O(log L) on the hot path, and the candidate should be able to say so.
- Leading zeros, trailing dot, plus sign in numbers: do not occur.
- Output buffering / formatting: handled by the starter's reporter; lines appear in the order `trade`/`reject` are called.

## Follow-ups

After stage 1
- Complexity of each operation, one at a time.
- Why not `double` for prices?
- Why is the trade at the resting price? (The resting order published its price first; the aggressor accepted it.)
- What does `std::map` cost in practice? (Node per level, pointer chasing; real books cluster near the touch, so a sorted vector or array indexed by tick is common.)

After stage 2
- How is cancel O(1)? What exactly is stored in the id index and when is it invalidated?
- The used-id set grows forever — what would a real exchange do? (Ids unique per session/day, monotonic ids so a single comparison suffices, or engine-assigned ids.)
- `std::list` allocates per order — how would you avoid allocation on the hot path? (Object pool with intrusive links, indices instead of pointers.)

After stage 3
- Why does the protocol use total quantity rather than remaining quantity? (The client may not yet have seen fills that are in flight; with remaining-quantity semantics, a reduce can turn into an over-fill.)
- Why does amend up lose priority? (Otherwise place 1 lot to hold the front and then amend to 10,000.)
- How would you test this? (Deterministic cases per rule, invariants such as uncrossed book and level total = sum of orders, differential testing against a naive implementation, sanitizers.)
- If time remains: IOC / FOK, multi-threading by symbol, market data output.

## Hint ladder

Stage 1
1. "Which order does an incoming buy need to look at first? What do you need to find quickly?"
2. "Within one price, what is the order of fills? What container gives you that?"
3. "Try an ordered map from price to a FIFO queue of orders, one per side."

Stage 2
1. "CANCEL only gives you an id. How do you find the order?"
2. "Once found, how expensive is removing it from the middle of your queue? Which container makes that cheap, and what handle would you keep?"
3. "Keep a hash map from id to a list iterator; `std::list::erase` with an iterator is O(1) and does not invalidate other iterators."

Stage 3
1. "Walk through the second example by hand. What is the remaining quantity after the amend, and what do you need to have stored to compute it?"
2. "Which of the three amend cases can reuse code you already have?"
3. "Store `cum` per order. Same price and not increasing: edit in place. Otherwise: cancel, then go through the insert path with the same id, carrying `cum`."
