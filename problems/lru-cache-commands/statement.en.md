# LRU Cache Simulator (Stage 1)

## Background

You are implementing an in-memory cache for a service. The cache has limited capacity, and once it is full some data has to be evicted. We use the **LRU (Least Recently Used)** policy: when an eviction is needed, remove the key that has gone **the longest without being accessed**.

## Rules

The cache starts empty and has capacity `C`. Process `Q` commands in order:

- `GET k`: if key `k` is in the cache, print its value and mark `k` as "most recently used"; otherwise print `-1`.
- `PUT k v`:
  - If key `k` is already in the cache, update its value to `v` and mark it as "most recently used". **No** eviction happens in this case.
  - Otherwise, if the cache already holds `C` keys, first evict the least recently used key; then insert `(k, v)` and mark it as "most recently used".
  - `PUT` **produces no output**.

"Use" means a successful `GET` or any `PUT`. A `GET` that misses does not change any state.

## Input format

The first line contains two integers `C Q`: the cache capacity and the number of commands.

Each of the next `Q` lines contains one command, either `GET k` or `PUT k v`.

## Output format

For each `GET` command, print one line with the result, in order.

## Constraints

- `1 ≤ C ≤ 100`
- `1 ≤ Q ≤ 1000`
- `0 ≤ k ≤ 10^9`
- `0 ≤ v ≤ 10^9`

## Example 1

Input:

```
2 9
PUT 1 10
PUT 2 20
GET 1
PUT 3 30
GET 2
PUT 4 40
GET 1
GET 3
GET 4
```

Output:

```
10
-1
-1
30
40
```

Explanation:

- After inserting 1 and 2 the cache is full. `GET 1` prints 10; now 1 is the most recently used key and 2 is the least recently used.
- `PUT 3 30` finds the cache full and evicts 2, so `GET 2` prints -1.
- The cache now holds 1 and 3, and 1 is the less recently used of the two. `PUT 4 40` evicts 1.
- Finally `GET 1` prints -1, `GET 3` prints 30, and `GET 4` prints 40.

## Example 2

Input:

```
2 7
PUT 5 1
PUT 6 2
PUT 5 3
PUT 7 4
GET 6
GET 5
GET 7
```

Output:

```
-1
3
4
```

Explanation: `PUT 5 3` updates the existing key 5, evicts nothing, and marks 5 as most recently used. So `PUT 7 4` evicts 6, not 5.
