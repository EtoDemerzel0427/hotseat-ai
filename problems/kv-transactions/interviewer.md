# Interviewer notes: Key-Value Store with Nested Transactions

## Expected approach

### Stage 1

- Two hash maps: `store: key -> value` and `counts: value -> number of keys holding it`.
- `SET`: if the key already has a value, decrement the count of the old value (erase the entry when it reaches 0), then write the new value and increment its count. `DELETE`: same decrement, then erase the key. `GET` and `COUNT` are single lookups.
- All four commands are O(1) average. Space O(keys + distinct values).
- Stage 1 limits are small (Q ≤ 1000), so answering `COUNT` by scanning all keys passes. Accept it, but ask for the complexity and whether it can be O(1); the candidate needs the count map by stage 3 anyway.
- The starter owns all input and output for every stage. It parses all seven commands and dispatches them to a `KVStore` class: `set`, `get`, `delete` (C++: `remove`), `count`, plus `begin()`, `rollback() -> bool`, `commit() -> bool`, which stage 1 never calls. `main` prints `NULL` when `get` returns no value, and prints `NO TRANSACTION` when `rollback`/`commit` return false. When stages 2 and 3 are revealed the candidate only fills in method bodies and never touches I/O. If they ask what the extra methods are for in stage 1, say they belong to a later stage and can be ignored for now.
- The stub defaults are deliberately wrong (`get` returns an empty string, `count` returns -1, `rollback`/`commit` return true), so the unmodified starter fails every test. If the candidate sees empty lines or `-1` in their output, the cause is an unimplemented stub.

### Stage 2

Either of these is acceptable at this stage:

- **Snapshot stack**: on `BEGIN` push a copy of the whole map (and of the count map), on `ROLLBACK` pop and restore, on `COMMIT` clear the stack. Simple and correct; `BEGIN` costs O(keys) time and memory.
- **Undo log** (the target design): one global log of `(key, previous value or "absent")` records plus a stack of marks. `BEGIN` pushes the current log length. Each `SET`/`DELETE` executed while a transaction is open appends the key's previous state before changing it. `ROLLBACK` pops the last mark and replays the log backwards down to that mark, restoring each previous state through the same code path that maintains `counts`. `COMMIT` clears the log and the marks.
- A per-transaction "first old value per key" map is an equivalent variant (one entry per key per transaction, restore order irrelevant). It must only record the **first** old value of a key in each transaction.

### Stage 3

- No new commands. The statement asks for: `BEGIN` and `COUNT` independent of the number of keys, `ROLLBACK` proportional to the modifications being undone, extra memory proportional to modifications in open transactions. That is the undo log plus the count map.
- Complexities with the undo log: `SET`/`GET`/`DELETE`/`COUNT`/`BEGIN` O(1) average; `ROLLBACK` O(modifications in that transaction), amortized O(1) per modification since each log record is replayed at most once; `COMMIT` O(1) amortized (clearing the log is paid for by the appends). Space O(keys + log length).
- A design that does not meet the requirements even though `BEGIN` is O(1): a stack of per-transaction overlay maps where `GET` walks the stack from the innermost transaction outwards. `GET` becomes O(depth), and `COUNT` is hard to keep exact. If the candidate proposes it, ask for the cost of `GET` at depth 10^5.

**The bundled stage 3 tests cannot enforce the time requirement.** Inputs are capped at 20KB. The worst 20KB input for a snapshot implementation (about 1100 keys followed by about 1650 `BEGIN`s) takes roughly 0.1 s in C++ at -O2 for the snapshot version, far below the 3 s limit, and a few milliseconds for the undo log. So stage 3 is discussion-driven: the hidden tests check correctness under deep nesting (depth 500 to 1500, many empty transactions, the same key rewritten at every level, COMMIT after deep nesting), and you judge complexity by reading the code and asking. A candidate who passed stage 2 with snapshots will also pass the stage 3 tests; do not treat the green result as meeting the stage 3 requirement. Ask them to state the cost of `BEGIN` with 10^5 keys and 10^5 open transactions (10^10 entry copies, and the same amount of memory), then have them rewrite it.

If you want a measured demonstration, generate a larger input locally and run the candidate's binary by hand:

```
python3 -c "
n = 20000
c = ['SET k%d v%d' % (i, i % 100) for i in range(n)]
for i in range(n): c += ['BEGIN', 'SET k%d x' % i, 'COUNT x', 'ROLLBACK']
print(len(c)); print('\n'.join(c))" > big.txt
```

On this input (about 1 MB, 10^5 commands) a C++ snapshot implementation with a linear-scan `COUNT` takes about 15 s, and the undo-log implementation about 0.1 s.

## Common mistakes and pitfalls

1. **`COUNT` not updated on overwrite**: `SET` on an existing key increments the new value's count without decrementing the old one.
2. **`SET` to the same value** double-counts, or `DELETE` of a missing key decrements something or creates an entry.
3. **Count entries going negative or lingering at 0**; in C++, `counts[value]` in `COUNT` inserts an entry on every query for an unseen value (harmless for correctness, unbounded memory growth).
4. **Rollback does not restore counts**: the candidate restores `store` directly and forgets `counts`. Restoring through the same internal "apply" routine avoids this.
5. **Rollback restores a deleted-then-absent key as an empty string** instead of removing it; "absent" must be distinguishable from every value (`optional`, a flag, or a sentinel that cannot be a legal value).
6. **Undo log replayed in forward order**: with a key modified several times in one transaction, forward replay leaves an intermediate value. The log must be replayed newest-first (or only the first old value per key per transaction is kept).
7. **Per-transaction map that overwrites the saved old value** on a second modification of the same key in the same transaction.
8. **Undoing a rollback's own writes**: the restore step goes through the public `set`, which appends new records to the log while it is being replayed.
9. **`COMMIT` closes only the innermost transaction**. The statement says it closes all of them; stage 2 example 2 targets this.
10. **`COMMIT` with merging**: candidates who think commit should merge the inner log into the parent do unnecessary work; here commit discards all undo information.
11. **Logging while no transaction is open**: the log grows forever for writes outside transactions. Not a correctness bug; point it out as a memory leak.
12. **Printing something for a successful `ROLLBACK`/`COMMIT`**, or printing `NO TRANSACTION` for `BEGIN`.
13. **Recursion per nesting level** (e.g. a recursive `runTransaction`) overflows the stack at depth 10^5.

## Standard answers to clarifying questions

- **Does `COMMIT` commit only the innermost transaction?** No, it commits and closes all open transactions.
- **Does `ROLLBACK` undo everything?** Only the innermost open transaction.
- **Are uncommitted changes visible to `GET` and `COUNT`?** Yes. There is a single client; reads always see the latest state.
- **`DELETE` on a missing key?** No effect, no output, not an error.
- **`SET` to the value the key already holds?** Allowed; nothing changes.
- **Can a value be the string `NULL`?** No. Keys and values consist of lowercase letters and digits only, 1 to 16 characters.
- **Are values numbers?** No, they are strings; `1` and `01` are different.
- **What happens to transactions still open at the end of input?** Nothing; there is no output for them.
- **Is `ROLLBACK`/`COMMIT` with no open transaction an error that stops the program?** No. Print `NO TRANSACTION` and continue.
- **Does a rolled-back inner transaction affect the outer one?** The outer one stays open with its own modifications intact.
- **Is the input always well-formed?** Yes.
- **Concurrency, durability?** Out of scope; usable as follow-ups.

## Follow-up questions after each stage

### After stage 1

- What is the complexity of each command? If `COUNT` scans, how would you make it O(1)?
- What happens to the count map's size if values are mostly unique? Do you erase entries that drop to 0?
- In C++: what does `operator[]` do on a missing key, and where in your code does that matter?

### After stage 2

- What does `BEGIN` cost in your implementation, in time and memory? What about `ROLLBACK`?
- With N keys and D nested transactions, how much memory do you use?
- If a transaction modifies the same key 1000 times, how much do you store for it?
- Why is it correct for `COMMIT` to simply throw the undo information away?

### After stage 3

- Walk through the amortized argument for `ROLLBACK`.
- Change `COMMIT` so that it closes only the innermost transaction (changes become part of the parent, which can still roll them back). What changes in your design? (Undo log: just pop the mark. Per-transaction maps: merge into the parent, keeping the parent's older value on conflict; discuss small-to-large merging.)
- A real database also has to survive a crash. How does an undo log relate to a write-ahead log? What would you write to disk, and when?
- With several concurrent clients, each in its own transaction, what breaks? (Isolation; uncommitted writes visible to others; talk about locking or MVCC at a high level.)
- How would you support `COUNT` over a range of values, or "number of distinct values"?

## Hint ladder

### Stage 1

1. **Light**: "How long does `COUNT` take as the store grows? Is there something you could maintain while writing so that you do not have to look at every key?"
2. **Medium**: "Keep a second map from value to how many keys hold it. Which commands have to update it?"
3. **Heavy**: "On `SET`, if the key already had a value, decrement that old value's count before incrementing the new one. On `DELETE`, decrement the count of the value being removed. Erase counts that reach 0."

### Stage 2

1. **Light**: "At `ROLLBACK`, what exactly do you need to know in order to get back to the state before the matching `BEGIN`?"
2. **Medium**: "You can either remember the whole state at `BEGIN`, or remember what each modification destroyed. For nested transactions, in what order are transactions closed? Which data structure fits that order?"
3. **Heavy**: "Keep a stack with one entry per open transaction. Simplest version: push a copy of the maps at `BEGIN`, pop and restore at `ROLLBACK`, clear the stack at `COMMIT`. Remember that `counts` has to be restored together with the data."

### Stage 3

1. **Light**: "With 10^5 keys in the store and a transaction that changes one key, how much work do `BEGIN` and `ROLLBACK` do in your code? How much of it is really needed?"
2. **Medium**: "Instead of saving the state at `BEGIN`, save something at each `SET`/`DELETE`. What is the minimum you must record about a modification to be able to reverse it? How do you know where one transaction's records end?"
3. **Heavy**: "Keep one list of `(key, previous value or absent)` records. `BEGIN` pushes the current list length onto a stack. Every modification inside a transaction appends a record before changing the store. `ROLLBACK` pops the length and undoes records from the end of the list back to that length, updating the count map as it goes. `COMMIT` clears both the list and the stack."
