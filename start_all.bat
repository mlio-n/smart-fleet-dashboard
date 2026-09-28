@echo off
title Smart Fleet Dashboard Launcher
echo ====================================================
echo   Launching Smart Fleet Dashboard (Backend + Frontend)
echo ====================================================
echo.
cd /d "%~dp0"

echo [1/2] Starting Backend Server (http://localhost:8000)...
start "Smart Fleet - Backend (FastAPI)" cmd /k "cd /d ""%~dp0"" && (if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat) else if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat)) && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend Server (http://localhost:5173)...
start "Smart Fleet - Frontend (Vite)" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo ====================================================
echo   Both services are launching in separate windows!
echo   - Backend API Docs : http://localhost:8000/docs
echo   - Frontend UI       : http://localhost:5173
echo ====================================================
echo.
timeout /t 5
