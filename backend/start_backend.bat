@echo off
echo ============================================
echo Backend Startup Script
echo ============================================
echo.

cd /d D:\ASSET-MANAGER\backend

echo Step 1: Installing asyncpg...
C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe -m pip install --upgrade asyncpg
echo.

echo Step 2: Verifying installation...
C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe -c "import asyncpg; print('asyncpg version:', asyncpg.__version__)"
echo.

echo Step 3: Starting backend server...
echo Server will run on http://0.0.0.0:8000
echo Press CTRL+C to stop
echo.
C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
