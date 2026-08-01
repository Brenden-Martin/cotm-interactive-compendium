@echo off
setlocal
cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" goto install

where py >nul 2>nul
if not errorlevel 1 (
  py -3 -m venv .venv
  goto install
)

where python >nul 2>nul
if not errorlevel 1 (
  python -m venv .venv
  goto install
)

if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m venv .venv
  goto install
)

echo Python 3.11 or newer was not found.
echo Install Python from https://www.python.org/downloads/windows/ and run this file again.
pause
exit /b 1

:install
if not exist ".venv\Scripts\python.exe" (
  echo The Python environment could not be created.
  pause
  exit /b 1
)

echo Installing the local renderer dependencies...
".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 goto failed
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto failed

echo.
echo Version 2 setup complete. Double-click run_gui.bat to start.
pause
exit /b 0

:failed
echo.
echo Setup did not finish. Check the internet connection and try again.
pause
exit /b 1
