# Stage 3: Variables

The calculator now supports variables. Each input line has one of two forms:

- An expression: as before, print its value.
- An assignment `name = expr`: evaluate the expression on the right, store the result in the variable `name`, and print that value.

A variable name consists of letters, digits and underscores, does not start with a digit, and is case-sensitive. A variable name can be used as an operand in an expression (including the right-hand side of an assignment); its value is whatever the variable currently holds. Variables persist across lines, and a later assignment overwrites the earlier value. Any number of spaces (including none) may surround `=`. A line contains at most one `=`, and it only ever appears right after a variable name at the start of the line.

Error handling:

- If an expression uses a variable that has not been assigned yet, the result of that line is `ERROR`.
- If the right-hand side of an assignment is `ERROR` (division by zero, or use of an unassigned variable), the line prints `ERROR` and no assignment happens: a variable that already had a value keeps it, and a variable that had none stays unassigned.
- In a statement like `x = x + 1`, the `x` on the right uses the value from before the assignment; if `x` was unassigned, the result is `ERROR`.

## Constraints

- Variable names are at most `20` characters long; there are at most `1000` distinct variables.
- Variable values, like all other sub-expression values, have absolute value at most `10^18`.
- Everything else is the same as in stage 2.

## Example 1

Input

```
x = 5
y = x * 2 + 1
x + y
z
x = x - 10
y / x
w = 1 / 0
w
```

Output

```
5
11
16
ERROR
-5
-2
ERROR
ERROR
```

Explanation: `z` on line 4 was never assigned. Line 5 uses the old value of `x`, 5, on the right; afterwards `x` is `-5`. Line 6 is `11 / -5`, which truncates toward zero to `-2`. The right-hand side of line 7 fails, so `w` is not assigned and using `w` on line 8 is still `ERROR`.

## Example 2

Input

```
a=10
A = a * a
a_2 = (A - a) / -4
a + A + a_2
a = a / (A - 100)
a
b = b + 1
b = 0
b = b + 1
```

Output

```
10
100
-22
88
ERROR
10
ERROR
0
1
```

Explanation: `a` and `A` are two different variables. Line 3 is `90 / -4`, which truncates toward zero to `-22`. The right-hand side of line 5 divides by zero, so no assignment happens and `a` on line 6 is still `10`. The right-hand side of line 7 uses `b` before it has been assigned.
