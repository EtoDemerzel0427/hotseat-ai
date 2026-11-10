# Per-User Sliding Window Rate Limiter

An API gateway needs to rate-limit each user separately: within any time window of length `W` seconds, at most `K` requests from the same user may be allowed.

The exact rule: a request arriving at time `t` is allowed if the number of that user's requests **already allowed** in the interval `(t - W, t]` is less than `K`; otherwise it is denied. Denied requests are not counted afterwards.

## Input

The first line contains three integers `W K Q`.

Each of the next `Q` lines contains one command:

```
REQ t user
```

meaning user `user` sends a request at time `t`. `t` is non-decreasing in input order. `user` is a string without spaces.

## Output

For each `REQ`, print one line: `ALLOW` if the request is allowed, `DENY` if it is denied.

## Constraints

- `1 ≤ W ≤ 10^9`, `1 ≤ K ≤ 10^5`, `1 ≤ Q ≤ 2×10^5`
- `0 ≤ t ≤ 10^9`

## Example 1

Input

```
10 2 5
REQ 1 alice
REQ 2 alice
REQ 3 alice
REQ 3 bob
REQ 11 alice
```

Output

```
ALLOW
ALLOW
DENY
ALLOW
ALLOW
```

Explanation: when alice's request at time 3 arrives, the window `(-7, 3]` already contains 2 allowed requests, so it is denied. At time 11 the window is `(1, 11]`; the request at time 1 has left the window and only the one at time 2 remains, so the request is allowed.

## Example 2

Input

```
5 1 5
REQ 0 a
REQ 0 a
REQ 0 b
REQ 5 a
REQ 5 a
```

Output

```
ALLOW
DENY
ALLOW
ALLOW
DENY
```

Explanation: requests with the same timestamp are processed in input order. When a's second request at time 0 arrives, the window already contains 1 allowed request, so it is denied; b is counted separately and is allowed. At time 5 the window is `(0, 5]`; the request at time 0 has left the window, so a's first request is allowed and the second is denied.
