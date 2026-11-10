# 支持嵌套事务的键值存储（阶段 3）

## 新需求

这个存储要用到线上：存储里的键会很多，事务会嵌套得很深，`BEGIN` 会非常频繁，`COUNT` 也会被频繁调用。

命令和输出格式与阶段 2 完全相同，没有新增命令。变化的是数据规模和对每条命令开销的要求：

- `BEGIN` 的开销不能随存储中键的数量增长。
- `COUNT` 的开销不能随存储中键的数量增长。
- `ROLLBACK` 的开销只能与被撤销的事务中所做的修改次数成正比。
- `SET`、`GET`、`DELETE` 的平均开销为常数。
- 额外占用的内存只能与未结束的事务中所做的修改次数成正比。

## 数据范围

- `1 ≤ Q ≤ 2×10^5`
- 存储中同时存在的键最多 `10^5` 个
- 未结束的事务最多 `10^5` 层

## 关于本阶段的测试

平台上单个测试输入的大小有限，所以本阶段的测试检查的是深层嵌套和大量事务下的正确性，不靠运行时间区分实现方式。提交通过后，请向面试官说明你的实现中每条命令的时间复杂度和整体的空间占用，面试官会按上面的要求来评估。

## 样例 1

输入：

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

输出：

```
0
v2
1
v0
```

解释：

- 外层事务把 `k` 依次改成 `v1`、`v2`。内层事务又把 `k` 改成 `v1`、删除、再改成 `v3`。此时没有键的值是 `v1`，`COUNT v1` 输出 0。
- 第一个 `ROLLBACK` 撤销内层事务的三次修改，`k` 恢复为进入内层事务之前的 `v2`，`COUNT v2` 输出 1。
- 第二个 `ROLLBACK` 撤销外层事务，`k` 恢复为 `v0`。

## 样例 2

输入：

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

输出：

```
4
3
1
NULL
NO TRANSACTION
```

解释：

- 三层事务各新增了一个值为 `x` 的键，加上最初的 `a`，`COUNT x` 输出 4。
- 撤销最内层后剩 3 个。再连续撤销两层后只剩 `a`，`COUNT x` 输出 1，`GET b` 输出 `NULL`。
- 最后一个 `ROLLBACK` 执行时已经没有未结束的事务，输出 `NO TRANSACTION`。
