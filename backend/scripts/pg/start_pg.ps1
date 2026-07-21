# Inicia o PostgreSQL portátil local (cluster em %LOCALAPPDATA%\frota_f8_pg).
$ErrorActionPreference = "Stop"
$PgBase = Join-Path $env:LOCALAPPDATA "frota_f8_pg"
$pg_ctl = Join-Path $PgBase "pgsql\bin\pg_ctl.exe"
$Data   = Join-Path $PgBase "data"
$LogF   = Join-Path $PgBase "pg.log"
& $pg_ctl -D $Data -o "-p 5432" -l $LogF start
Write-Host "PostgreSQL iniciado em localhost:5432"
