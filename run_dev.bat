@echo off
echo ========================================
echo   TempMail Development Server Starter
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate

echo.
echo Installing/updating dependencies...
pip install -q -r requirements.txt

echo.
echo Creating necessary directories...
if not exist "storage\" mkdir storage
if not exist "storage\attachments\" mkdir storage\attachments
if not exist "data\" mkdir data

echo.
echo Starting Backend Server...
start "TempMail Backend" cmd /k "venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
cd frontend
if not exist "node_modules\" (
    echo Installing frontend dependencies...
    call npm install
)
start "TempMail Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ========================================
echo   Servers are starting...
echo ========================================
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:8000/docs
echo ========================================
echo.
echo Press any key to exit (servers will continue running)...
pause >nul

