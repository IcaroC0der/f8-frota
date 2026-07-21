# Configura um PostgreSQL PORTÁTIL local (sem Docker, sem admin).
# IMPORTANTE: o cluster fica em %LOCALAPPDATA%\frota_f8_pg porque o PostgreSQL
# no Windows NÃO aceita caracteres não-ASCII no caminho (a pasta "Laboratório"
# quebra o initdb). Idempotente.
$ErrorActionPreference = "Stop"

$Backend = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # ...\backend
$PgBase  = Join-Path $env:LOCALAPPDATA "frota_f8_pg"               # caminho ASCII
$BinDir  = Join-Path $PgBase "pgsql\bin"
$Data    = Join-Path $PgBase "data"
$LogF    = Join-Path $PgBase "pg.log"
$Port    = 5432
New-Item -ItemType Directory -Force -Path $PgBase | Out-Null

# Fontes possíveis do zip / binários já extraídos
$zipLocal = Join-Path $Backend ".pglocal\pg.zip"
$extractedLocal = Join-Path $Backend ".pglocal\pgsql"

# 1) Garantir binários em caminho ASCII
if (-not (Test-Path (Join-Path $BinDir "initdb.exe"))) {
  if (Test-Path (Join-Path $extractedLocal "bin\initdb.exe")) {
    Write-Host "[1/4] Movendo binários já extraídos para caminho ASCII..."
    Move-Item $extractedLocal (Join-Path $PgBase "pgsql")
  } elseif (Test-Path $zipLocal) {
    Write-Host "[1/4] Extraindo binários para caminho ASCII..."
    Expand-Archive -Path $zipLocal -DestinationPath $PgBase -Force
  } else {
    throw "Binários não encontrados. Baixe o zip primeiro (veja README)."
  }
} else { Write-Host "[1/4] Binários já em caminho ASCII." }

$initdb = Join-Path $BinDir "initdb.exe"
$pg_ctl = Join-Path $BinDir "pg_ctl.exe"
$psql   = Join-Path $BinDir "psql.exe"

# 2) initdb (auth 'trust' apenas em localhost; uso de desenvolvimento)
if (-not (Test-Path (Join-Path $Data "PG_VERSION"))) {
  Write-Host "[2/4] Inicializando cluster (initdb)..."
  & $initdb -D $Data -U postgres --encoding=UTF8 --locale=C --auth-local=trust --auth-host=trust | Out-Null
} else { Write-Host "[2/4] Cluster já inicializado." }

# 3) Subir o servidor
$status = & $pg_ctl -D $Data status 2>$null | Out-String
if ($status -notmatch "server is running") {
  Write-Host "[3/4] Subindo o servidor na porta $Port..."
  & $pg_ctl -D $Data -o "-p $Port" -l $LogF start | Out-Null
  Start-Sleep -Seconds 3
} else { Write-Host "[3/4] Servidor já está rodando." }

# 4) Criar role 'frota' e banco 'frota_f8'
Write-Host "[4/4] Criando role e banco (se necessário)..."
$sql = "DO `$`$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='frota') THEN CREATE ROLE frota LOGIN PASSWORD 'frota' CREATEDB; END IF; END `$`$;"
& $psql -p $Port -U postgres -d postgres -v ON_ERROR_STOP=1 -c $sql | Out-Null
$dbExists = & $psql -p $Port -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='frota_f8'"
if ("$dbExists".Trim() -ne "1") {
  & $psql -p $Port -U postgres -d postgres -c "CREATE DATABASE frota_f8 OWNER frota" | Out-Null
}

Write-Host ""
Write-Host "PostgreSQL portátil pronto em localhost:$Port  (cluster em $PgBase)"
Write-Host "  DATABASE_URL=postgresql+psycopg://frota:frota@localhost:$Port/frota_f8"
