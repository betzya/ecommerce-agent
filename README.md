# 电商客服 Agent

企业级电商客服 Agent 项目:基于大模型的智能客服,支持订单查询、售后处理、退款 HITL 人工审批、RAG 知识问答、Prompt 注入防御,并带完整的规则化评测、可观测性与 CI。

## 架构

| 服务 | 技术栈 | 端口 | 职责 |
|---|---|---|---|
| `agent-production` | Python / FastAPI | 8000 | AI 客服 Agent:意图路由、工具调用、RAG、Workflow/HITL、成本治理 |
| `ecommerce-backend` | Java / Spring Boot | 8081 | 电商业务后端:商品/订单/售后/审批,内含前端 SPA |
| `mysql` | MySQL 8.0 | 3306 | 业务数据,schema 由 Flyway 版本化迁移管理 |

## 快速开始

```bash
cd agent-production
docker compose up -d --build   # 一键启动全栈(需 Docker)
```

- 前端(商城): http://localhost:8081(账号 `zhangsan` / `123456`)
- Agent 健康检查: http://localhost:8000/health

首次启动前,把 `agent-production/.env.example` 复制为 `agent-production/.env`,填入 `AGENT_OPENAI_API_KEY`(硅基流动模型 Key)。

## 评测(eval 门禁)

改了 prompt、换了模型、动了 agent 代码后,**本地跑回归评测**确认没有退化:

```bash
cd agent-production
docker compose exec agent-service python -m evals.gate
```

> 评测要调真实模型(硅基流动,国内服务),因此**本地手动跑**,不放进 CI——CI 只做编译与语法检查。

## CI

GitHub Actions:每次 push 自动跑 Java 编译(`mvn compile`)+ Python 语法检查(`compileall`)。
