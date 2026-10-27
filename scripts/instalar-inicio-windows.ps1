$ErrorActionPreference = "Stop"
$script = Join-Path $PSScriptRoot "iniciar.ps1"
$raiz = Split-Path -Parent $PSScriptRoot
$carpeta = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
$atajo = Join-Path $carpeta "Bitacora-Campbell.lnk"

if (-not (Test-Path $script)) {
  throw "No se encontro $script"
}

$shell = New-Object -ComObject WScript.Shell
$acceso = $shell.CreateShortcut($atajo)
$acceso.TargetPath = "powershell.exe"
$acceso.Arguments = "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$script`""
$acceso.WorkingDirectory = $raiz
$acceso.WindowStyle = 1
$acceso.Description = "Inicia la API y la web de Bitacora Campbell al encender el PC"
$acceso.Save()

Write-Host "Listo. Al encender Windows se abrira una ventana y el servidor."
Write-Host "Atajo: $atajo"
Write-Host "Para quitarlo: powershell -File scripts\quitar-inicio-windows.ps1"
