# Mock Interview

本地运行的面试练习平台。面试官由 Claude 担任（通过 Claude Agent SDK，使用本机 `claude` 的登录态，走订阅额度，不需要 API key）。

## 运行

```bash
npm install
npm start
```

打开 http://localhost:4477 。需要本机已安装并登录 Claude Code，以及 `clang++`、`python3`。

## 功能

- Monaco 编辑器，C++20 / Python 3 语法高亮
- 本地编译运行：自定义输入运行，或跑题目的公开和隐藏用例（⌘/Ctrl + Enter）
- 面试官全程观察：提问时、跑测试时、写一段停下来时、长时间卡住时会被叫醒，由它决定开口还是沉默
- 分阶段放出需求
- 界面、题面、面试官支持中文和英文
- 完整改动历史记录在 `sessions/<id>/events.jsonl`（每次按键的增量、快照、运行、对话、面试官的私下笔记）
- 结束后根据改动历史生成复盘 `review.md`
- 题目工作台：和 Claude 对话打磨题目，它直接改文件并校验；也可以手动放进 `problems/`

## 语音

面试房间的对话栏里有两个开关：

- **麦克风**：浏览器录音，按停顿切成一句一句，发给本机的 whisper.cpp 转写（模型常驻内存，一句话约 1 秒）。转写时会把题目名和当前代码里的标识符作为提示词，技术名词和变量名认得更准。转写结果作为“候选人说的话”交给面试官，由它判断是自言自语还是在对它说话。
- **朗读**：面试官的话用 edge-tts 合成后播放。edge-tts 是微软的在线服务，需要联网。朗读期间不收音。

准备工作：

```bash
brew install whisper-cpp
mkdir -p models && curl -L -o models/ggml-large-v3-turbo-q5_0.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin
```

麦克风需要在 Chrome 或 Safari 里打开页面并允许权限。建议戴耳机，避免扬声器的声音被录进去。

## 语言

界面右上角切换中文 / English。开始面试时单独选择面试语言，它决定题面、面试官说话和复盘用的语言。

## 面试官的行为

规则写在 `prompts/interviewer.md` 里，每场面试开始时作为系统提示加载：什么触发条件下开口、什么时候保持沉默、提示怎么分级、阶段完成后怎么追问。想调整面试官，改这个文件即可，下一场生效。每道题自己的追问和分级提示写在该题的 `interviewer.md` 里。

## 题目工作台

首页每道题右下角的“编辑”进入工作台；“新题”一栏会建一份草稿并进入同一个界面。

- 左边是这道题的所有文件，中间可以直接编辑（⌘S 保存），题面可以切换预览。
- 右边和 Claude 对话。它可以直接读写这道题目录里的文件，改完会自己运行校验。你手动改的内容它下一轮会重新读取。
- “校验”会用参考解重新生成期望输出，并检查双语题面齐全、起始代码能编译且在每个用例上正常退出。
- 草稿目录名以 `_draft-` 开头，校验通过后点“发布到题库”才会出现在可以面试的题目里。

出题的规则写在 `prompts/author.md` 里，例如“起始代码负责全部输入输出”“后续阶段的命令提前接好”。想改变出题的标准，改这个文件。

## 题目目录格式

```
problems/<slug>/
  problem.json       { "title": { "zh", "en" }, "difficulty", "minutes", "stages": ["statement", "stage2"] }
  statement.zh.md    第一阶段题面（中文）
  statement.en.md    第一阶段题面（英文）
  stage2.zh.md / stage2.en.md   后续阶段，每个阶段两种语言各一份
  starter.cpp        起始代码（完整程序，读 stdin 写 stdout）
  starter.py
  solution.py        参考解（或 solution.cpp）
  inputs.json        [{ "name": { "zh", "en" }, "stage", "hidden", "input" }]
  interviewer.md     面试官备注（英文）：期望解法、常见坑、追问、分级提示
  tests.json         自动生成：用参考解对 inputs.json 跑出期望输出
```

加题或改题之后运行校验，它会重新生成 `tests.json`，并检查双语题面齐全、起始代码能编译运行：

```bash
node scripts/check-problem.mjs <slug>
```

## 可调参数（环境变量）

| 变量 | 默认 | 含义 |
|---|---|---|
| `PORT` | 4477 | 端口 |
| `LIVE_MODEL` | sonnet | 实时面试官用的模型 |
| `DEEP_MODEL` | opus | 出题和复盘用的模型 |
| `IDLE_MS` | 30000 | 改动后停顿多久叫醒面试官 |
| `STALL_MS` | 240000 | 多久没有改动算卡住 |
| `MIN_GAP_MS` | 45000 | 两次非紧急事件的最小间隔 |
| `CXX` | /usr/bin/clang++ | C++ 编译器 |
| `TTS_VOICE_EN` | en-US-AvaNeural | 英文朗读音色（edge-tts 的音色名） |
| `TTS_VOICE_ZH` | zh-CN-YunxiNeural | 中文朗读音色 |
| `WHISPER_MODEL` | models/ggml-large-v3-turbo-q5_0.bin | Whisper 模型路径 |
| `VOICE_GAP_MS` | 6000 | 两次只由说话触发的事件的最小间隔 |
