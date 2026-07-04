# Peekaboo

Peekaboo 是一个很小的终端桌宠原型。它住在你的终端里，用两只大眼睛表达情绪，并且可以像 agent 一样在当前对话需要时调用 `observe_screen` 工具截取桌面进行观察。

当前范围：

- 终端 TUI 桌宠表情
- 基于眼睛形状的情绪状态
- agent loop：模型可在一个回合中调用工具，再基于工具结果继续回答
- `observe_screen` 工具，用于在当前用户交互中截取全桌面并理解画面
- 简单聊天命令
- 不做 OCR
- 不做后台监控
- 不读取剪贴板、文件或浏览器历史

## 启动

```bash
npm.cmd run dev
```

如果 PowerShell 阻止运行 `npm.ps1`，请使用上面的 `npm.cmd`。

## 配置

编辑项目根目录下的 `.env`：

```env
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-4o-mini
PET_NAME=Peekaboo
```

如果你使用 OpenAI 官方接口，`OPENAI_BASE_URL` 可以留空。  
如果你使用中转站或 OpenAI-compatible 服务，把它填成对应接口地址，例如：

```env
OPENAI_BASE_URL=https://api.openai.com/v1
```

如果没有配置 `OPENAI_API_KEY`，应用仍然可以启动，但屏幕工具只会验证截图是否成功，不会理解截图内容。

## 命令

```text
chat 你好      和 Peekaboo 聊天
mood happy     手动切换情绪
clear          清空当前会话
quit           退出
```

普通聊天中，如果模型判断当前问题需要查看屏幕，会主动请求 `observe_screen` 工具。这个工具只会在本轮用户交互中执行，不会后台定时截图。

## 情绪眼睛

```text
idle       O     O
smile      -     -
happy      ^     ^
curious    o     O
thinking   .     .
surprised  @     @
sleepy     _     _
sad        T     T
```
