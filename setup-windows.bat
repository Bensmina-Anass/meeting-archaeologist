@echo off
echo === Meeting Archaeologist - Windows Setup ===

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker Desktop is not installed or not in PATH.
    echo Download from: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker Desktop is not running. Please start it and try again.
    pause
    exit /b 1
)

echo Docker is ready.
echo Building and starting all services (db + backend + frontend)...
echo This will take a few minutes on first run.
echo.
docker compose up --build

pause
