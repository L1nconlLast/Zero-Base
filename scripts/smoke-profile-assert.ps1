param(
  [string]$BaseUrl = $(if ($env:BASE_URL) { $env:BASE_URL } else { "https://zero-base-three.vercel.app" }),
  [string]$Token = $env:TOKEN
)

if (-not $Token) {
  Write-Host "FAIL: TOKEN nao definido. Use: $env:TOKEN='SEU_JWT'" -ForegroundColor Red
  exit 1
}

$headersAuth = @{
  Authorization = "Bearer $Token"
  "Content-Type" = "application/json"
}
$headersJson = @{ "Content-Type" = "application/json" }

$pass = 0
$fail = 0

function Assert-True([bool]$cond, [string]$label) {
  if ($cond) {
    Write-Host "PASS: $label" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "FAIL: $label" -ForegroundColor Red
    $script:fail++
  }
}

function Invoke-Api($method, $url, $headers, $body = '', $contentType = "application/json") {
  try {
    if (-not [string]::IsNullOrWhiteSpace([string]$body)) {
      $resp = Invoke-WebRequest -Method $method -Uri $url -Headers $headers -Body $body -ContentType $contentType -ErrorAction Stop
    } else {
      $resp = Invoke-WebRequest -Method $method -Uri $url -Headers $headers -ErrorAction Stop
    }
    return @{
      ok = $true
      status = [int]$resp.StatusCode
      text = $resp.Content
      json = $(try { $resp.Content | ConvertFrom-Json } catch { '' })
    }
  } catch {
    $status = 0
    $text = ""
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode.value__
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $text = $reader.ReadToEnd()
      } catch {}
    }
    return @{
      ok = $false
      status = $status
      text = $text
      json = $(try { $text | ConvertFrom-Json } catch { '' })
    }
  }
}

Write-Host "== Smoke Assert Profile 2.0 =="
Write-Host "BaseUrl: $BaseUrl"

# 0) Sem token -> 401 esperado
$noAuthLoad = Invoke-Api "GET" "$BaseUrl/api/profile/load" $headersJson
Assert-True ($noAuthLoad.status -eq 401) "profile/load sem token retorna 401"

# 1) LOAD autenticado
$load1 = Invoke-Api "GET" "$BaseUrl/api/profile/load" $headersAuth
Assert-True ($load1.status -eq 200) "profile/load autenticado retorna 200"

# 2) SAVE perfil
$saveBody = (@{
  displayName = "Smoke Profile"
  theme = "system"
  language = "pt"
  density = "normal"
  preferredPeriod = "afternoon"
} | ConvertTo-Json -Compress)

$saveProfile = Invoke-Api "POST" "$BaseUrl/api/profile/save" $headersAuth $saveBody
Assert-True ($saveProfile.status -eq 200) "profile/save retorna 200"

# 3) SAVE notificacoes
$notifBody = (@{
  studyReminders = $true
  unlockedAchievements = $true
  groupActivity = $false
  weeklyReport = $true
} | ConvertTo-Json -Compress)

$saveNotif = Invoke-Api "POST" "$BaseUrl/api/profile/notifications" $headersAuth $notifBody
Assert-True ($saveNotif.status -eq 200) "profile/notifications retorna 200"

# 4) TRACK atividade diaria
$today = (Get-Date).ToString("yyyy-MM-dd")
$trackBody = (@{
  date = $today
  loginCount = 1
} | ConvertTo-Json -Compress)

$track = Invoke-Api "POST" "$BaseUrl/api/activity/track" $headersAuth $trackBody
Assert-True ($track.status -eq 200) "activity/track retorna 200"

# 5) Upload avatar (PNG minimo em memoria)
$pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3Yx0QAAAAASUVORK5CYII="
$pngBytes = [Convert]::FromBase64String($pngBase64)
$tmpFile = Join-Path $env:TEMP "zb-smoke-avatar.png"
[System.IO.File]::WriteAllBytes($tmpFile, $pngBytes)

try {
  $multipart = @{ file = Get-Item $tmpFile }
  $uploadResp = Invoke-WebRequest -Method POST -Uri "$BaseUrl/api/profile/avatar/upload" -Headers @{ Authorization = "Bearer $Token" } -Form $multipart -ErrorAction Stop
  $uploadJson = ''
  try { $uploadJson = $uploadResp.Content | ConvertFrom-Json } catch {}

  $hasUploadJson = $false
  if ($uploadJson) {
    $hasUploadJson = $true
  }

  $hasAvatarUrl = $false
  if ($hasUploadJson) {
    $hasAvatarUrl = -not [string]::IsNullOrWhiteSpace([string]$uploadJson.avatarUrl)
  }

  $uploadOk = ([int]$uploadResp.StatusCode -eq 200) -and $hasUploadJson -and $hasAvatarUrl
  Assert-True $uploadOk "profile/avatar/upload retorna 200 com avatarUrl"
} catch {
  Assert-True $false "profile/avatar/upload retorna 200 com avatarUrl"
}

# 6) LOAD final valida shape principal
$load2 = Invoke-Api "GET" "$BaseUrl/api/profile/load" $headersAuth
Assert-True ($load2.status -eq 200) "profile/load final retorna 200"

$hasHeatmap = $false
if ($load2.json -and $load2.json.heatmap) {
  $hasHeatmap = $load2.json.heatmap -is [System.Array]
}
Assert-True $hasHeatmap "profile/load final inclui heatmap[]"

if (Test-Path $tmpFile) {
  Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Resumo: PASS=$pass FAIL=$fail"
if ($fail -gt 0) { exit 1 } else { exit 0 }
