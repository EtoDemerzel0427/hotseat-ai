# Stage 2: Querying Current Usage

The operations team wants to query a user's current usage at any time. A new command is added:

```
STAT t user
```

Print one line with an integer: the number of requests from user `user` that were allowed in the interval `(t - W, t]`. `STAT` itself does not count as a request. `t` is non-decreasing together with the timestamps of `REQ` commands.

All other rules are the same as in stage 1.

## Example 1

Input

```
10 2 6
REQ 1 alice
REQ 2 alice
STAT 5 alice
STAT 11 alice
STAT 11 bob
REQ 12 alice
```

Output

```
ALLOW
ALLOW
2
1
0
ALLOW
```

Explanation: at time 5 both of alice's requests are inside the window `(-5, 5]`, so the answer is 2. At time 11 the window is `(1, 11]`; the request at time 1 has left the window, so the answer is 1. bob has never sent a request, so the answer is 0. At time 12 the window `(2, 12]` contains no allowed request from alice, so the request is allowed.

## Example 2

Input

```
5 2 4
STAT 0 ghost
REQ 1 a
STAT 1 ghost
STAT 1 a
```

Output

```
0
ALLOW
0
1
```

Explanation: querying a user that has never sent a request prints 0.
