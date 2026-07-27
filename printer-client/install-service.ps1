#Requires -Version 5.1
param(
    [string]$ServiceName = "ImpresionCliente"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function Fail($mensaje) {
    Write-Host $mensaje -ForegroundColor Red
    exit 1
}

# 1. Administrador (requerido para registrar un servicio de Windows)
$esAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Fail "Este instalador tiene que correrse como Administrador. Abri PowerShell como Administrador y volve a ejecutarlo."
}

# 2. nssm.exe (no se descarga automaticamente: hay que colocarlo a mano)
$nssmCmd = Get-Command nssm -ErrorAction SilentlyContinue
if ($nssmCmd) {
    $nssmPath = $nssmCmd.Source
} else {
    $nssmLocal = Join-Path $root "tools\nssm.exe"
    if (Test-Path $nssmLocal) {
        $nssmPath = $nssmLocal
    } else {
        Fail "No se encontro nssm.exe. Descargalo de https://nssm.cc/download y coloca nssm.exe en $root\tools\nssm.exe (o agregalo al PATH). Despues volve a correr este script."
    }
}
Write-Host "nssm encontrado: $nssmPath" -ForegroundColor Green

# 3. Si el servicio ya existe, lo detenemos y quitamos primero: mientras esta registrado
# puede mantener bloqueado el python.exe del venv e impedir que se recree.
if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    Write-Host "El servicio '$ServiceName' ya existe, se detiene para reinstalarlo..."
    & $nssmPath stop $ServiceName | Out-Null
    & $nssmPath remove $ServiceName confirm | Out-Null
}

# 4. Python (evitando el alias de Microsoft Store, que no funciona dentro de un servicio de Windows)
function Resolver-Python {
    $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
    if ($pyLauncher) {
        $resuelto = & $pyLauncher.Source -3 -c "import sys; print(sys.executable)" 2>$null
        if ($LASTEXITCODE -eq 0 -and $resuelto -and (Test-Path $resuelto) -and $resuelto -notmatch '\\WindowsApps\\') {
            return $resuelto
        }
    }

    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCmd -and $pythonCmd.Source -notmatch '\\WindowsApps\\') {
        return $pythonCmd.Source
    }

    return $null
}

$pythonReal = Resolver-Python
if (-not $pythonReal) {
    Fail "Solo se encontro el alias de Python de Microsoft Store, que no funciona dentro de un servicio de Windows. Instala Python desde https://www.python.org/downloads/ (NO desde la Microsoft Store) y volve a correr este script. Si ya lo instalaste y el problema persiste, desactiva el alias en Configuracion > Aplicaciones > Configuracion avanzada de aplicaciones > Alias de ejecucion de aplicaciones (python.exe / python3.exe)."
}
Write-Host "Python encontrado: $pythonReal" -ForegroundColor Green

# 5. Entorno virtual
$venvPath = Join-Path $root ".venv"
$pyvenvCfg = Join-Path $venvPath "pyvenv.cfg"
if ((Test-Path $pyvenvCfg) -and (Get-Content $pyvenvCfg -Raw) -match "WindowsApps") {
    Write-Host "El entorno virtual existente fue creado con el alias de Microsoft Store; se recrea con la instalacion real de Python." -ForegroundColor Yellow
    Remove-Item $venvPath -Recurse -Force
}
if (-not (Test-Path $venvPath)) {
    Write-Host "Creando entorno virtual..."
    & $pythonReal -m venv $venvPath
}
$pythonExe = Join-Path $venvPath "Scripts\python.exe"
$pipExe = Join-Path $venvPath "Scripts\pip.exe"

# 6. Dependencias
Write-Host "Instalando dependencias..."
& $pipExe install -q -r (Join-Path $root "requirements.txt")
if ($LASTEXITCODE -ne 0) {
    Fail "Fallo la instalacion de dependencias (pip). Revisa el error de arriba."
}

# 7. Impresoras disponibles (informativo). OJO: el servicio corre como LocalSystem,
# que NO comparte la "impresora predeterminada" del usuario interactivo -- por eso
# el nombre se toma de PRINTER_NAME en .env, nunca del default de esta sesion.
$impresorasJson = & $pythonExe -c "import json, win32print; print(json.dumps([p[2] for p in win32print.EnumPrinters(2)]))" 2>$null
if ($LASTEXITCODE -eq 0) {
    $impresoras = $impresorasJson | ConvertFrom-Json
    Write-Host "Impresoras disponibles en esta PC: $($impresoras -join ', ')" -ForegroundColor Yellow
} else {
    Fail "No se pudo consultar las impresoras instaladas. Verifica que haya al menos una impresora instalada en esta PC."
}

# 8. .env
$envPath = Join-Path $root ".env"
$envExamplePath = Join-Path $root ".env.example"
if (-not (Test-Path $envPath)) {
    Copy-Item $envExamplePath $envPath
    Write-Host ""
    Write-Host "Se creo $envPath a partir de .env.example." -ForegroundColor Yellow
    Write-Host "Completa PRINT_SERVER_WS_URL, PRINTER_SERVICE_TOKEN y PRINTER_NAME (nombre EXACTO de la lista de arriba) y volve a correr este script." -ForegroundColor Yellow
    exit 0
}
$envContenido = Get-Content $envPath -Raw
if ($envContenido -match "PRINTER_SERVICE_TOKEN=changeme") {
    Write-Host "ADVERTENCIA: PRINTER_SERVICE_TOKEN todavia tiene el valor de prueba 'changeme'. Cambialo por un token real antes de un despliegue en produccion." -ForegroundColor Yellow
}
if ($envContenido -match "PRINTER_NAME=(.*)") {
    $printerName = $Matches[1].Trim()
    if (-not $printerName) {
        Fail "PRINTER_NAME esta vacio en $envPath. Completalo con uno de los nombres listados arriba (comparacion exacta, mayusculas incluidas)."
    }
    if ($impresoras -notcontains $printerName) {
        Fail "PRINTER_NAME='$printerName' no coincide con ninguna impresora instalada ($($impresoras -join ', ')). Corregilo en $envPath."
    }
    Write-Host "PRINTER_NAME configurado correctamente: $printerName" -ForegroundColor Green
} else {
    Fail "Falta PRINTER_NAME en $envPath. Completalo con el nombre EXACTO de una de las impresoras listadas arriba."
}

# 9. Registrar y arrancar el servicio
$scriptPath = Join-Path $root "client.py"
$logPath = Join-Path $root "service.log"

& $nssmPath install $ServiceName $pythonExe $scriptPath
& $nssmPath set $ServiceName AppDirectory $root
& $nssmPath set $ServiceName Start SERVICE_AUTO_START
& $nssmPath set $ServiceName AppStdout $logPath
& $nssmPath set $ServiceName AppStderr $logPath
& $nssmPath set $ServiceName AppRotateFiles 1
& $nssmPath start $ServiceName

Start-Sleep -Seconds 2
$estado = Get-Service -Name $ServiceName
Write-Host ""
Write-Host "Servicio '$ServiceName' instalado. Estado: $($estado.Status)" -ForegroundColor Green
Write-Host "Logs en: $logPath"
