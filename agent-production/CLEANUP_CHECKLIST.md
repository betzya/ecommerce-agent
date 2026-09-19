# 教学痕迹清理清单

基线提交后遗留的「课程/教学」痕迹。按类型分组，逐项处理后勾掉。

## A. 文案 / docstring（纯改写，低风险）

> ✅ 已完成（2026-09-10）：`第 41 课 / 课程 / 本课 / 总演习 / 综合演练 / 项目答辩` 等措辞已全量替换为生产中性描述。剩余「模拟 / 故障注入 / teaching / course_*」属 B、C 类功能痕迹，不在本类。

- [x] `backend/main.py:1` ——「第 41 课后端入口」→ 生产入口描述
- [ ] `backend/api/schemas.py:1` ——「第 41 课把所有公开 API 契约…」
- [ ] `backend/config/settings.py:34,59` ——「课程能力清单」「课程最终版」
- [ ] `backend/api/routes.py:34,40,46,64` ——「课程快照健康检查」「课程能力清单」「总演习」
- [ ] `backend/agents/customer_service_agent.py:1,47,55,713,797` ——「综合演练」「总演习」「教学模式」「大促总演习」
- [ ] `backend/evals/runner.py:24,26,31,42,314` ——「课程型离线回归评测」「本课」
- [ ] `backend/observability/trace.py:171,175` ——「本课」「课程用例」
- [ ] `backend/integrations/ecommerce_client.py:1,85,93,98,110,158` ——「课程代码」「课程业务后端」
- [ ] 各模块 `__init__.py` 与 docstring 里的「第 41 课 / 课程 / 本课 / 总演习 / 综合演练」约 30 处

## B. 教学功能（需逐个决策，涉及删功能）

- [x] ~~`reasoning_view="teaching"` 教学模式~~ 已删除：`ReasoningView` 去掉 `teaching`、`enable_reasoning=False`、`reasoning_content` 恒为 None
- [x] ~~`cost_profile="teaching"`、`teaching_budget`~~ 已改为 `production` / 中性告警
- [x] ~~`agent_capabilities.json` + `/capabilities` 端点~~ 已删除（连同 `load_agent_capabilities`、`CAPABILITIES_PATH`、`Lesson41Agent` 类名 → `CustomerServiceAgent`、FastAPI title）
- [x] ~~故障注入后门~~ 已删除
- [ ] 模拟退款审批 —— 保留为真实功能，「模拟」待接真实资金/审批系统（已移入 F 类）

## C. 离线替身（接真实数据时必须拆）

> ✅ 已完成（2026-09-10）：全部删除，系统只走真实后端 + 真实 embedding + 真实日期，依赖不可用时诚实降级（转人工）。

- [x] ~~`course_seed_mirror` / `AGENT_COURSE_OFFLINE_FACTS` / `AGENT_COURSE_OFFLINE_RAG`~~ 已删：三个 `COURSE_SEED_*` 字典、`course_seed_mirror_enabled()`、三个函数里的 mirror 回退
- [x] ~~`LocalTokenEmbeddings` 离线字符向量~~ 已删：类删除、`build_course_embeddings` → `build_embeddings`、离线分支删除
- [x] ~~`course_today()` 固定课程日期~~ 已删：改用 `date.today()`
- [x] ~~`course-debug-agent-service` 默认 token~~ 已删：默认值改为空串，无 token 即无鉴权头
- [x] 顺手清理：`products_from_ecommerce` 等 docstring 去掉「离线演练」、`ecommerce_client.py` 清理 11 个未用 import、`hybrid_retrieval.py` 清理 `math`、`after_sale_graph.py` 清理 `os`

> 注意：`state/session_state.py` 的「内存状态 → 数据库」属于 F 类持久化，不在此类（docstring 已在 A 类诚实标注）。

## D. 死代码（复制时带过来的错误路径）

- [x] ~~`api/schemas.py:37-38` —— `CAPABILITIES_PATH` / `CASES_PATH` 用 `with_name()` 指向 `api/`（错误），且从未被 import~~ 已删除（连同 39-40 行的 `DEFAULT_ECOMMERCE_BASE_URL` / `TRACE_SCHEMA_VERSION` 重复定义）

## E. 测试数据（回归 case 里的课程内容）

- [x] ~~`cases.yml:212` —— `rag.rerank_mode=lesson41_lightweight`~~ 已改为 `lightweight`
- [x] ~~`cases.yml:227` —— 故障注入演示 case~~ 已删除

## F. 结构性改造（不在「教学痕迹」范围内，但属于生产化）

- [ ] 模拟退款审批 → 接真实资金/审批系统（`workflows/resume.py` 目前只记录模拟申请，不碰真实资金）
- [ ] `runtime_user_id` 信任调用方 → 服务端会话校验（越权风险）
- [x] ~~内存状态 → SQLite~~ 已完成核心：checkpoint / 幂等 / 会话计数已落库（`state/db.py`），幂等用唯一索引兜底；剩余 session memory / FAQ 缓存 / trace 待接
- [ ] `TraceStore` 内存 → OTel / Langfuse 等真实 trace 后端
- [x] ~~`requirements.txt` 补进 `agent-production/`~~ 已创建（11 个精确依赖）
