@echo off
echo ============================================
echo Backend Startup Script
echo ============================================
echo.

cd /d D:\ASSET-MANAGER\backend

echo Step 1: Synchronizing dependencies from requirements.txt...
:: Only run full pip if requirements.txt was modified recently (simulated by --no-cache-dir or just moving fast)
C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe -m pip install --quiet -r requirements.txt
echo.

echo Step 2: Verifying critical dependencies...
set PYTHONPATH=.
C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe -c "import sqlalchemy; import asyncpg; print('✅ All critical dependencies verified')"
echo.

echo Step 3: Starting backend server...
echo Server will run on http://0.0.0.0:8000
echo.
C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
