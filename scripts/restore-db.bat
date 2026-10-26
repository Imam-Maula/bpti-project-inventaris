@echo off
setlocal
chcp 65001 >nul

echo ================================================================================
echo    PEMULIHAN BASIS DATA INVENTARIS BPTI UHAMKA (RESTORE)
echo ================================================================================
echo.
echo PERINGATAN: Skrip ini akan menyinkronkan kembali basis data dari arsip snapshot JSON.
echo.

if "%~1"=="" (
    echo Menggunakan berkas snapshot cadangan terbaru...
    call pnpm tsx scripts/restore-db.ts
) else (
    echo Menggunakan berkas snapshot: %~1
    call pnpm tsx scripts/restore-db.ts "%~1"
)

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SELESAI] Basis data berhasil dipulihkan secara utuh.
) else (
    echo.
    echo [GAGAL] Terjadi kesalahan saat memulihkan basis data.
)

pause
