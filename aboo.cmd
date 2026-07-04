@echo off
setlocal

cd /d "%~dp0"
node --no-deprecation --import tsx src/main.tsx
