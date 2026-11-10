# What the starter gives the candidate

The starter owns all I/O for all three stages. It reads lines, skips blank ones, and tokenizes each line into `Number` (with value), `Name` (with text), `+ - * / ( )`, and a final `End` sentinel; spaces are gone and identifiers are lexed maximally. Every `-` arrives as a plain `Minus` token: deciding unary vs binary is the candidate's job. The starter also detects the `name = ...` form at the start of a line and calls `Calculator.assign(name, tokens_after_eq)`; every other line goes to `Calculator.evaluate(tokens)`. Both return a value or `nullopt`/`None`, and the starter prints the value or `ERROR`. One `Calculator` instance lives for the whole input, so the candidate may add state to it (they must add the variable storage themselves in stage 3).

So the candidate never writes lexing, line splitting or printing; they write the precedence/associativity evaluation over a token list, error propagation, and (stage 3) variable storage plus the assignment rules. `assign` is visible from stage 1 with an empty body; if the candidate asks about it before stage 3, say it is used in a later part and can be left alone for now. The unmodified starter prints `ERROR` for every line and passes no test.

# Expected approach

Two standard solutions; either is fine.

- **Recursive descent.** One function per precedence level over the given tokens: `expr := term (('+'|'-') term)*`, `term := unary (('*'|'/') unary)*`, `unary := '-' unary | primary`, `primary := number | name | '(' expr ')'`. Left associativity comes from the loops (not from right recursion). Stage 2 adds one branch to `primary`; stage 3 adds the `Name` branch, a variable map in `Calculator`, and the body of `assign`. The `End` token lets the loops peek without bounds checks.
- **Two stacks (shunting-yard).** A value stack and an operator stack; before pushing a binary operator, reduce while the operator on top has precedence >= the incoming one (>=, not >, to get left associativity). `(` is pushed and acts as a barrier; `)` reduces down to it. Unary minus is detected by context: a `-` is unary when it is the first token or follows an operator or `(`. It is pushed as a separate prefix operator with the highest precedence and must not trigger reductions when pushed.

For stage 1 alone a single pass that keeps "sum so far" and "current product term" is acceptable, but ask how it would extend to parentheses before the candidate invests in it.

Complexity: O(L) time per line of length L for both approaches. Space O(L) for tokens, or O(depth) if the candidate parses directly from the string.

Errors: carry the error as a flag / `optional` / exception. An exception is simplest. If the candidate returns a sentinel value such as `-1` or `LLONG_MIN` to mean error, push back: those are legal results.

# Common mistakes

- Division: Python `//` floors (`-7 // 2 == -4`); the statement wants truncation (`-3`). `int(a / b)` is also wrong: float division loses precision above 2^53, and values go up to 10^18. C++ `/` already truncates.
- Right-recursive grammar (`expr := term '-' expr`) gives right associativity: `10 - 4 - 3` becomes `9`. Same for `100 / 7 / 2`.
- Shunting-yard with `>` instead of `>=` when comparing precedence: same associativity bug.
- Unary minus: handling it only at the start of the token list, so `2 * -3`, `2 - -3`, `- -3` or `-(3 + 4)` fail. Folding a `Minus` followed by a `Number` into a negative literal breaks `5 -3` (must be `2`).
- Treating two consecutive `Minus` tokens as something special. `2 --3` is `5`.
- Evaluating all `*` before all `/` (or all `+` before `-`) instead of left to right: `8 / 2 * 3` must be `12`, not `1`.
- Ignoring the `End` token or reading past it; forgetting that in stage 3 `assign` receives only the tokens after `=`.
- Printing `-0`: `-0`, `0 * -5`, `-1 / 2` must print `0`. Only a problem for solutions that track sign separately or use floats.
- Division by zero: crashing (SIGFPE in C++, `ZeroDivisionError` in Python) instead of printing `ERROR`; printing `ERROR` but leaving the parser in a bad state so the rest of the line or the next line is misparsed. A zero divisor that is itself a computed value (`4 / (2 - 2)`, `1 / -0`) is often missed when the check is done on literals only.
- `int` instead of 64-bit in C++.
- Stage 2: Python's default recursion limit is 1000. Depth is at most 100, so a normal recursive descent (3-4 frames per level) fits, but a candidate whose grammar has many levels should know the limit exists.
- Stage 3: a failed assignment must not create or overwrite the variable (`x = 1 / 0` when `x` was 5 leaves it at 5). Writing the variable before evaluating the right-hand side breaks `x = x + 1`.
- Stage 3: names are case-sensitive (`a` and `A` are different keys). Lexing and assignment detection are done by the starter, so these are not candidate mistakes here.
- Stage 3 in C++: `map[name]` on a lookup silently inserts 0 for an undefined variable instead of reporting `ERROR`.

# Standard answers to clarifying questions

- Unary plus: does not appear.
- Tabs or other whitespace: only spaces.
- Empty lines / lines with only spaces: do not appear.
- Invalid syntax (unbalanced parentheses, two numbers in a row, trailing operator): does not appear. Input is always well formed.
- Overflow: guaranteed not to happen; every literal and every successfully evaluated sub-expression is within ±10^18. `LLONG_MIN / -1` cannot occur.
- Leading zeros: do not appear.
- Is `0 / 0` an error: yes. `0 / 5` is `0`.
- If one part divides by zero but would be multiplied by zero: still `ERROR`; no short-circuit.
- Stage 3: can a variable be named like a keyword: there are no keywords. Chained assignment `a = b = 1`: does not appear. Assignment inside parentheses: does not appear.
- Stage 3: an expression line that is just a name (`x`) prints its value, or `ERROR` if unassigned.

# Follow-ups

After stage 1:
- Time and space complexity?
- How does your code decide whether a `-` is unary or binary?
- What would you change to add a right-associative operator such as `^`?

After stage 2:
- What is the maximum recursion depth of your solution on `((((...))))` with depth d? What happens for d = 10^6, and how would you make it safe (explicit stack)?
- If the input could be malformed, where would you detect each kind of error and what would you report?

After stage 3:
- Suppose the same expression is evaluated millions of times with different variable values. How would you avoid re-parsing? (Build an AST or compile to postfix / bytecode once, evaluate many times.)
- How would you add functions such as `max(a, b)`?
- How would you detect overflow instead of relying on the guarantee? (`__builtin_mul_overflow`, or pre-checks against the limits.)

# Hint ladder

1. "Take `2 + 3 * 4 - 5`. When you read the `+`, can you apply it right away? What do you need to know first?"
2. "Think of the expression as a sum of terms, where each term is a product of factors, and each factor may have minus signs in front. What does a factor look like once parentheses exist?"
3. "Write one function per level: `expr` loops over terms separated by `+`/`-`, `term` loops over factors separated by `*`/`/`, `factor` handles leading `-`, a number, or `(` expr `)`. Each function consumes tokens from a shared position and returns a value."
