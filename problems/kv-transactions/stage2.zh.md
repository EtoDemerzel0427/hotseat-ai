# 支持嵌套事务的键值存储（阶段 2）

## 新需求

使用方希望能把一组修改作为一个整体撤销，所以要加入事务，并且事务可以嵌套。

阶段 1 的四种命令的行为和输出保持不变。新增三种命令：

- `BEGIN`：开启一个新事务。已有未结束的事务时，新事务嵌套在最内层事务里面。没有输出。
- `ROLLBACK`：撤销最内层的未结束事务中所做的全部修改，并结束这个事务。撤销之后，存储的内容与对应的 `BEGIN` 执行之前完全相同。成功时没有输出。当前没有未结束的事务时，输出 `NO TRANSACTION`，不做任何修改。
- `COMMIT`：让**所有**未结束的事务中的修改永久生效，并结束所有这些事务（不只是最内层的一个）。成功时没有输出。当前没有未结束的事务时，输出 `NO TRANSACTION`。

补充说明：

- 事务中的修改立即可见：`GET` 和 `COUNT` 总是反映到目前为止执行过的所有修改，包括未结束的事务中的修改。
- 不在任何事务中执行的 `SET` 和 `DELETE` 直接永久生效。
- 一个事务可以不包含任何修改。
- 输入结束时可以还有未结束的事务，不需要做任何处理。

## 输入格式

第一行一个整数 `Q`。

接下来 `Q` 行，每行一条命令：`SET key value`、`GET key`、`DELETE key`、`COUNT value`、`BEGIN`、`ROLLBACK` 或 `COMMIT`。

## 输出格式

对每条 `GET` 和 `COUNT` 命令输出一行结果。对每条在没有未结束事务时执行的 `ROLLBACK` 或 `COMMIT`，输出一行 `NO TRANSACTION`。其他命令不产生输出。

## 数据范围

- `1 ≤ Q ≤ 2000`
- 任意时刻未结束的事务不超过 100 层

## 样例 1

输入：

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

输出：

```
NULL
2
1
NO TRANSACTION
```

解释：

- 外层事务把 `a` 改成 2，内层事务删除了 `a`，所以第一个 `GET a` 输出 `NULL`。
- 第一个 `ROLLBACK` 撤销内层事务，`a` 恢复为 2。
- 第二个 `ROLLBACK` 撤销外层事务，`a` 恢复为 1。
- 第三个 `ROLLBACK` 执行时已经没有未结束的事务，输出 `NO TRANSACTION`。

## 样例 2

输入：

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

输出：

```
NO TRANSACTION
2
NO TRANSACTION
5
5
```

解释：

- `COMMIT` 执行时有两层未结束的事务，两层的修改都永久生效，两个事务都结束。
- 之后的 `ROLLBACK` 没有事务可以撤销，输出 `NO TRANSACTION`，`a` 和 `b` 不受影响，所以 `COUNT 5` 输出 2。
- 第二个 `COMMIT` 执行时没有未结束的事务，输出 `NO TRANSACTION`。
