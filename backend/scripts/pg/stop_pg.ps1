# Para o PostgreSQL portátil local (cluster em %LOCALAPPDATA%\frota_f8_pg).
$ErrorActionPreference = "Stop"
$PgBase = Join-Path $env:LOCALAPPDATA "frota_f8_pg"
$pg_ctl = Join-Path $PgBase "pgsql\bin\pg_ctl.exe"
$Data   = Join-Path $PgBase "data"
& $pg_ctl -D $Data stop -m fast
Write-Host "PostgreSQL parado."
