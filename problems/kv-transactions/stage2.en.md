# Key-Value Store with Nested Transactions (Stage 2)

## New requirements

Users want to be able to undo a group of modifications as a unit, so transactions are added, and transactions can be nested.

The behaviour and output of the four stage 1 commands stay the same. Three commands are added:

- `BEGIN`: open a new transaction. If there are open transactions already, the new one is nested inside the innermost one. No output.
- `ROLLBACK`: undo every modification made in the innermost open transaction and close that transaction. Afterwards the contents of the store are exactly what they were just before the matching `BEGIN`. No output on success. If there is no open transaction, print `NO TRANSACTION` and change nothing.
- `COMMIT`: make the modifications of **all** open transactions permanent and close all of them (not only the innermost one). No output on success. If there is no open transaction, print `NO TRANSACTION`.

Additional notes:

- Modifications inside a transaction are visible immediately: `GET` and `COUNT` always reflect every modification executed so far, including those in open transactions.
- `SET` and `DELETE` executed outside any transaction are permanent right away.
- A transaction may contain no modifications at all.
- Transactions may still be open when the input ends; nothing needs to be done about them.

## Input format

The first line contains an integer `Q`.

Each of the next `Q` lines contains one command: `SET key value`, `GET key`, `DELETE key`, `COUNT value`, `BEGIN`, `ROLLBACK`, or `COMMIT`.

## Output format

For each `GET` and `COUNT` command, print one line with the result. For each `ROLLBACK` or `COMMIT` executed when there is no open transaction, print one line `NO TRANSACTION`. Other commands produce no output.

## Constraints

- `1 ≤ Q ≤ 2000`
- At most 100 transactions are open at any time

## Example 1

Input:

```
11
SET a 1
BEGIN
SET a 2
BEGIN
DELETE a
GET a
ROLLBACK
GET a
ROLLBACK
GET a
ROLLBACK
```

Output:

```
NULL
2
1
NO TRANSACTION
```

Explanation:

- The outer transaction changes `a` to 2 and the inner transaction deletes `a`, so the first `GET a` prints `NULL`.
- The first `ROLLBACK` undoes the inner transaction, and `a` is 2 again.
- The second `ROLLBACK` undoes the outer transaction, and `a` is 1 again.
- When the third `ROLLBACK` runs there is no open transaction, so it prints `NO TRANSACTION`.

## Example 2

Input:

```
10
BEGIN
SET a 5
BEGIN
SET b 5
COMMIT
ROLLBACK
COUNT 5
COMMIT
GET a
GET b
```

Output:

```
NO TRANSACTION
2
NO TRANSACTION
5
5
```

Explanation:

- When `COMMIT` runs, two transactions are open. The modifications of both become permanent and both transactions are closed.
- The following `ROLLBACK` has no transaction to undo and prints `NO TRANSACTION`; `a` and `b` are unaffected, so `COUNT 5` prints 2.
- When the second `COMMIT` runs there is no open transaction, so it prints `NO TRANSACTION`.
