# 阶段 2：查询当前用量

运营同学希望能随时查询某个用户当前的用量。新增一种命令：

```
STAT t user
```

输出一行整数：用户 `user` 在区间 `(t - W, t]` 内被放行的请求数。`STAT` 本身不算请求。`t` 与 `REQ` 的时刻一起保持单调不减。

其余规则与阶段 1 相同。

## 样例 1

输入

```
10 2 6
REQ 1 alice
REQ 2 alice
STAT 5 alice
STAT 11 alice
STAT 11 bob
REQ 12 alice
```

输出

```
ALLOW
ALLOW
2
1
0
ALLOW
```

解释：时刻 5 时 alice 的两个请求都在窗口 `(-5, 5]` 内，输出 2。时刻 11 时窗口是 `(1, 11]`，时刻 1 的请求已经滑出，输出 1。bob 没有发过请求，输出 0。时刻 12 时窗口 `(2, 12]` 内 alice 已没有放行的请求，所以放行。

## 样例 2

输入

```
5 2 4
STAT 0 ghost
REQ 1 a
STAT 1 ghost
STAT 1 a
```

输出

```
0
ALLOW
0
1
```

解释：查询一个从未发过请求的用户，输出 0。
