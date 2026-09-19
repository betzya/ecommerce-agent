# 一键启动电商客服 Agent 全栈(PowerShell 版)
# 用法:
#   .\start.ps1          构建并后台启动全栈
#   .\start.ps1 -Down    停止并移除容器
#   .\start.ps1 -Logs    查看 agent 日志
param([switch]$Down, [switch]$Logs)

$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\agent-production"

if (-not (Test-Path ".env")) {
    Write-Host "❌ 缺少 agent-production/.env" -ForegroundColor Red
    Write-Host "   请先: Copy-Item .env.example .env 并填入 AGENT_OPENAI_API_KEY" -ForegroundColor Yellow
    exit 1
}

if ($Down) {
    docker compose down
    exit 0
}
if ($Logs) {
    docker compose logs -f agent-service
    exit 0
}

Write-Host "==> 构建镜像(首次较慢,含 Maven 依赖 + 前端构建)..."
docker compose build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> 后台启动全栈..."
docker compose up -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> 等待 Agent 健康..."
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2
        $ready = $true
        break
    } catch {
        Start-Sleep -Seconds 2
    }
}

if ($ready) {
    Write-Host ""
    Write-Host "✅ 启动完成" -ForegroundColor Green
    Write-Host "   客服后台(前端): http://localhost:8081"
    Write-Host "   Agent API:      http://localhost:8000"
    Write-Host "   健康检查:       http://localhost:8000/health"
    Write-Host "   查看日志:       .\start.ps1 -Logs"
} else {
    Write-Host "❌ Agent 未在 3 分钟内就绪,排查: docker compose logs -f agent-service" -ForegroundColor Red
    exit 1
}
