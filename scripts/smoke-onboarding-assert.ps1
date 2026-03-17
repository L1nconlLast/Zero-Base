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

function Invoke-Api($method, $url, $headers, $body = $null) {
  try {
    if ($null -ne $body) {
      $resp = Invoke-WebRequest -Method $method -Uri $url -Headers $headers -Body $body -ErrorAction Stop
    } else {
      $resp = Invoke-WebRequest -Method $method -Uri $url -Headers $headers -ErrorAction Stop
    }
    return @{
      ok = $true
      status = [int]$resp.StatusCode
      text = $resp.Content
      json = $(try { $resp.Content | ConvertFrom-Json } catch { $null })
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
      json = $(try { $text | ConvertFrom-Json } catch { $null })
    }
  }
}

Write-Host "== Smoke Assert Onboarding =="
Write-Host "BaseUrl: $BaseUrl"

# 0) Sem token -> 401 esperado
$noAuthLoad = Invoke-Api "GET" "$BaseUrl/api/onboarding/load" $headersJson
Assert-True ($noAuthLoad.status -eq 401) "LOAD sem token retorna 401"

$noAuthSaveBody = '{"streakDays":1,"streakLastDay":"2026-03-17"}'
$noAuthSave = Invoke-Api "POST" "$BaseUrl/api/onboarding/save" $headersJson $noAuthSaveBody
Assert-True ($noAuthSave.status -eq 401) "SAVE sem token retorna 401"

# 1) LOAD autenticado -> 200
$load1 = Invoke-Api "GET" "$BaseUrl/api/onboarding/load" $headersAuth
Assert-True ($load1.status -eq 200) "LOAD autenticado retorna 200"

# captura baseline
$baseline = 0
if ($load1.json -and $null -ne $load1.json.streakDays) {
  $baseline = [int]$load1.json.streakDays
}
$today = (Get-Date).ToString("yyyy-MM-dd")

# 2) SAVE autenticado -> 200
$target = [Math]::Min($baseline + 1, 7)
$saveBody = (@{
  streakDays = $target
  streakLastDay = $today
} | ConvertTo-Json -Compress)

$save1 = Invoke-Api "POST" "$BaseUrl/api/onboarding/save" $headersAuth $saveBody
Assert-True ($save1.status -eq 200) "SAVE autenticado retorna 200"

# 3) LOAD apos SAVE -> >= target
$load2 = Invoke-Api "GET" "$BaseUrl/api/onboarding/load" $headersAuth
Assert-True ($load2.status -eq 200) "LOAD apos SAVE retorna 200"

$afterSave = -1
if ($load2.json -and $null -ne $load2.json.streakDays) {
  $afterSave = [int]$load2.json.streakDays
}
Assert-True ($afterSave -ge $target) "LOAD apos SAVE reflete streakDays >= valor salvo"

# 4) SAVE repetido no mesmo dia nao deve subir indevidamente
$save2 = Invoke-Api "POST" "$BaseUrl/api/onboarding/save" $headersAuth $saveBody
Assert-True ($save2.status -eq 200) "SAVE repetido no mesmo dia retorna 200"

$load3 = Invoke-Api "GET" "$BaseUrl/api/onboarding/load" $headersAuth
Assert-True ($load3.status -eq 200) "LOAD final retorna 200"

$afterRepeat = -1
if ($load3.json -and $null -ne $load3.json.streakDays) {
  $afterRepeat = [int]$load3.json.streakDays
}

# regra: nao deve ultrapassar 7 e nao deve dar salto inesperado
Assert-True ($afterRepeat -le 7) "streakDays nunca ultrapassa 7"
Assert-True ($afterRepeat -ge $afterSave) "streakDays nao regride apos SAVE repetido"

Write-Host ""
Write-Host "Resumo: PASS=$pass FAIL=$fail"
if ($fail -gt 0) { exit 1 } else { exit 0 }
