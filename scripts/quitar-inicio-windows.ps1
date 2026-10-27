$atajo = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\Bitacora-Campbell.lnk"
if (Test-Path $atajo) {
  Remove-Item $atajo -Force
  Write-Host "Se quito el arranque automatico al encender Windows."
} else {
  Write-Host "No habia atajo de inicio. Nada que quitar."
}
