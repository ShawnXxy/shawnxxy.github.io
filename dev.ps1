#!/usr/bin/env pwsh

# Portfolio Development Helper Script

param(
    [Parameter(Position=0)]
    [ValidateSet("static", "typescript", "build", "deploy", "build-languages", "help")]
    [string]$Command = "help"
)

function Show-Help {
    Write-Host "Portfolio Development Helper" -ForegroundColor Green
    Write-Host "============================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage: .\dev.ps1 <command>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "  static        - Serve static files (GitHub Pages mode)" -ForegroundColor White
    Write-Host "  typescript    - Start TypeScript development server" -ForegroundColor White
    Write-Host "  build         - Build TypeScript to dist/" -ForegroundColor White
    Write-Host "  deploy        - Copy dist/ to static/ for deployment" -ForegroundColor White
    Write-Host "  build-languages - Generate GitHub language data" -ForegroundColor White
    Write-Host "  help          - Show this help message" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Cyan
    Write-Host "  .\dev.ps1 static      # Serve static files on http://localhost:8000" -ForegroundColor Gray
    Write-Host "  .\dev.ps1 typescript  # Start TypeScript dev server" -ForegroundColor Gray
    Write-Host "  .\dev.ps1 build       # Build for production" -ForegroundColor Gray
}

function Load-EnvironmentVariables {
    # Load environment variables from .env file if it exists
    if (Test-Path ".env") {
        Write-Host "📋 Loading environment variables from .env..." -ForegroundColor Yellow
        Get-Content ".env" | ForEach-Object {
            if ($_ -match "^([^#][^=]*)=(.*)$") {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                Set-Item -Path "env:$name" -Value $value
                Write-Host "   ✓ $name" -ForegroundColor Gray
            }
        }
    }
}

function Start-StaticServer {
    # Load environment variables first
    Load-EnvironmentVariables
    
    Write-Host "🌐 Starting static file server..." -ForegroundColor Green
    Write-Host "📂 Serving from: static/" -ForegroundColor Yellow
    Write-Host "🌍 URL: http://localhost:8000" -ForegroundColor Cyan
    
    # Check if Azure Maps key is loaded
    if ($env:AZURE_MAPS_SUBSCRIPTION_KEY) {
        Write-Host "🗝️  Azure Maps key loaded" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Azure Maps key not found in environment" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
    
    Set-Location static
    python -m http.server 8000
}

function Start-TypeScriptDev {
    Write-Host "🛠️  Starting TypeScript development server..." -ForegroundColor Green
    Write-Host "📂 Source: src/" -ForegroundColor Yellow
    Write-Host "🌍 URL: http://localhost:8080" -ForegroundColor Cyan
    Write-Host ""
    
    npm run dev
}

function Build-TypeScript {
    Write-Host "📦 Building TypeScript..." -ForegroundColor Green
    
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force dist
        Write-Host "🗑️  Cleaned dist/" -ForegroundColor Yellow
    }
    
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Build successful!" -ForegroundColor Green
        Write-Host "📂 Output: dist/" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
}

function Deploy-ToStatic {
    Write-Host "🚀 Deploying to static..." -ForegroundColor Green
    
    if (!(Test-Path "dist")) {
        Write-Host "❌ No dist/ folder found. Run build first." -ForegroundColor Red
        exit 1
    }
    
    # Copy dist contents to static, preserving existing static assets
    robocopy dist static /E /XD css js fonts images favicons downloadable
    
    Write-Host "✅ Deployed to static/" -ForegroundColor Green
    Write-Host "🌐 Ready for GitHub Pages!" -ForegroundColor Cyan
}

function Build-LanguageData {
    Write-Host "📊 Generating GitHub language data..." -ForegroundColor Green
    
    if (!(Test-Path "static/js/generate-language-data.js")) {
        Write-Host "❌ Language data generator not found!" -ForegroundColor Red
        exit 1
    }
    
    # Check if git_token environment variable is set
    if (!$env:git_token) {
        Write-Host "❌ git_token environment variable not set!" -ForegroundColor Red
        Write-Host "💡 Set it with: `$env:git_token = 'your_token_here'" -ForegroundColor Yellow
        exit 1
    }
    
    Set-Location static/js
    node generate-language-data.js
    Set-Location ../..
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Language data generated successfully!" -ForegroundColor Green
        Write-Host "📂 Output: static/data/" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Failed to generate language data!" -ForegroundColor Red
        exit 1
    }
}

# Main script logic
switch ($Command) {
    "static" { Start-StaticServer }
    "typescript" { Start-TypeScriptDev }
    "build" { Build-TypeScript }
    "deploy" { Deploy-ToStatic }
    "build-languages" { Build-LanguageData }
    "help" { Show-Help }
    default { Show-Help }
}
