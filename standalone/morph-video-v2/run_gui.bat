@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo The local environment has not been prepared yet.
  echo Run setup.bat first.
  pause
  exit /b 1
)

".venv\Scripts\pythonw.exe" morph_video_gui.py
if errorlevel 1 (
  echo The application stopped unexpectedly. Trying again with a visible console...
  ".venv\Scripts\python.exe" morph_video_gui.py
  pause
)
