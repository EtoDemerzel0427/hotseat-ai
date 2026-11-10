# Expected approach
One queue (deque) per user, holding the timestamps of that user's allowed requests. When handling a command at time t, first pop from the front every timestamp `<= t - W`, then check whether the queue length is less than K.
- Time: each timestamp is pushed at most once and popped at most once, so amortized O(1) per command, O(Q) total.
- Space: each user's queue never exceeds K entries, so O(min(Q, users × K)) overall.

# Starter code
The starter (C++ and Python) owns all input and output for both stages: it reads `W K Q`, parses every command, and prints the result. The candidate only implements a `RateLimiter` class:
- `RateLimiter(window, limit)`: constructor.
- `request(t, user) -> bool`: stage 1; the starter prints `ALLOW`/`DENY`.
- `stat(t, user) -> int`: already wired to the `STAT` command and printed by the starter; it is only used from stage 2, so in stage 1 the candidate can ignore it. Do not explain what it should do before stage 2 is revealed.

The stubs return `false` and `-1`, so the unmodified starter fails every test. If the candidate asks about parsing or output format, tell them it is handled and they should focus on the class.

# Common mistakes
- Window boundary: the interval is `(t - W, t]`, open on the left and closed on the right. A request whose timestamp equals `t - W` has already left the window. Writing `< t - W` is the most common bug.
- Recording denied requests in the queue as well.
- Using one global queue instead of one per user.
- Using a vector and erasing from the front, which degrades to O(K) per command.
- Integer overflow: W and t both go up to 1e9. `t - W` does not overflow an int, but the additive form `ts + W <= t` does.
- Stage 2: STAT on a user that has never appeared must not fail (in C++, `operator[]` inserts an empty queue; you can ask whether the candidate knows about this behaviour and its cost).

# Standard answers to clarifying questions
- Several requests at the same timestamp: processed in input order.
- Are timestamps sorted: non-decreasing.
- Character set of user: any string without spaces, at most 20 characters.
- Thread safety: not required for this problem, but usable as a follow-up.

# Follow-up questions
After stage 1:
- What are the time and space complexities? Why is the time bound amortized?
- If K is very large (say 1e6) and memory is tight, what approximations are available? (Fixed-window counter, sliding-window counter approximation, token bucket; where does the error of each come from?)

After stage 2:
- The queue of a user who stays inactive is never cleaned up. How would you handle that in production?
- How would you make it work with multiple threads? What lock granularity?
- With several gateway machines, where does the rate-limiting state live?

# Hint ladder
1. "For a single user, which pieces of history do you need in order to decide? Which can be thrown away?"
2. "Time is monotonic. What pattern do expired requests follow? Where do they sit in the data you keep?"
3. "Try keeping, for each user, a queue ordered by time, and pop expired entries from the front."
