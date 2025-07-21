@echo off
echo 🚀 Starting Auto-Deployment to Firebase ^& Railway...
echo.

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installing Firebase CLI...
    npm install -g firebase-tools
)

REM Check if Railway CLI is installed
railway --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installing Railway CLI...
    npm install -g @railway/cli
)

echo 🔐 Please make sure you're logged in to both platforms:
echo    Firebase: firebase login
echo    Railway: railway login
echo.

set /p choice="Are you logged in to both Firebase and Railway? (y/n): "
if /i not "%choice%"=="y" (
    echo Please login first:
    echo   firebase login
    echo   railway login
    exit /b 1
)

echo 🔥 Deploying Frontend to Firebase...
firebase deploy --only hosting

if %errorlevel% equ 0 (
    echo ✅ Frontend deployed successfully to Firebase!
) else (
    echo ❌ Frontend deployment failed!
    exit /b 1
)

echo.
echo 🚆 Deploying Backend to Railway...
cd backend
railway deploy

if %errorlevel% equ 0 (
    echo ✅ Backend deployed successfully to Railway!
) else (
    echo ❌ Backend deployment failed!
    exit /b 1
)

cd ..

echo.
echo 🎉 Deployment Complete!
echo.
echo 📱 Your Admin Panel is now live at:
echo    Frontend: https://your-project.web.app/admin.html
echo    Backend: https://your-app.up.railway.app/api
echo    Password: admin123
echo.
echo 🔗 Update your Firebase project URL in the admin panel if needed.

pause
