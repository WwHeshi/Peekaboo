# Peekaboo

Peekaboo 是一个很小的终端桌宠原型。它住在你的终端里，用两只大眼睛表达情绪，并且只有在你明确输入 `observe` 时才会截取整个桌面进行观察。

当前范围：

- 终端 TUI 桌宠表情
- 基于眼睛形状的情绪状态
- 手动 `observe` 命令，用于截取全桌面并理解画面
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
OPENAI_MODEL=gpt-4o-mini
PET_NAME=Peekaboo
```

如果没有配置 `OPENAI_API_KEY`，应用仍然可以启动，但 `observe` 只会验证截图是否成功，不会理解截图内容。

## 命令

```text
observe        截取全桌面，并让 Peekaboo 观察
chat 你好      和 Peekaboo 聊天
mood happy     手动切换情绪
clear          清空当前会话
quit           退出
```

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
