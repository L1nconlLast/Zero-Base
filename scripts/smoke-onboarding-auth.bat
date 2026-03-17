@echo off
setlocal enabledelayedexpansion

if "%BASE_URL%"=="" set BASE_URL=https://zero-base-three.vercel.app
if "%TOKEN%"=="" (
  echo [ERRO] Defina TOKEN antes de rodar.
  echo Exemplo:
  echo   set TOKEN=SEU_JWT_DO_USUARIO
  exit /b 1
)

echo.
echo == 1) LOAD inicial ==
curl -s -i "%BASE_URL%/api/onboarding/load" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json"

echo.
echo == 2) SAVE (streakDays=1, streakLastDay=2026-03-17) ==
curl -s -i -X POST "%BASE_URL%/api/onboarding/save" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  --data "{\"streakDays\":1,\"streakLastDay\":\"2026-03-17\"}"

echo.
echo == 3) LOAD apos SAVE ==
curl -s -i "%BASE_URL%/api/onboarding/load" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json"

echo.
echo == 4) SAVE repetido no mesmo dia ==
curl -s -i -X POST "%BASE_URL%/api/onboarding/save" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  --data "{\"streakDays\":1,\"streakLastDay\":\"2026-03-17\"}"

echo.
echo == 5) LOAD final ==
curl -s -i "%BASE_URL%/api/onboarding/load" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json"

echo.
echo Smoke finalizado.
endlocal
