@echo off
chcp 65001 >nul
title DutyFlow - Khoi dong he thong

echo =======================================================
echo          DUTYFLOW - KHOI DONG HE THONG
echo =======================================================
echo.
echo [1/3] Dang kiem tra Docker daemon...

docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [Docker chua bat] Dang tu dong kich hoat Docker daemon trong nen...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    echo Dang cho Docker engine khoi dong (khoang 15-25 giay)...
    :WAIT_DOCKER
    timeout /t 3 /nobreak >nul
    docker info >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo ... Docker dang khoi dong, vui long doi giay lat ...
        goto WAIT_DOCKER
    )
    echo [OK] Docker engine da san sang!
) else (
    echo [OK] Docker engine dang hoat dong tot.
)

echo.
echo [2/3] Dang build va chay he thong (MySQL, Redis, Duty App)...
docker compose up -d --build

echo.
echo [3/3] Kiem tra trang thai cac container:
docker compose ps

echo.
echo =======================================================
echo HE THONG DA KHOI DONG THANH CONG!
echo - Backend API:  http://localhost:8080
echo - Frontend Web: http://localhost:5173
echo.
echo Tai khoan mau test 3 Role (Mat khau chung: kyta@1234):
echo 1. Quan tri vien: admin
echo 2. To truong:     leader01 (Tao lich, phan cong)
echo 3. Nhan vien:     NV01 (Ca cua toi)
echo =======================================================
pause
