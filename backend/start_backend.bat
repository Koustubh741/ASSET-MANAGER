@echo off
echo ============================================
echo Backend Startup Script
echo ============================================
echo.

cd /d D:\ASSET-MANAGER\backend

echo Step 1: Synchronizing dependencies from requirements.txt...
C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe -m pip install -r requirements.txt
echo.

echo Step 2: Verifying critical dependencies...
C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe -c "import asyncpg; import apscheduler; print('✅ All critical dependencies verified')"
echo.

echo Step 3: Starting backend server...
echo Server will run on http://0.0.0.0:8000
echo Press CTRL+C to stop
echo.
C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
