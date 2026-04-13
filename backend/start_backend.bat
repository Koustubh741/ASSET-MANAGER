@echo off
echo ============================================
echo Backend Startup Script (Self-Healing Mode)
echo ============================================
echo.

cd /d D:\ASSET-MANAGER\backend

echo Step 1: Skipping dependency sync (Managed manually)...
echo.

echo Step 2: Verifying critical dependencies...
set PYTHONPATH=.
C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe -c "import sqlalchemy; import asyncpg; import uuid_utils; print('All critical dependencies verified')"
echo.

echo Step 3: Starting backend with self-healing watchdog...
echo Server will run on http://0.0.0.0:8000
echo Watchdog will auto-restart if server becomes unresponsive.
echo.
C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe watchdog_runner.py

pause
