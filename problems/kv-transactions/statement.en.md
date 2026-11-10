# Key-Value Store with Nested Transactions (Stage 1)

## Background

You are implementing an in-memory key-value store that is read and written through commands. Keys and values are strings. In this stage it only needs to support basic reads and writes and counting by value.

## Rules

The store starts empty. Process `Q` commands in order:

- `SET key value`: set the value of key `key` to `value`. If the key already exists, its previous value is overwritten. No output.
- `GET key`: print the current value of key `key`; print `NULL` if the key does not exist.
- `DELETE key`: delete key `key`. If the key does not exist, do nothing. No output.
- `COUNT value`: print the number of keys whose current value equals `value`; print `0` if there are none.

## Input format

The first line contains an integer `Q`, the number of commands.

Each of the next `Q` lines contains one command. The command name and its arguments are separated by single spaces.

`key` and `value` are strings of lowercase letters and digits, between 1 and 16 characters long. Keys and values are compared as strings, character by character; for example `1` and `01` are different values.

## Output format

For each `GET` and `COUNT` command, print one line with the result, in order. `SET` and `DELETE` produce no output.

## Constraints

- `1 ≤ Q ≤ 1000`

## Example 1

Input:

```
7
SET a 10
SET b 10
COUNT 10
GET a
DELETE a
GET a
COUNT 10
```

Output:

```
2
10
NULL
1
```

Explanation:

- Both `a` and `b` hold `10`, so `COUNT 10` prints 2 and `GET a` prints 10.
- After `a` is deleted, `GET a` prints `NULL`; only `b` still holds `10`, so `COUNT 10` prints 1.

## Example 2

Input:

```
8
SET x foo
SET x bar
COUNT foo
COUNT bar
DELETE y
GET y
SET y bar
COUNT bar
```

Output:

```
0
1
NULL
2
```

Explanation:

- `x` first holds `foo` and is then overwritten with `bar`. No key holds `foo` any more, so `COUNT foo` prints 0 and `COUNT bar` prints 1.
- At `DELETE y` the key `y` does not exist, so nothing happens, and `GET y` prints `NULL`.
- After `SET y bar` both `x` and `y` hold `bar`, so `COUNT bar` prints 2.
