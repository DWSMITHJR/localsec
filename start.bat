@echo off
echo 🔐 Starting Local Security Vault...
echo.
echo This will start a local web server. Open your browser to http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

REM Try Python first
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Using Python server...
    python -m http.server 8000
    goto :end
)

REM Try Node.js http-server
npx http-server --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Using Node.js http-server...
    npx http-server -p 8000
    goto :end
)

REM Try PHP
php --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Using PHP server...
    php -S localhost:8000
    goto :end
)

echo ❌ No web server found!
echo Please install one of the following:
echo - Python (python -m http.server)
echo - Node.js (npx http-server)
echo - PHP (php -S localhost:8000)
echo.
echo Or simply open index.html directly in your browser.

:end
pause
