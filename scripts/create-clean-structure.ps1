$dirs = @(
  "docs",
  "docs/01_product",
  "docs/02_engineering",
  "docs/03_release",
  "docs/04_research",
  "docs/99_archive",
  "supabase",
  "supabase/migrations",
  "supabase/functions",
  "supabase/docs",
  "vercel",
  "scripts",
  "templates"
)

foreach ($dir in $dirs) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Write-Host "Estrutura criada com sucesso."
