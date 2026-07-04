# Peekaboo

Peekaboo 是一个运行在终端里的桌宠原型。它用像素眼睛表达情绪，用户直接输入自然语言即可聊天；当模型判断当前问题确实需要查看屏幕时，会在本轮对话中主动调用截图工具。

## 特性

- 终端 TUI 桌宠界面
- 像素眼睛表情：`idle`、`smile`、`happy`、`curious`、`thinking`、`surprised`、`sleepy`、`sad`
- agent loop：模型可以在一个回合中调用工具、读取工具结果、继续回答
- `observe_screen`：按需截取当前桌面，并把截图作为视觉输入交给模型
- `set_mood`：模型主动切换桌宠情绪，支持延迟切换
- `get_mood`：模型查看当前情绪
- 不做后台监控，不读取剪贴板、文件或浏览器历史

## 启动

推荐直接运行：

```powershell
.\aboo.cmd
```

也可以使用 npm 脚本：

```powershell
npm.cmd run dev
```

如果 PowerShell 阻止运行 `npm.ps1`，请使用 `npm.cmd`。

## 配置

复制 `.env.example` 为 `.env`，然后填写：

```env
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-4o-mini
PET_NAME=Peekaboo
```

如果使用 OpenAI 官方接口，`OPENAI_BASE_URL` 可以留空。

如果使用 OpenAI-compatible 服务，`OPENAI_BASE_URL` 填基础路径，不要填完整的 `/chat/completions` 地址。例如智谱 BigModel 可以填：

```env
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

如果没有配置 `OPENAI_API_KEY`，应用仍然可以启动，但只能本地回声，无法真正理解截图内容。

## 使用

启动后直接输入自然语言，按 Enter 发送。

```text
你今天心情怎么样？
你看看我屏幕上现在是什么？
5 秒后变开心一点
```

退出：

```text
Ctrl+C
```

Peekaboo 没有 `chat`、`observe`、`mood happy`、`clear`、`quit` 这类用户命令。情绪和截图都由 agent 根据上下文自行决定。

## 工具说明

`observe_screen` 只会在当前用户回合中执行一次，不会后台定时截图。

`set_mood` 是内部工具，用户不需要手动输入。模型可以设置情绪，也可以设置延迟，例如几秒后切换到 `happy`。

`get_mood` 是内部工具，用于让模型查询当前情绪。

## 许可证

本项目使用 MIT License，详见 [LICENSE](./LICENSE)。
