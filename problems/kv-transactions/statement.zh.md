# 支持嵌套事务的键值存储（阶段 1）

## 背景

你要实现一个内存中的键值存储，通过命令来读写。键和值都是字符串。这一阶段只需要支持基本的读写和按值统计。

## 规则

存储初始为空。依次处理 `Q` 条命令：

- `SET key value`：把键 `key` 的值设为 `value`。键已存在时覆盖原来的值。没有输出。
- `GET key`：输出键 `key` 当前的值；键不存在时输出 `NULL`。
- `DELETE key`：删除键 `key`。键不存在时什么都不做。没有输出。
- `COUNT value`：输出当前值等于 `value` 的键的个数；没有这样的键时输出 `0`。

## 输入格式

第一行一个整数 `Q`，表示命令条数。

接下来 `Q` 行，每行一条命令，命令名和参数之间用一个空格分隔。

`key` 和 `value` 都是由小写字母和数字组成的字符串，长度在 1 到 16 之间。键和值的比较是按字符串逐字符比较，例如 `1` 和 `01` 是不同的值。

## 输出格式

对每条 `GET` 和 `COUNT` 命令，按顺序输出一行结果。`SET` 和 `DELETE` 不产生输出。

## 数据范围

- `1 ≤ Q ≤ 1000`

## 样例 1

输入：

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

输出：

```
2
10
NULL
1
```

解释：

- `a` 和 `b` 的值都是 `10`，所以 `COUNT 10` 输出 2，`GET a` 输出 10。
- 删除 `a` 之后，`GET a` 输出 `NULL`，值为 `10` 的键只剩 `b`，`COUNT 10` 输出 1。

## 样例 2

输入：

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

输出：

```
0
1
NULL
2
```

解释：

- `x` 的值先是 `foo`，随后被覆盖为 `bar`。此时没有键的值是 `foo`，`COUNT foo` 输出 0，`COUNT bar` 输出 1。
- `DELETE y` 时 `y` 不存在，什么都不做，`GET y` 输出 `NULL`。
- `SET y bar` 之后 `x` 和 `y` 的值都是 `bar`，`COUNT bar` 输出 2。
