@echo off
setlocal enabledelayedexpansion

echo ================================================================================
echo    SKRIP OTOMASI PENCADANGAN BASIS DATA BPTI UHAMKA (WINDOWS / LARAGON)
echo ================================================================================

cd /d "%~dp0\.."

echo [INFO] Menjalankan pencadangan basis data via Prisma JSON Snapshot Engine...
call pnpm db:backup

if errorlevel 1 (
    echo [ERROR] Pencadangan basis data gagal dieksekusi.
    exit /b 1
)

echo [SUCCESS] Proses pencadangan berkala selesai dengan sukses.
exit /b 0
