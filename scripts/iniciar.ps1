param(
  [switch]$SinNavegador
)

$ErrorActionPreference = "Continue"
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz
$Host.UI.RawUI.WindowTitle = "Bitacora Campbell"

function Puerto-Escucha([int]$puerto) {
  $patron = ":{0}\s+\S+\s+LISTENING" -f $puerto
  return [bool](netstat -ano | Select-String -Pattern $patron)
}

function Abrir-App {
  if (-not $SinNavegador) {
    Start-Process "http://localhost:5173/"
  }
}

$nodeDir = Join-Path $env:ProgramFiles "nodejs"
if (Test-Path (Join-Path $nodeDir "npm.cmd")) {
  $env:Path = "$nodeDir;$env:Path"
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "No se encontro npm. Instala Node.js LTS desde https://nodejs.org y vuelve a ejecutar este script."
  exit 1
}

if (-not (Test-Path (Join-Path $raiz ".env"))) {
  Write-Host "Falta el archivo .env en la raiz del proyecto."
  Write-Host "Copia .env.example a .env y completa DATABASE_URL, JWT_SECRET y APP_ADMIN_*."
  exit 1
}

if (-not (Puerto-Escucha 3307)) {
  Write-Host "Aviso: MySQL no parece estar escuchando en el puerto 3307."
  Write-Host "Enciende el servicio de MySQL (Workbench conexion local7) antes de probar."
}

if ((Puerto-Escucha 5173) -and (Puerto-Escucha 3000)) {
  Write-Host "La Bitacora ya esta en marcha."
  Write-Host "Local: http://localhost:5173/"
  Abrir-App
  exit 0
}

if (-not (Test-Path (Join-Path $raiz "node_modules"))) {
  Write-Host "Instalando dependencias (solo la primera vez)..."
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install fallo. Revisa la red y vuelve a intentar."
    exit $LASTEXITCODE
  }
}

Write-Host "Iniciando API (puerto 3000) y web (puerto 5173)..."
Write-Host "Deja esta ventana abierta mientras pruebas. Cierra la ventana para apagar el servidor."
Write-Host "Local: http://localhost:5173/"

if (-not $SinNavegador) {
  Start-Process powershell -ArgumentList "-NoProfile -WindowStyle Hidden -Command `"Start-Sleep -Seconds 10; Start-Process 'http://localhost:5173/'`""
}

npm run dev
exit $LASTEXITCODE
