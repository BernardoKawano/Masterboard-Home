$ErrorActionPreference = "Stop"
$siteDir = Join-Path (Split-Path $PSScriptRoot -Parent) "site"
$outputFile = Join-Path $siteDir ".env.wordpress.local"
$projectRef = "bnpogxplejvmpwfygvks"
$supabaseUrl = "https://$projectRef.supabase.co"

Push-Location $siteDir
try {
  $keysFile = Join-Path $siteDir "supabase\.temp\api-keys.json"
  $null = New-Item -ItemType Directory -Force -Path (Split-Path $keysFile -Parent)
  npx supabase projects api-keys --project-ref $projectRef -o json *> $keysFile
  $keys = Get-Content $keysFile -Raw | ConvertFrom-Json
  $serviceRole = ($keys | Where-Object { $_.name -eq "service_role" } | Select-Object -First 1).api_key

  if (-not $serviceRole) {
    throw "Nao foi possivel obter a service_role key via Supabase CLI."
  }

  $wpConfig = @"
// Masterboard candidatura (gerado por tools/generate-wp-supabase-config.ps1)
define('MASTERBOARD_SUPABASE_URL', '$supabaseUrl');
define('MASTERBOARD_SUPABASE_SERVICE_ROLE_KEY', '$serviceRole');
"@

  $envFile = @"
# Gerado automaticamente. NAO commitar.
SUPABASE_URL=$supabaseUrl
SUPABASE_SERVICE_ROLE_KEY=$serviceRole
"@

  Set-Content -Path $outputFile -Value $envFile -Encoding UTF8

  $snippetFile = Join-Path $PSScriptRoot "wordpress-wp-config.snippet.php"
  Set-Content -Path $snippetFile -Value $wpConfig -Encoding UTF8

  Write-Host "Projeto: Masterboard ($projectRef)"
  Write-Host "URL: $supabaseUrl"
  Write-Host ""
  Write-Host "Arquivos gerados:"
  Write-Host " - $outputFile"
  Write-Host " - $snippetFile"
  Write-Host ""
  Write-Host "Cole o conteudo de wordpress-wp-config.snippet.php no wp-config.php do WordPress."
}
finally {
  Pop-Location
}
