param(
  [string]$ProjectRef = "vcsgapomoeucqpsbcuvj",
  [string]$AccessToken,
  [string]$DbPassword
)

$ErrorActionPreference = "Stop"

function Invoke-Supabase {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command
  )

  Write-Host "`n> $Command" -ForegroundColor Cyan
  Invoke-Expression $Command

  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao executar: $Command"
  }
}

$workspaceRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $workspaceRoot

Write-Host "Workspace: $workspaceRoot" -ForegroundColor DarkCyan
Write-Host "ProjectRef: $ProjectRef" -ForegroundColor DarkCyan

if ([string]::IsNullOrWhiteSpace($AccessToken) -and [string]::IsNullOrWhiteSpace($DbPassword)) {
  Write-Host "\nNenhuma credencial foi enviada como parâmetro." -ForegroundColor Yellow
  Write-Host "Escolha um método:"
  Write-Host "1) Personal Access Token (sbp_...)"
  Write-Host "2) Senha do postgres"

  $method = Read-Host "Digite 1 ou 2"

  if ($method -eq "1") {
    $AccessToken = Read-Host "Cole o token sbp_..."
  }
  elseif ($method -eq "2") {
    $securePassword = Read-Host "Senha do postgres" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    try {
      $DbPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
  }
  else {
    throw "Método inválido. Use 1 ou 2."
  }
}

if (-not [string]::IsNullOrWhiteSpace($AccessToken)) {
  $env:SUPABASE_ACCESS_TOKEN = $AccessToken
  Invoke-Supabase "npx supabase link --project-ref $ProjectRef"
  Invoke-Supabase "npx supabase db push"
}
elseif (-not [string]::IsNullOrWhiteSpace($DbPassword)) {
  $encodedPassword = [System.Uri]::EscapeDataString($DbPassword)
  $dbUrl = "postgresql://postgres:$encodedPassword@db.$ProjectRef.supabase.co:5432/postgres"
  Invoke-Supabase "npx supabase db push --db-url `"$dbUrl`""
}
else {
  throw "Nenhuma credencial válida foi fornecida."
}

Write-Host "\nMigrações aplicadas com sucesso." -ForegroundColor Green
Write-Host "Próximo passo: executar no SQL Editor o arquivo supabase/verification/verify_mentor_messages.sql" -ForegroundColor Green
