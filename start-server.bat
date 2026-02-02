@echo off
echo ====================================
echo QR 출석 체크 서버 시작
echo ====================================
echo.
echo 서버 주소:
echo - 내 컴퓨터: http://localhost:8000
echo - 다른 기기: http://[내IP주소]:8000
echo.
echo IP 주소 확인 중...
ipconfig | findstr /i "IPv4"
echo.
echo 서버를 중지하려면 Ctrl+C를 누르세요
echo ====================================
echo.
cd /d "%~dp0"
python -m http.server 8000
