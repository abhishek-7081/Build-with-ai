@echo off
echo ===================================================
echo Starting Delhi Civic Service Navigator...
echo ===================================================
echo.

echo Launching Backend Express Server in a new window...
start cmd /k "echo Starting Backend... && cd backend && npm run dev"

echo Launching Frontend React App (Vite) in a new window...
start cmd /k "echo Starting Frontend... && cd frontend && npm run dev"

echo.
echo ===================================================
echo All services launched!
echo Backend API is running on: http://localhost:5000
echo Frontend Dev Server is running on: http://localhost:5173
echo ===================================================
pause
