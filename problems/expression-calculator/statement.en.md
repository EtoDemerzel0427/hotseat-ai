# Expression Calculator

Implement an integer expression calculator. Each input line is one expression; print its value for every line.

## Rules

An expression is made of the following symbols:

- Non-negative decimal integers, such as `0` and `42`. Apart from `0` itself there are no leading zeros.
- The binary operators `+`, `-`, `*`, `/`.
- Unary minus `-`, written in front of an operand, which negates it. Unary minus may be repeated, e.g. `- -3` has the value `3`.
- Spaces. Any number of spaces (including none) may appear between any two symbols and at the beginning and end of the line. There are never spaces between the digits of one integer.

Order of evaluation:

- Unary minus binds tightest, then `*` and `/`, then `+` and `-`.
- Binary operators of the same precedence associate left to right. For example `10 - 4 - 3` is `3` and `100 / 7 / 2` is `7`.
- There are no increment or decrement operators: `2 --3` means `2 - (-3)`.

Division is integer division that truncates toward zero: `7 / 2` is `3`, `-7 / 2` is `-3`, `7 / -2` is `-3`, `-7 / -2` is `3`.

If a division whose divisor is 0 occurs while evaluating an expression, the result of that line is `ERROR`. Every part of an expression is evaluated; there is no short-circuiting. For example `5 / 0 * 0` is `ERROR`.

## Input

Several lines, until end of input. Each line is one expression following the rules above. The input is guaranteed to be syntactically valid and contains no empty lines.

## Output

For each input line print one line: the value of the expression (a decimal integer, with `-` for negative values, and `0` for zero), or `ERROR`.

## Constraints

- At most `1000` lines; each line is at most `10^4` characters long.
- At most `10` unary minus signs appear in a row.
- Every integer in an expression, and the value of every sub-expression that evaluates without error, has absolute value at most `10^18`, so it fits in a signed 64-bit integer.

## Example 1

Input

```
1 + 2 * 3
10 - 4 - 3
7 / 2
-7 / 2
2 * -3
- -3
5 / 0
   42
```

Output

```
7
3
3
-3
-6
3
ERROR
42
```

Explanation: line 1 does the multiplication first. Line 2 goes left to right, `(10 - 4) - 3 = 3`. On line 4 the mathematical result of `-7 / 2` is `-3.5`, which truncates toward zero to `-3`. On line 5 the `-` directly follows `*`, so it is a unary minus. Line 7 divides by zero.

## Example 2

Input

```
3+4*2-10/4
  100 / 7 / 2
7 / -2
2 --3
1 - 2 * 3 + 4 / 0
0 / 5
```

Output

```
9
7
-3
5
ERROR
0
```

Explanation: line 1 has no spaces and evaluates to `3 + 8 - 2 = 9` (`10 / 4` truncates to `2`). Line 2 goes left to right: `100 / 7 = 14`, `14 / 2 = 7`. Line 4 is `2 - (-3)`. Line 5 contains a division by zero, so the whole line is `ERROR`. On line 6 the dividend is 0 and the divisor is not, so the result is `0`.
