param(
  [string]$WpPath = "C:\Users\Owner\Local Sites\masterboard-local\app\public",
  [string]$SshHost = "",
  [string]$RemoteWpPath = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$pluginSource = Join-Path $repoRoot "wordpress-plugin\masterboard-candidatura"
$wpBat = Join-Path $repoRoot "tools\wp-cli\wp.bat"

if (-not (Test-Path $pluginSource)) {
  throw "Plugin não encontrado em $pluginSource"
}

if ($SshHost -and $RemoteWpPath) {
  Write-Host "Enviando plugin para DreamHost via SCP..."
  scp -r $pluginSource "${SshHost}:${RemoteWpPath}/wp-content/plugins/"
  Write-Host "Ativando plugin no servidor..."
  ssh $SshHost "cd $RemoteWpPath && wp plugin activate masterboard-candidatura"
  exit 0
}

if (-not (Test-Path $WpPath)) {
  throw "WordPress local não encontrado em $WpPath"
}

$pluginTarget = Join-Path $WpPath "wp-content\plugins\masterboard-candidatura"
Write-Host "Copiando plugin para $pluginTarget"
if (Test-Path $pluginTarget) {
  Remove-Item $pluginTarget -Recurse -Force
}
Copy-Item $pluginSource $pluginTarget -Recurse

if (Test-Path $wpBat) {
  Write-Host "Ativando plugin localmente..."
  & $wpBat --path="$WpPath" plugin activate masterboard-candidatura 2>&1
}

Write-Host "Plugin instalado. Configure em wp-config.php:"
Write-Host "define('MASTERBOARD_SUPABASE_URL', '...');"
Write-Host "define('MASTERBOARD_SUPABASE_SERVICE_ROLE_KEY', '...');"
