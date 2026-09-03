@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Setting up Weatherly for the first run...
    python -m venv .venv
    if errorlevel 1 (
        echo Could not create the Python environment.
        pause
        exit /b 1
    )
    ".venv\Scripts\python.exe" -m pip install -r requirements.txt
    if errorlevel 1 (
        echo Could not install the required packages.
        pause
        exit /b 1
    )
)

start "Weatherly server" /D "%~dp0" ".venv\Scripts\python.exe" -m flask --app app run
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5000"
endlocal
