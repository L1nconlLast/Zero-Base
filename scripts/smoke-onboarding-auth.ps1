# Smoke test autenticado para onboarding streak (PowerShell)
# Uso:
#   $env:BASE_URL = "https://zero-base-three.vercel.app"
#   $env:TOKEN = "SEU_JWT_DO_USUARIO"
#   .\scripts\smoke-onboarding-auth.ps1

param(
  [string]$BaseUrl = $env:BASE_URL,
  [string]$Token = $env:TOKEN,
  [string]$StreakLastDay = "2026-03-17",
  [int]$StreakDays = 1
)

if (-not $BaseUrl) {
  $BaseUrl = "https://zero-base-three.vercel.app"
}

if (-not $Token) {
  Write-Error "Defina TOKEN via parametro -Token ou variavel de ambiente TOKEN."
  exit 1
}

$headers = @{
  Authorization = "Bearer $Token"
  "Content-Type" = "application/json"
}

function Show-Step {
  param([string]$Title)
  Write-Host ""
  Write-Host "== $Title ==" -ForegroundColor Cyan
}

Show-Step "1) LOAD inicial"
try {
  $load1 = Invoke-RestMethod -Method GET -Uri "$BaseUrl/api/onboarding/load" -Headers $headers
  $load1 | ConvertTo-Json -Depth 10
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Yellow
}

Show-Step "2) SAVE (streakDays=$StreakDays, streakLastDay=$StreakLastDay)"
$body = @{
  streakDays = $StreakDays
  streakLastDay = $StreakLastDay
} | ConvertTo-Json

try {
  $save1 = Invoke-RestMethod -Method POST -Uri "$BaseUrl/api/onboarding/save" -Headers $headers -Body $body
  $save1 | ConvertTo-Json -Depth 10
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Yellow
}

Show-Step "3) LOAD apos SAVE"
try {
  $load2 = Invoke-RestMethod -Method GET -Uri "$BaseUrl/api/onboarding/load" -Headers $headers
  $load2 | ConvertTo-Json -Depth 10
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Yellow
}

Show-Step "4) SAVE repetido no mesmo dia"
try {
  $save2 = Invoke-RestMethod -Method POST -Uri "$BaseUrl/api/onboarding/save" -Headers $headers -Body $body
  $save2 | ConvertTo-Json -Depth 10
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Yellow
}

Show-Step "5) LOAD final"
try {
  $load3 = Invoke-RestMethod -Method GET -Uri "$BaseUrl/api/onboarding/load" -Headers $headers
  $load3 | ConvertTo-Json -Depth 10
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Smoke finalizado." -ForegroundColor Green
