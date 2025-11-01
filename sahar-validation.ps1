Param(
  [Parameter(Mandatory = $false)]
  [ValidateSet('full','check','start','test','stop')]
  [string]$Mode = 'full'
)

$ErrorActionPreference = 'Stop'

function Write-Section($msg) {
  Write-Host "`n=== $msg ===" -ForegroundColor Cyan
}

function Ensure-Npm($cwd) {
  if (-not (Test-Path -Path (Join-Path $cwd 'node_modules'))) {
    Write-Host "Installing dependencies in $cwd ..." -ForegroundColor Yellow
    Push-Location $cwd
    npm ci
    Pop-Location
  }
}

function Run-Npm($cwd, [string[]]$cmdArgs) {
  Push-Location $cwd
  $argsDisplay = $cmdArgs -join ' '
  Write-Host "npm $argsDisplay" -ForegroundColor DarkGray
  & npm @cmdArgs
  Pop-Location
}

function Start-Background($cwd, $command, $arguments) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.WorkingDirectory = $cwd
  $psi.FileName = $command
  $psi.Arguments = $arguments
  $psi.UseShellExecute = $true
  $psi.CreateNoWindow = $false
  $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Minimized
  [System.Diagnostics.Process]::Start($psi) | Out-Null
}

function Get-PidsByPort([int]$port) {
  $pids = @()
  try {
    if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
      $pids = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -Expand OwningProcess -Unique)
    }
  } catch {}
  if (-not $pids -or $pids.Count -eq 0) {
    # Fallback to netstat parsing
    $net = netstat -ano | Select-String ":$port\s" | ForEach-Object { $_.ToString() }
    foreach ($line in $net) {
      $parts = $line -split "\s+" | Where-Object { $_ -ne '' }
      if ($parts.Length -ge 5) {
        $pid = $parts[-1]
        if ($pid -match '^\d+$') { $pids += [int]$pid }
      }
    }
    $pids = $pids | Select-Object -Unique
  }
  return $pids
}

function Stop-ByPort([int[]]$ports) {
  foreach ($port in $ports) {
    $pids = Get-PidsByPort -port $port
    foreach ($pid in $pids) {
      try {
        Write-Host "Stopping PID $pid (port $port)" -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
      } catch {}
    }
  }
}

switch ($Mode) {
  'check' {
    Write-Section 'Environment Check'
    node -v
    npm -v
    try { ng version } catch { Write-Host 'Angular CLI not found in PATH; will use local CLI via npm scripts.' -ForegroundColor Yellow }
    Write-Host 'Environment check completed.' -ForegroundColor Green
  }
  'full' {
    Write-Section 'Build: shared'
    Ensure-Npm "$PSScriptRoot/shared"
  Run-Npm "$PSScriptRoot/shared" @('run','build')

    Write-Section 'Relink shared and rebuild server + clients'
    Ensure-Npm "$PSScriptRoot/server"
  Run-Npm "$PSScriptRoot/server" @('run','relink:shared')
  Run-Npm "$PSScriptRoot/server" @('run','rebuild:all')

    Write-Section 'Typecheck: all packages'
  Run-Npm "$PSScriptRoot/server" @('run','typecheck:all')

    Write-Section 'Server tests'
  Run-Npm "$PSScriptRoot/server" @('run','test')

    Write-Host "Full system check: PASS" -ForegroundColor Green
  }
  'start' {
    Write-Section 'Starting server (background)'
    Ensure-Npm "$PSScriptRoot/server"
    Start-Background "$PSScriptRoot/server" 'npm' 'run start:with-shared'

    Write-Section 'Starting Angular apps (background)'
    Ensure-Npm "$PSScriptRoot/apps/tv"
    Ensure-Npm "$PSScriptRoot/apps/remote"
    Start-Background "$PSScriptRoot/apps/tv" 'npx' 'ng serve --port 4203'
    Start-Background "$PSScriptRoot/apps/remote" 'npx' 'ng serve --port 4202'

    Write-Host 'Launched server, TV (4203), and Remote (4202) in background.' -ForegroundColor Green
  }
  'stop' {
    Write-Section 'Stopping server and Angular dev servers'
    # Default ports
    $ports = @(8080, 4203, 4202)
    Stop-ByPort -ports $ports
    Write-Host 'Requested stop for processes on ports 8080, 4203, 4202.' -ForegroundColor Green
  }
  'test' {
    Write-Section 'Server tests'
    Ensure-Npm "$PSScriptRoot/server"
    Run-Npm "$PSScriptRoot/server" 'run test'
  }
  Default {
    throw "Unknown mode: $Mode"
  }
}
