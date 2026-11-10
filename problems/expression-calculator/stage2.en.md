# Stage 2: Parentheses

Expressions may now contain round parentheses `(` and `)`. The inside of a pair of parentheses is a complete expression; its value is computed first and then used as one operand of the surrounding expression. Parentheses can be nested arbitrarily and may be preceded by unary minus, e.g. `-(3 + 4)` has the value `-7`.

Parentheses are guaranteed to be balanced and never empty. All other rules are the same as in stage 1; a division by zero inside parentheses still makes the whole line `ERROR`.

## Constraints

- The nesting depth of parentheses is at most `100`.
- Everything else is the same as in stage 1.

## Example 1

Input

```
2 * (3 + 4)
-(3 + 4)
((((5))))
(1 + 2) * (3 - 7) / 5
( 8 - 3 ) / -( 1 + 1 )
10 / (5 - 5)
2 - (3 - (4 - (5 - 6)))
```

Output

```
14
-7
5
-2
-2
ERROR
4
```

Explanation: line 4 is `3 * (-4) / 5 = -12 / 5`, which truncates toward zero to `-2`. Line 5 is `5 / -2`, which truncates toward zero to `-2`. On line 6 the parenthesised value is 0 and it is used as a divisor, so the result is `ERROR`.

## Example 2

Input

```
((2 + 3) * (4 - 1) - 1) / 7
-(-(-2))
1 - (2 - 3) - (4 - 5)
6 / (1 - 3) * (2 + 1)
(1 + 2) / (3 - 3) + (4 * 5)
```

Output

```
2
-2
3
-9
ERROR
```

Explanation: line 1 is `(5 * 3 - 1) / 7 = 14 / 7`. Line 3 is `1 - (-1) - (-1)`. Line 4 goes left to right: `6 / -2 = -3`, then times `3`. On line 5 the divisor `(3 - 3)` is 0.
