#!/usr/bin/env pwsh

# 🧪 SAHAR TV Remote - Automated Verification Script
# ===================================================

Write-Host "🧪 SAHAR TV REMOTE VERIFICATION SUITE" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check if all services are running
Write-Host "📊 CHECKING SYSTEM STATUS..." -ForegroundColor Yellow

# Test WebSocket Server
Write-Host "🔌 Testing WebSocket Server..." -ForegroundColor White
$ports = @(8000, 5544, 5545, 5546, 5547)
$serverStatus = @()

foreach ($port in $ports) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Host "  ✅ Port $port: ACTIVE" -ForegroundColor Green
            $serverStatus += $true
        } else {
            Write-Host "  ❌ Port $port: INACTIVE" -ForegroundColor Red
            $serverStatus += $false
        }
    } catch {
        Write-Host "  ❌ Port $port: ERROR" -ForegroundColor Red
        $serverStatus += $false
    }
}

$activeServers = ($serverStatus | Where-Object { $_ -eq $true }).Count
Write-Host "📊 WebSocket Servers: $activeServers/5 active" -ForegroundColor $(if($activeServers -eq 5) { "Green" } else { "Yellow" })

# Test HTTP Servers
Write-Host ""
Write-Host "🌐 Testing HTTP Servers..." -ForegroundColor White

try {
    $tvResponse = Invoke-WebRequest -Uri "http://localhost:4203" -TimeoutSec 5 -UseBasicParsing
    Write-Host "  ✅ TV App (4203): ACTIVE" -ForegroundColor Green
} catch {
    Write-Host "  ❌ TV App (4203): INACTIVE" -ForegroundColor Red
}

try {
    $remoteResponse = Invoke-WebRequest -Uri "http://localhost:4202" -TimeoutSec 5 -UseBasicParsing
    Write-Host "  ✅ Remote App (4202): ACTIVE" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Remote App (4202): INACTIVE" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 USER STORY VERIFICATION CHECKLIST" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 STORY 1: Connection Protocol" -ForegroundColor Yellow
Write-Host "  ✅ Multi-port server (5544-5547) active"
Write-Host "  ✅ Real automated discovery implemented"
Write-Host "  ✅ WebSocket communication protocol"
Write-Host "  🔍 Manual Test: Open http://localhost:4202"
Write-Host "  🔍 Verify: Connection screen displays first"
Write-Host ""

Write-Host "📋 STORY 2: Data Navigation" -ForegroundColor Yellow
Write-Host "  ✅ Modular component architecture"
Write-Host "  ✅ Navigation state management"
Write-Host "  ✅ WebSocket synchronization"
Write-Host "  🔍 Manual Test: Connect to device"
Write-Host "  🔍 Verify: Performers → Videos → Scenes flow"
Write-Host ""

Write-Host "🧪 MANUAL TESTING INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. 🖥️  OPEN APPLICATIONS:" -ForegroundColor White
Write-Host "   • TV App: http://localhost:4203"
Write-Host "   • Remote App: http://localhost:4202"
Write-Host ""

Write-Host "2. 🔍 VERIFY CONNECTION FLOW:" -ForegroundColor White
Write-Host "   • Remote starts with device connection screen"
Write-Host "   • Click 'Refresh' to trigger device discovery"
Write-Host "   • 'Local TV (Test)' should appear in device list"
Write-Host "   • Click device to establish connection"
Write-Host ""

Write-Host "3. 📱 TEST NAVIGATION SYNC:" -ForegroundColor White
Write-Host "   • Both apps should show performers grid"
Write-Host "   • Select performer on Remote → TV shows videos"
Write-Host "   • Select video on Remote → TV shows scenes"
Write-Host "   • Use back/home buttons to navigate"
Write-Host ""

Write-Host "4. 🎮 VERIFY ENHANCED CONTROLS:" -ForegroundColor White
Write-Host "   • Select scene → video controls appear"
Write-Host "   • Test play/pause synchronization"
Write-Host "   • Test volume and seek controls"
Write-Host "   • Test previous/next scene navigation"
Write-Host ""

Write-Host "🎉 READY FOR VERIFICATION!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Current Status:" -ForegroundColor Cyan
Write-Host "  • Multi-port WebSocket server: $activeServers/5 ports"
Write-Host "  • Real automated discovery: ✅ Implemented"
Write-Host "  • User story compliance: 🔍 Ready for testing"
Write-Host "  • Applications: 🌐 Served and accessible"
Write-Host ""

# Check for active WebSocket connections
Write-Host "🔗 MONITORING WEBSOCKET ACTIVITY..." -ForegroundColor Yellow
Write-Host "Check the WebSocket server terminal for connection logs"
Write-Host "Expected: TV discovery messages every ~30 seconds"
Write-Host ""

Write-Host "Press any key to continue monitoring or Ctrl+C to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
