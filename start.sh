#!/usr/bin/env bash
# 一键启动电商客服 Agent 全栈:agent(FastAPI) + ecommerce(Spring Boot,内含前端 SPA) + mysql
#
# 用法:
#   bash start.sh          构建并后台启动全栈
#   bash start.sh down     停止并移除容器
#   bash start.sh logs     查看 agent 日志
set -euo pipefail

cd "$(dirname "$0")/agent-production"

if [ ! -f .env ]; then
  echo "❌ 缺少 agent-production/.env"
  echo "   请先: cp .env.example .env 并填入 AGENT_OPENAI_API_KEY(硅基流动 Key)"
  exit 1
fi

case "${1:-up}" in
  down)
    docker compose down
    ;;
  logs)
    docker compose logs -f agent-service
    ;;
  *)
    echo "==> 构建镜像(首次较慢,含 Maven 依赖 + 前端构建)..."
    docker compose build
    echo "==> 后台启动全栈..."
    docker compose up -d
    echo "==> 等待 Agent 健康..."
    for _ in $(seq 1 90); do
      if curl -fsS http://localhost:8000/health >/dev/null 2>&1; then
        echo
        echo "✅ 启动完成"
        echo "   客服后台(前端): http://localhost:8081"
        echo "   Agent API:      http://localhost:8000"
        echo "   健康检查:       http://localhost:8000/health"
        echo "   指标:           http://localhost:8000/metrics"
        echo "   查看日志:       bash start.sh logs"
        exit 0
      fi
      sleep 2
    done
    echo "❌ Agent 未在 3 分钟内就绪,排查: cd agent-production && docker compose logs -f agent-service"
    exit 1
    ;;
esac
