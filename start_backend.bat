@echo off
title Smart Fleet - Backend (FastAPI)
echo =========================================
echo   Starting Smart Fleet FastAPI Backend
echo =========================================
cd /d "%~dp0"
call venv\Scripts\activate.bat
python -m uvicorn main:app --reload --port 8000
pause
