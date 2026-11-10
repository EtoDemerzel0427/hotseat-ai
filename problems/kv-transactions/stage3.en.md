# Key-Value Store with Nested Transactions (Stage 3)

## New requirements

The store is going into production: it will hold many keys, transactions will be nested deeply, `BEGIN` will be very frequent, and `COUNT` will be called often.

The commands and the output format are exactly the same as in stage 2; no command is added. What changes is the data size and the cost allowed for each command:

- The cost of `BEGIN` must not grow with the number of keys in the store.
- The cost of `COUNT` must not grow with the number of keys in the store.
- The cost of `ROLLBACK` may only be proportional to the number of modifications made in the transaction being undone.
- `SET`, `GET`, and `DELETE` take constant time on average.
- The extra memory used may only be proportional to the number of modifications made in open transactions.

## Constraints

- `1 ≤ Q ≤ 2×10^5`
- At most `10^5` keys exist in the store at the same time
- At most `10^5` transactions are open at any time

## About the tests of this stage

The size of a single test input on this platform is limited, so the tests of this stage check correctness under deep nesting and large numbers of transactions; they do not tell implementations apart by running time. After your submission passes, explain to the interviewer the time complexity of each command in your implementation and its overall memory use; the interviewer will assess it against the requirements above.

## Example 1

Input:

```
14
SET k v0
BEGIN
SET k v1
SET k v2
BEGIN
SET k v1
DELETE k
SET k v3
COUNT v1
ROLLBACK
GET k
COUNT v2
ROLLBACK
GET k
```

Output:

```
0
v2
1
v0
```

Explanation:

- The outer transaction changes `k` to `v1` and then to `v2`. The inner transaction changes `k` to `v1`, deletes it, and then sets it to `v3`. At this point no key holds `v1`, so `COUNT v1` prints 0.
- The first `ROLLBACK` undoes the three modifications of the inner transaction; `k` goes back to `v2`, its value before the inner transaction began, and `COUNT v2` prints 1.
- The second `ROLLBACK` undoes the outer transaction, and `k` goes back to `v0`.

## Example 2

Input:

```
15
SET a x
BEGIN
SET b x
BEGIN
SET c x
BEGIN
SET d x
COUNT x
ROLLBACK
COUNT x
ROLLBACK
ROLLBACK
COUNT x
GET b
ROLLBACK
```

Output:

```
4
3
1
NULL
NO TRANSACTION
```

Explanation:

- Each of the three nested transactions adds one key holding `x`; together with the initial `a`, `COUNT x` prints 4.
- After the innermost transaction is undone, 3 remain. After two more rollbacks only `a` is left, so `COUNT x` prints 1 and `GET b` prints `NULL`.
- When the last `ROLLBACK` runs there is no open transaction, so it prints `NO TRANSACTION`.
