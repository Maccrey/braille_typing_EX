@echo off
REM Braille Typing Practice Server Management Script for Windows
REM Usage: scripts\server.bat [start|stop|restart|status|logs]

setlocal enabledelayedexpansion

REM Colors (Windows doesn't support ANSI colors in all terminals, but we'll try)
set "GREEN=[32m"
set "RED=[31m"
set "YELLOW=[33m"
set "BLUE=[34m"
set "NC=[0m"

REM Project root directory
set "PROJECT_ROOT=%~dp0.."
set "LOGS_DIR=%PROJECT_ROOT%\logs"

REM Function to print messages
:print_info
echo [INFO] %~1
goto :eof

:print_success
echo [SUCCESS] %~1
goto :eof

:print_warning
echo [WARNING] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

REM Check if PM2 is installed
:check_pm2
pm2 --version >nul 2>&1
if errorlevel 1 (
    call :print_error "PM2 is not installed. Please install it first:"
    echo npm install -g pm2
    exit /b 1
)
goto :eof

REM Create logs directory if it doesn't exist
:create_logs_dir
if not exist "%LOGS_DIR%" (
    mkdir "%LOGS_DIR%"
    call :print_info "Created logs directory: %LOGS_DIR%"
)
goto :eof

REM Initialize database if needed
:init_database
if not exist "%PROJECT_ROOT%\backend\database.db" (
    call :print_info "Initializing database..."
    cd /d "%PROJECT_ROOT%\backend"
    node init-db.js
    cd /d "%PROJECT_ROOT%"
    call :print_success "Database initialized"
)
goto :eof

REM Get local IP address
:get_local_ip
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "LOCAL_IP=%%a"
    set "LOCAL_IP=!LOCAL_IP: =!"
    goto :got_ip
)
:got_ip
goto :eof

REM Start servers
:start_servers
call :print_info "Starting Braille Typing Practice servers..."

call :create_logs_dir
call :init_database

cd /d "%PROJECT_ROOT%"

REM Start both backend and frontend using PM2
pm2 start ecosystem.config.js --env development

if errorlevel 1 (
    call :print_error "Failed to start servers"
    exit /b 1
)

call :print_success "Servers started successfully!"
echo.
call :print_info "Server Information:"
echo   Local access:
echo     - Backend:  http://localhost:4000
echo     - Frontend: http://localhost:8080
echo.

call :get_local_ip
if defined LOCAL_IP (
    call :print_info "Network access (same WiFi/LAN):"
    echo     - Backend:  http://!LOCAL_IP!:4000
    echo     - Frontend: http://!LOCAL_IP!:8080
    echo.
    call :print_warning "Make sure your firewall allows connections on ports 4000 and 8080"
)

echo.
call :print_info "Use 'pm2 logs' to view logs or 'scripts\server.bat logs'"
call :print_info "Use 'scripts\server.bat status' to check server status"
goto :eof

REM Stop servers
:stop_servers
call :print_info "Stopping Braille Typing Practice servers..."

pm2 stop ecosystem.config.js
pm2 delete ecosystem.config.js

if errorlevel 1 (
    call :print_error "Failed to stop servers"
    exit /b 1
)

call :print_success "Servers stopped successfully!"
goto :eof

REM Restart servers
:restart_servers
call :print_info "Restarting Braille Typing Practice servers..."

pm2 restart ecosystem.config.js

if errorlevel 1 (
    call :print_error "Failed to restart servers"
    exit /b 1
)

call :print_success "Servers restarted successfully!"
call :show_status
goto :eof

REM Show server status
:show_status
call :print_info "Server Status:"
pm2 list
echo.

call :get_local_ip
if defined LOCAL_IP (
    call :print_info "Access URLs:"
    echo   Local:   http://localhost:8080
    echo   Network: http://!LOCAL_IP!:8080
)
goto :eof

REM Show logs
:show_logs
call :print_info "Showing PM2 logs (Ctrl+C to exit)..."
pm2 logs
goto :eof

REM Show help
:show_help
echo Braille Typing Practice Server Management
echo.
echo Usage: %~nx0 [command]
echo.
echo Commands:
echo   start    Start the servers (backend + frontend)
echo   stop     Stop the servers
echo   restart  Restart the servers
echo   status   Show server status and access URLs
echo   logs     Show server logs
echo   help     Show this help message
echo.
echo Examples:
echo   %~nx0 start     # Start servers
echo   %~nx0 status    # Check if servers are running
echo   %~nx0 stop      # Stop servers
goto :eof

REM Main script logic
call :check_pm2

set "COMMAND=%~1"
if "%COMMAND%"=="" set "COMMAND=help"

if "%COMMAND%"=="start" (
    call :start_servers
) else if "%COMMAND%"=="stop" (
    call :stop_servers
) else if "%COMMAND%"=="restart" (
    call :restart_servers
) else if "%COMMAND%"=="status" (
    call :show_status
) else if "%COMMAND%"=="logs" (
    call :show_logs
) else if "%COMMAND%"=="help" (
    call :show_help
) else if "%COMMAND%"=="--help" (
    call :show_help
) else if "%COMMAND%"=="-h" (
    call :show_help
) else (
    call :print_error "Unknown command: %COMMAND%"
    echo.
    call :show_help
    exit /b 1
)