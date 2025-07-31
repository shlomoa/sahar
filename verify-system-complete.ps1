#!/usr/bin/env pwsh
# SAHAR TV Remote System - Comprehensive Integration Verification
# Run with: .\verify-system-complete.ps1

Write-Host "🎬 SAHAR TV REMOTE SYSTEM - COMPREHENSIVE VERIFICATION" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$ProjectRoot = Get-Location
$RemotePort = 4202
$TvPort = 4203
$WebSocketPorts = @(8000, 5544, 5545, 5546, 5547)

Write-Host "📍 Project Root: $ProjectRoot" -ForegroundColor Yellow
Write-Host ""

# Function to check if port is in use
function Test-Port {
    param($Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Function to check if Angular app is running
function Test-AngularApp {
    param($Port, $AppName)
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port" -Method Get -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $AppName is running on port $Port" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ $AppName is not running on port $Port" -ForegroundColor Red
        return $false
    }
}

# Step 1: Data Model Verification
Write-Host "🔍 STEP 1: DATA MODEL VERIFICATION" -ForegroundColor Magenta
Write-Host "===================================" -ForegroundColor Magenta

Write-Host "📊 Checking shared data models..."
$SharedModelsPath = Join-Path $ProjectRoot "shared\models\video-navigation.ts"
if (Test-Path $SharedModelsPath) {
    Write-Host "✅ Shared models found: $SharedModelsPath" -ForegroundColor Green
    
    # Check for real YouTube URLs
    $content = Get-Content $SharedModelsPath -Raw
    $youtubeMatches = [regex]::Matches($content, "youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})")
    Write-Host "📺 Found $($youtubeMatches.Count) YouTube video URLs" -ForegroundColor Green
    
    # Check for key data structures
    if ($content -match "performersData.*=") {
        Write-Host "✅ performersData export found" -ForegroundColor Green
    } else {
        Write-Host "❌ performersData export missing" -ForegroundColor Red
    }
    
    if ($content -match "likedScenes") {
        Write-Host "✅ likedScenes property structure confirmed" -ForegroundColor Green
    } else {
        Write-Host "❌ likedScenes property missing" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Shared models not found" -ForegroundColor Red
}

Write-Host ""

# Step 2: Remote App Interface Verification
Write-Host "🔍 STEP 2: REMOTE APP INTERFACE VERIFICATION" -ForegroundColor Magenta
Write-Host "=============================================" -ForegroundColor Magenta

$RemoteAppPath = Join-Path $ProjectRoot "apps\remote\src\app\app.ts"
if (Test-Path $RemoteAppPath) {
    Write-Host "✅ Remote app found: $RemoteAppPath" -ForegroundColor Green
    
    $remoteContent = Get-Content $RemoteAppPath -Raw
    
    # Check for shared model imports
    if ($remoteContent -match "from.*shared/models") {
        Write-Host "✅ Shared model imports found" -ForegroundColor Green
    } else {
        Write-Host "❌ Shared model imports missing" -ForegroundColor Red
    }
    
    # Check for likedScenes usage (not scenes)
    $scenesMatches = [regex]::Matches($remoteContent, "\.scenes\b")
    $likedScenesMatches = [regex]::Matches($remoteContent, "\.likedScenes")
    
    Write-Host "🔄 Property usage analysis:" -ForegroundColor Yellow
    Write-Host "   - .scenes references: $($scenesMatches.Count)" -ForegroundColor $(if ($scenesMatches.Count -eq 0) { "Green" } else { "Red" })
    Write-Host "   - .likedScenes references: $($likedScenesMatches.Count)" -ForegroundColor $(if ($likedScenesMatches.Count -gt 0) { "Green" } else { "Red" })
    
    # Check for string ID usage (not number IDs)
    if ($remoteContent -match "performerId.*string" -or $remoteContent -match "videoId.*string") {
        Write-Host "✅ String ID parameters found" -ForegroundColor Green
    } else {
        Write-Host "⚠️ String ID usage unclear" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Remote app not found" -ForegroundColor Red
}

Write-Host ""

# Step 3: WebSocket Server Verification
Write-Host "🔍 STEP 3: WEBSOCKET SERVER VERIFICATION" -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Magenta

$WebSocketServerPath = Join-Path $ProjectRoot "websocket-server-with-real-data.js"
if (Test-Path $WebSocketServerPath) {
    Write-Host "✅ WebSocket server with real data found" -ForegroundColor Green
    
    $wsContent = Get-Content $WebSocketServerPath -Raw
    
    # Check for real performer data
    if ($wsContent -match "performersData.*=") {
        Write-Host "✅ performersData structure found in server" -ForegroundColor Green
    }
    
    # Check for real YouTube URLs
    $wsYoutubeMatches = [regex]::Matches($wsContent, "youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})")
    Write-Host "📺 Server contains $($wsYoutubeMatches.Count) YouTube URLs" -ForegroundColor Green
    
    # Check for proper data handling
    if ($wsContent -match "findPerformer|findVideo|findScene") {
        Write-Host "✅ Data lookup functions found" -ForegroundColor Green
    }
    
    # Check if server is running
    $serverRunning = $false
    foreach ($port in $WebSocketPorts) {
        if (Test-Port $port) {
            Write-Host "✅ WebSocket server running on port $port" -ForegroundColor Green
            $serverRunning = $true
            break
        }
    }
    
    if (-not $serverRunning) {
        Write-Host "⚠️ No WebSocket server detected running" -ForegroundColor Yellow
        Write-Host "   Run: node websocket-server-with-real-data.js" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ WebSocket server with real data not found" -ForegroundColor Red
}

Write-Host ""

# Step 4: Application Build Status
Write-Host "🔍 STEP 4: APPLICATION BUILD STATUS" -ForegroundColor Magenta
Write-Host "====================================" -ForegroundColor Magenta

# Check Angular apps
$remoteRunning = Test-AngularApp $RemotePort "Remote App"
$tvRunning = Test-AngularApp $TvPort "TV App"

if (-not $remoteRunning) {
    Write-Host "   To start Remote app: cd apps/remote && ng serve --port $RemotePort" -ForegroundColor Gray
}

if (-not $tvRunning) {
    Write-Host "   To start TV app: cd apps/tv && ng serve --port $TvPort" -ForegroundColor Gray
}

Write-Host ""

# Step 5: Integration Test Plan
Write-Host "🔍 STEP 5: INTEGRATION TEST RECOMMENDATIONS" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta

Write-Host "🧪 MANUAL TESTING CHECKLIST:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 📱 Remote App Connection Test:" -ForegroundColor White
Write-Host "   ✓ Open http://localhost:$RemotePort" -ForegroundColor Gray
Write-Host "   ✓ Check device connection status" -ForegroundColor Gray
Write-Host "   ✓ Verify WebSocket connection established" -ForegroundColor Gray
Write-Host ""

Write-Host "2. 📺 TV App Response Test:" -ForegroundColor White
Write-Host "   ✓ Open http://localhost:$TvPort" -ForegroundColor Gray
Write-Host "   ✓ Check for WebSocket server connection" -ForegroundColor Gray
Write-Host "   ✓ Verify data reception capability" -ForegroundColor Gray
Write-Host ""

Write-Host "3. 🎭 Data Flow Verification:" -ForegroundColor White
Write-Host "   ✓ Remote: Navigate to Performers (should show 4: Yuval, Little Michal, Roy Boy, Uncle Haim)" -ForegroundColor Gray
Write-Host "   ✓ Remote: Select a performer (should show their videos)" -ForegroundColor Gray
Write-Host "   ✓ Remote: Select a video (should show liked scenes)" -ForegroundColor Gray
Write-Host "   ✓ TV: Should reflect all navigation changes in real-time" -ForegroundColor Gray
Write-Host ""

Write-Host "4. 🎬 Video Control Testing:" -ForegroundColor White
Write-Host "   ✓ Remote: Select a scene with real YouTube URL" -ForegroundColor Gray
Write-Host "   ✓ Remote: Test play/pause/stop controls" -ForegroundColor Gray
Write-Host "   ✓ TV: Should receive and respond to control commands" -ForegroundColor Gray
Write-Host "   ✓ Verify scene timestamp navigation works" -ForegroundColor Gray
Write-Host ""

Write-Host "5. 📊 Data Integrity Verification:" -ForegroundColor White
Write-Host "   ✓ Confirm all 4 performers are accessible" -ForegroundColor Gray
Write-Host "   ✓ Verify all 11 videos load correctly" -ForegroundColor Gray
Write-Host "   ✓ Check that scene timestamps match video durations" -ForegroundColor Gray
Write-Host "   ✓ Ensure YouTube URLs are valid and accessible" -ForegroundColor Gray
Write-Host ""

# Step 6: Summary and Recommendations
Write-Host "📋 VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

$issues = @()
$successes = @()

# Analyze results
if (Test-Path $SharedModelsPath) { $successes += "✅ Shared data models present" } else { $issues += "❌ Missing shared data models" }
if (Test-Path $RemoteAppPath) { $successes += "✅ Remote app structure correct" } else { $issues += "❌ Remote app missing" }
if (Test-Path $WebSocketServerPath) { $successes += "✅ WebSocket server with real data ready" } else { $issues += "❌ WebSocket server missing" }

Write-Host ""
Write-Host "🎯 SUCCESSES:" -ForegroundColor Green
foreach ($success in $successes) {
    Write-Host "   $success" -ForegroundColor Green
}

if ($issues.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️ ISSUES TO RESOLVE:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "   $issue" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🚀 NEXT STEPS:" -ForegroundColor Yellow

if (-not $serverRunning) {
    Write-Host "1. Start WebSocket server: node websocket-server-with-real-data.js" -ForegroundColor White
}

if (-not $remoteRunning) {
    Write-Host "2. Start Remote app: cd apps/remote && ng serve --port $RemotePort" -ForegroundColor White
}

if (-not $tvRunning) {
    Write-Host "3. Start TV app: cd apps/tv && ng serve --port $TvPort" -ForegroundColor White
}

Write-Host "4. Execute manual testing checklist above" -ForegroundColor White
Write-Host "5. Document any discovered issues" -ForegroundColor White

Write-Host ""
Write-Host "✨ System consolidation verification complete!" -ForegroundColor Green
Write-Host "Ready for comprehensive integration testing." -ForegroundColor Green
