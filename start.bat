@echo off
echo Starting MCP AI Workbench...
echo.

REM Use the new Node.js cleanup script for better port management
echo 🧹 Running advanced port cleanup...
node scripts/cleanup-ports.js

if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Port cleanup had issues, but continuing...
)

echo.
echo ✅ Starting servers...
npm run dev