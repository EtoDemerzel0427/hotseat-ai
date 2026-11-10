# Interviewer notes: LRU Cache Simulator

## Expected approach

### Stage 1

- Expected solution: **hash map + doubly linked list**. The hash map maps a key to its list node; the list is ordered by time of use (most recently used at one end, least recently used at the other).
  - `GET`: look the key up in the hash map; on a hit, move the node to the "most recent" end. O(1).
  - `PUT`: if the key exists, update the value and move the node to the most recent end; otherwise, if the cache is full, remove the node at the least recent end (and erase it from the hash map), then insert the new node. O(1).
- Stage 1 data is small (Q ≤ 1000, C ≤ 100), so an O(Q·C) solution that scans an array or list also passes. That is acceptable, but steer the candidate towards stating the O(1) design, because stage 2 needs it.
- Built-in tools that may be used: Python `OrderedDict` (`move_to_end`, `popitem(last=False)`), C++ `std::list` + `unordered_map<key, list::iterator>` (move nodes with `splice`). If the candidate goes straight to `OrderedDict`, ask how it is implemented internally, or ask for a hand-written linked list.
- The starter owns all input parsing and output for both stages. It already dispatches `GET`, `PUT`, `DEL` and `RESIZE` to the `LRUCache` methods `get`, `put`, `remove` and `resize`, and prints their results (`remove` returns a bool printed as `1`/`0`; `resize` returns the number to print). In stage 1 the candidate only implements the constructor, `get` and `put`; in stage 2 they fill in `remove` and `resize` without touching I/O. The stub comments on `remove`/`resize` deliberately say nothing about their rules; if asked before stage 2 is revealed, say they belong to a later stage and can be ignored for now.
- The stub return values (`get` → 0, `resize` → -1) are placeholders chosen so the unmodified starter fails every test; they are not hints.

### Stage 2

- `DEL k`: find the node through the hash map, unlink it from the list and erase it from the hash map. O(1).
- `RESIZE c`: update the capacity, then pop from the least recent end `while size > c`. A single call can be O(n), but each key is evicted at most once and each key was inserted by one `PUT`, so it is **amortized O(1)**.
- Total complexity O(Q) amortized, space O(min(Q, C)).
- The O(Q·C) linear approach from stage 1 times out when Q and C are both 2×10^5; it has to be replaced by the O(1) structure. (The bundled tests are small because of the input size limit, so they do not enforce this; ask for the complexity explicitly.)

## Common mistakes and pitfalls

1. **`PUT` on an existing key triggers an eviction**: the code checks "full, so evict" before checking whether the key exists. Updating an existing key in a full cache then wrongly evicts another key (stage 1 example 2 targets exactly this).
2. **`PUT` on an existing key does not refresh the order**: the value is changed but the node is not moved to the most recent end.
3. **`GET` changes state on a miss**, or forgets to refresh the order on a hit.
4. **Eviction removes the list node but not the hash map entry** (or the other way round). A later `GET` of the evicted key returns a stale value or dereferences a dangling pointer. This is why the node has to store the key.
5. **Pointer maintenance errors in the doubly linked list**: removing the head or tail node, or the only node. Sentinel head and tail nodes are recommended.
6. **`RESIZE` evicts only one key** instead of looping until size ≤ c; or forgets to update the capacity itself, so later `PUT`s still use the old capacity.
7. **`RESIZE` prints a negative number when growing**, or performs some operation it should not when growing.
8. **`DEL` does not decrement the size**, so a later `PUT` evicts one key too many.
9. In C++, using an iterator after `list::erase` has invalidated it.
10. Printing an empty line for a command that has no output (`PUT`).

## Standard answers to clarifying questions

- **Does `PUT` on an existing key count as a "use"?** Yes, it makes the key the most recently used.
- **Does a `GET` miss have side effects?** No.
- **Does `DEL` affect the order of other keys?** No.
- **Does `RESIZE` affect the order of the remaining keys?** No, it only evicts from the least recent end.
- **Can the new capacity in `RESIZE` be 0?** No, c ≥ 1 is guaranteed. The initial capacity is also ≥ 1.
- **Can a value be -1?** No, values are between 0 and 10^9, so -1 always means a miss.
- **Range of keys?** 0 to 10^9. They cannot be used directly as array indices; a hash map is needed (or offline coordinate compression).
- **Is the input guaranteed to be valid?** Yes. Only these four commands appear, and the number of commands matches Q.
- **Do we need to consider multithreading or concurrency?** No (can be kept as a follow-up).

## Follow-up questions after each stage

### After stage 1

- What is the time complexity of each operation? Can it be O(1)? Why is a singly linked list not enough? (Removing a node needs its predecessor.)
- Why does the list node have to store the key?
- What do sentinel nodes buy you?
- If you use Python `OrderedDict` / Java `LinkedHashMap`, how do they work internally?

### After stage 2

- What are the worst-case single-call complexity and the amortized complexity of `RESIZE`? Explain the amortized argument.
- How would you add TTL (each key has an expiry time)? Are expired keys removed lazily or cleaned up actively?
- If the policy changes to LFU (evict the least frequently used key, and among equal frequencies the least recently used), how does the data structure change? (A hash map from frequency to a doubly linked list, plus a maintained minFreq.)
- How do you make it thread-safe? What is wrong with a single global lock? How would lock striping or sharding work?
- If values have different sizes and capacity is measured in bytes rather than entries, what has to change?
- Real systems (Redis) use approximate LRU (eviction by sampling). Why?

## Hint ladder

### Stage 1

1. **Light**: "You need two abilities: fast lookup by key, and quickly knowing which element is the least recently used while being able to move any element to the 'newest' position. Is there a structure that gives you both?"
2. **Medium**: "The hash map makes lookup O(1). For the ordering part, which structure can remove an arbitrary node from the middle and insert it at one end in O(1)?"
3. **Heavy**: "Map each key to a node of a doubly linked list with a hash map. The list head is the most recently used, the tail is the least recently used. On access, unlink the node and insert it at the head; on eviction, remove the tail and erase its key from the hash map, which is why the node stores the key."

### Stage 2

1. **Light**: "With your current structure, how long does it take to delete an element whose key you know?"
2. **Medium**: "One `RESIZE` may evict many keys. Think about how many keys can be evicted in total, and how that relates to the number of `PUT`s."
3. **Heavy**: "`DEL` locates the node through the hash map, unlinks it from the list, and erases the hash map entry. `RESIZE` sets the capacity and then keeps evicting the tail until size ≤ c. Each key is evicted at most once, so overall it is amortized O(1)."
