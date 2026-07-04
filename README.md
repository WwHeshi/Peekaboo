# Peekaboo

Peekaboo is a tiny TUI desktop pet prototype. It lives in your terminal, shows emotions with two big eyes, and only captures your full desktop when you explicitly type `observe`.

Current scope:

- TUI pet face with eye-based moods
- Manual `observe` command for full desktop screenshot understanding
- Simple chat command
- No OCR
- No background monitoring
- No clipboard, file, or browser history access

## Start

```bash
npm.cmd run dev
```

If PowerShell blocks `npm.ps1`, use `npm.cmd` as shown above.

## Config

Edit `.env` in this folder:

```env
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4o-mini
PET_NAME=Peekaboo
```

Without `OPENAI_API_KEY`, the app can still start, but `observe` only verifies screenshot capture and will not understand the image.

## Commands

```text
observe        capture the full desktop and let Peekaboo observe it
chat hello     chat with Peekaboo
mood happy     switch mood manually
clear          clear current session
quit           exit
```

## Mood Eyes

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
