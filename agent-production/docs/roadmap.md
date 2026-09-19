# 电商 Agent 生产化路线图

> 目标:把课程原型改造成**可部署、可运行、可兜底**的企业级电商客服 Agent。
> 本文档是推进的单一事实来源(single source of truth),每阶段任务用 checkbox 跟踪,做完一项勾一项。

## 北极星:什么算"达标"

企业级 MVP 的"完成"定义,达成以下即算落地:

- [ ] 公网可访问 + HTTPS(域名 + 证书)
- [ ] 真实 MySQL + schema 版本迁移(不再靠 `DataInitializer` 造数)
- [ ] 真实用户身份 + 租户隔离(不串用户订单)
- [ ] eval 进 CI,改 prompt/模型自动回归,不达标不合入
- [ ] 监控告警 + 每次会话成本硬上限
- [ ] 零教学痕迹(course-debug / demo 造数 / 调试台)

---

## 阶段一:部署硬化 + 清教学痕迹(进行中)

目标:让它在真实环境"能跑",且代码里没有露馅的教学痕迹。

- [x] 去小哲化(内容 + 文件/目录名,377 文件 / 1807 处)
- [x] 密钥治理:`.gitignore` 已忽略 `.env`/`course.env`,`env.example` 为占位符;遗留风险 = 若历史提交泄露过 Key 需轮换
- [ ] 清 debug profile:`SPRING_PROFILES_ACTIVE: course-debug` → ⚠️与真实登录耦合,迁至阶段三
- [ ] 清 debug 控制器:`CourseDebugRuntimeContextController` → ⚠️前端在调它,迁至阶段三
- [x] 清命名痕迹:`demo-mysql`/`demo-chroma`/`agent_demo`/`ecommerce-demo`/`course-debug-agent-service` → 已统一为中性命名
- [~] 一键启动:全栈 compose 已就位、`start.sh` 已写、删了无引用的根 `docker-compose.yml`(保留 `docker-compose.infra.yml`,运行手册/skill 引用它);剩真机验证跑通
- [x] 包名去 teachdemo:`com.teachdemo.ecommerce` → `com.ecommerce`(目录 + package/import + groupId 全改)
- [x] 真实 MySQL 持久卷 + Flyway 迁移(Flyway 接管 schema,V1 建 19 表 + 2 外键,`ddl-auto=none`)
- [ ] 反向代理 + HTTPS(nginx / 云 LB + TLS)
- [ ] 健康探针接入编排(liveness/readiness)+ 优雅停机
- [ ] 容器镜像版本化 + 私有仓库
- [ ] CI/CD 骨架:build → 单测 → 镜像 → 部署

**关键路径(先做,不依赖真实数据)**:密钥治理 → 清 debug 痕迹 → 迁移脚本 → CI 骨架。

---

## 阶段二:eval 门禁(与阶段一并行,最高杠杆)

LLM 应用最大风险是"改了 prompt/模型悄悄变蠢"。已有 `evals/runner.py` + `cases.yml`,用起来。

- [ ] 黄金评测集:真实 QA 对 + 边界 case + 对抗 case(诱导退款/注入/跨用户问询)
- [ ] eval 接 CI:prompt/模型/代码改动不过回归不合入
- [ ] 线上抽样评测:生产流量 LLM-judge + 人工抽检
- [ ] prompt 版本化 + 金丝雀发布

---

## 阶段三:真实身份与数据

- [ ] 真实登录:service-token → OAuth2/OIDC / JWT,agent 感知"对面是谁"
- [ ] 租户隔离:绝不跨用户泄露订单
- [ ] 业务适配层:`integrations/ecommerce_client.py` 定义为可替换接口,可无缝切真实 ERP
- [ ] 高风险动作幂等 + 事务:退款/退货硬到"重复请求不重复退款"

---

## 阶段四:可观测性 + 告警

- [ ] 结构化日志(JSON)+ 集中收集(Loki/ELK)
- [ ] 全链路分布式追踪:OpenTelemetry 打通 FastAPI → Spring → LLM
- [ ] Grafana 大盘:token 成本 / P95 延迟 / 错误率 / RAG 命中率 / 工具成功率
- [ ] 告警 + SLO(如客服回复成功率 ≥ 98%)

---

## 阶段五:安全合规

- [ ] 真实 RBAC、租户隔离、PII 脱敏、审计日志
- [ ] 限流 + 滥用检测、密钥轮换

---

## 阶段六:成本与规模

- [ ] 每次会话硬预算 + 超限降级
- [ ] 模型分级路由:简单意图走便宜快模型,复杂售后走强模型
- [ ] 语义缓存(FAQ 命中直接回)+ 慢工作流走异步队列
- [ ] 横向扩容:agent 无状态化,状态从 SQLite → Redis/共享 DB

---

## 教学痕迹清单(要摘)

- [x] ~~`com.teachdemo.ecommerce` 包名~~ → 已改 `com.ecommerce`
- [ ] `CourseDebugRuntimeContextController.java`
- [ ] `SPRING_PROFILES_ACTIVE: course-debug`(与前端调试通道耦合,迁至阶段三)
- [x] `demo-mysql` 容器名、`course-debug-agent-service` 令牌、`agent_demo` 库名(已统一)
- [ ] 前端 `TracePanel.tsx` / `ServiceStatusPanel.tsx` 调试台(改内部运维后台)
- [ ] `course.env` / `course.env.example` 命名
- [ ] `DataInitializer.java` 演示造数(改为迁移 + 可选的种子数据)

---

## 技术选型与待定决策

- **部署目标(待定)**:a) 自购云服务器 + docker compose;b) 云厂商容器服务/托管平台;c) 先做"本地一键生产启动"再上云。→ 决定阶段一后半段(nginx/HTTPS/上云)做法。
- **模型**:硅基流动(Qwen)为主 + 一个备用 provider 做故障切换。
- **存储**:SQLite → PostgreSQL/MySQL(共享)+ Redis(缓存/会话)。
- **云**:国内部署需 ICP 备案(提前 1-2 周排期)。
