@echo off
echo ===================================================
echo        CareClaim AI - System Startup               
echo ===================================================

echo [1/3] Checking dependencies...
call npm install

echo.
echo [2/3] Checking environment variables...
if not exist "backend\.env" (
    echo [WARNING] backend\.env not found! Copying from backend\.env.example...
    copy "backend\.env.example" "backend\.env" > nul
    echo Please remember to fill in your API keys in backend\.env
)

if not exist "frontend\.env" (
    echo [WARNING] frontend\.env not found! Copying from frontend\.env.example...
    copy "frontend\.env.example" "frontend\.env" > nul
    echo Please remember to fill in your API keys in frontend\.env
)

echo.
echo [3/3] Booting Services (Backend + Frontend)...
echo The frontend will be available at http://localhost:5173
echo.
call npm run dev
