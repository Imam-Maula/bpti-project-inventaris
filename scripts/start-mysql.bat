@echo off
echo [INFO] Menyalakan server MySQL 8.4 Laragon (mode hemat memori)...
taskkill /F /IM mysqld.exe >nul 2>&1
start /b "" "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqld.exe" --defaults-file="C:\laragon\bin\mysql\mysql-8.4.3-winx64\my.ini"
timeout /t 2 /nobreak >nul
echo [SUCCESS] MySQL 8.4 aktif pada port 3306.
