# 阶段 2：撤单与拒单

## 撤单

新增一种消息：

```
CANCEL <id>
```

撤销当前挂在簿上的订单 `id`。撤单成功不输出任何内容。注意撤单消息不带品种。

## 拒单

从本阶段起，输入里会出现不合法的消息。对一条消息按下面的顺序检查，命中第一条就输出一行 `REJECT <id> <原因>`，并忽略这条消息：

1. `INVALID`：`INSERT` 的 `price` 或 `qty` 不合法。
   - 合法的 `price`：正的十进制数，整数部分 1 到 12 位，小数部分最多 2 位。`0`、`0.00`、`-1`、`100.123`、`1e2`、`.5` 都不合法。
   - 合法的 `qty`：1 到 10^9 的整数。`0`、`-5`、`1.5` 都不合法。
2. `DUPLICATE_ID`：`INSERT` 的 `id` 在本次运行中曾被一笔成功受理的 `INSERT` 用过，即使那笔订单已经全部成交或被撤销。
3. `UNKNOWN_ID`：`CANCEL` 的 `id` 当前不在任何订单簿上（从未出现、已经全部成交、已经撤销，都算）。

被拒绝的 `INSERT` 不占用 `id`，之后可以用同一个 `id` 重新下单。

除 `price` 和 `qty` 以外，其余字段保证格式正确。

## 输出

```
REJECT <id> <INVALID|DUPLICATE_ID|UNKNOWN_ID>
```

`REJECT` 和 `TRADE` 一样，在处理到那条消息时立即输出。

## 样例 1

输入

```
INSERT 1 AAPL BUY 100 10
INSERT 2 AAPL BUY 100 20
CANCEL 1
CANCEL 1
CANCEL 99
INSERT 3 AAPL SELL 100 5
```

输出

```
REJECT 1 UNKNOWN_ID
REJECT 99 UNKNOWN_ID
TRADE AAPL 100.00 5 3 2
BOOK AAPL
BID 100.00 15 1
```

第一次 `CANCEL 1` 成功。第二次时 #1 已经不在簿上，拒绝。#99 从未出现过，拒绝。#1 撤掉以后，卖单 #3 和 #2 成交。

## 样例 2

输入

```
INSERT 1 AAPL BUY 0 10
INSERT 2 AAPL BUY 100.123 10
INSERT 3 AAPL BUY 100 0
INSERT 4 AAPL BUY 100 -5
INSERT 5 AAPL BUY 1e2 5
INSERT 1 AAPL BUY 100 1
```

输出

```
REJECT 1 INVALID
REJECT 2 INVALID
REJECT 3 INVALID
REJECT 4 INVALID
REJECT 5 INVALID
BOOK AAPL
BID 100.00 1 1
```

第一条 `INSERT 1` 被拒绝，没有占用 id 1，所以最后一条 `INSERT 1` 被正常受理。
