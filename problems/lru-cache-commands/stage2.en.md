# LRU Cache Simulator (Stage 2)

## New requirements

After launch, the operations team asks for two things: the ability to delete a key explicitly, and the ability to change the cache capacity at runtime. Production traffic has also grown a lot, so your implementation has to handle a large number of commands efficiently.

All stage 1 rules (the behaviour and output of `GET` and `PUT`) stay the same. Two commands are added:

- `DEL k`: if key `k` is in the cache, delete it and print `1`; otherwise print `0`. Deleting a key does not affect the usage order of the other keys.
- `RESIZE c`: change the cache capacity to `c`. If the cache currently holds more than `c` keys, repeatedly evict the least recently used key in LRU order until it holds at most `c` keys. Print the number of keys evicted by this command (possibly `0`). `RESIZE` does not change the usage order of the remaining keys.

Later `PUT` commands use the new capacity to decide whether an eviction is needed.

## Input format

The first line contains two integers `C Q`.

Each of the next `Q` lines contains one command: `GET k`, `PUT k v`, `DEL k`, or `RESIZE c`.

## Output format

For each `GET`, `DEL`, and `RESIZE` command, print one line with the result, in order. `PUT` produces no output.

## Constraints

- `1 ≤ C ≤ 2 × 10^5`, and `1 ≤ c ≤ 2 × 10^5` in `RESIZE`
- `1 ≤ Q ≤ 2 × 10^5`
- `0 ≤ k ≤ 10^9`
- `0 ≤ v ≤ 10^9`

Make sure the amortized time complexity of each command is low enough.

## Example 1

Input:

```
3 10
PUT 1 1
PUT 2 2
PUT 3 3
DEL 2
DEL 2
PUT 4 4
GET 1
RESIZE 1
GET 4
GET 1
```

Output:

```
1
0
1
2
-1
1
```

Explanation:

- The first `DEL 2` succeeds and prints 1; by the second one, 2 is no longer in the cache, so it prints 0.
- After the deletion the cache holds only 2 keys, so `PUT 4 4` does not evict anything.
- `GET 1` prints 1. The order from least to most recently used is now 3, 4, 1.
- `RESIZE 1` has to evict down to a single key: it evicts 3 and then 4, and prints 2.
- `GET 4` prints -1 and `GET 1` prints 1.

## Example 2

Input:

```
2 8
PUT 1 100
RESIZE 3
PUT 2 200
PUT 3 300
PUT 4 400
GET 1
RESIZE 2
GET 3
```

Output:

```
0
-1
1
300
```

Explanation:

- `RESIZE 3` grows the cache; nothing is evicted, so it prints 0.
- After inserting 2 and 3 the cache holds 3 keys and is full. `PUT 4 400` evicts the least recently used key 1, so `GET 1` prints -1.
- At `RESIZE 2` the cache holds 3 keys (2, 3, 4); it evicts 2 and prints 1.
- `GET 3` prints 300.
