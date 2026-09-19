"""FastAPI 路由层，只负责接入 Agent、Resume、Trace、Eval 和 Feedback。"""

from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import Depends, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import generate_latest

from agents.customer_service_agent import CustomerServiceAgent
from api.schemas import *
from config.logging_conf import setup_logging
from config.settings import CASES_PATH
from evals.runner import EvalRunner
from feedback.attribution import FailureAttributor, build_backfilled_case
from observability.health import build_health_status
from observability.metrics import HTTP_DURATION, HTTP_REQUESTS
from observability.trace import trace_store
from security.auth import verify_api_token
from state.session_state import BACKFILLED_CASES, FEEDBACK_RECORDS

agent = CustomerServiceAgent()
eval_runner = EvalRunner(agent, CASES_PATH)
eval_runner.backfilled_cases = BACKFILLED_CASES
failure_attributor = FailureAttributor()
app = FastAPI(title="Customer Service Agent")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_logging()
request_logger = logging.getLogger("request")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """记录每个 HTTP 请求的方法、路径、状态码和耗时，并埋 Prometheus 指标。"""
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 1)
    HTTP_REQUESTS.labels(method=request.method, status=str(response.status_code)).inc()
    HTTP_DURATION.labels(method=request.method).observe(duration_ms / 1000)
    request_logger.info(
        "request completed",
        extra={
            "event": "request",
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
        },
    )
    return response


@app.get("/health")
def health() -> dict[str, Any]:
    """返回服务与依赖的健康状态；进程存活始终返回 200。"""
    return build_health_status()


@app.get("/metrics")
def metrics() -> Response:
    """暴露 Prometheus 指标，供监控系统抓取。"""
    return Response(content=generate_latest(), media_type="text/plain")


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, _: None = Depends(verify_api_token)) -> ChatResponse:
    """处理一次综合链路聊天请求。"""
    return agent.chat(request)


@app.post("/chat/resume", response_model=ChatResumeResponse)
def chat_resume(request: ChatResumeRequest, _: None = Depends(verify_api_token)) -> ChatResumeResponse:
    """恢复一个暂停在 HITL 节点的售后 workflow。"""
    return agent.resume(request)


@app.get("/sessions/{session_id}/trace", response_model=list[TraceEvent])
def session_trace(session_id: str) -> list[TraceEvent]:
    """返回指定会话的公开 Trace。"""
    return trace_store.list(session_id)


@app.post("/eval/run", response_model=EvalRunResponse)
def run_eval(request: EvalRunRequest) -> EvalRunResponse:
    """运行综合链路回归评测。"""
    return eval_runner.run(case_id=request.case_id)


@app.post("/feedback/submit", response_model=FeedbackSubmitResponse)
def submit_feedback(request: FeedbackRequest) -> FeedbackSubmitResponse:
    """提交反馈、生成归因并回填成临时回归 case。"""
    eval_report = eval_runner.run(case_id=request.case_id) if request.case_id else None
    eval_result = eval_report.results[0] if eval_report and eval_report.results else None
    events = trace_store.list(request.session_id)
    attributions = failure_attributor.attribute(feedback=request, trace_events=events, eval_result=eval_result)
    base_case = next((case for case in eval_runner.load_cases() if case["case_id"] == request.case_id), None)
    backfilled_case = build_backfilled_case(request, attributions, base_case)
    BACKFILLED_CASES.append(backfilled_case)
    record = FeedbackRecord(
        feedback_id=f"fb-{len(FEEDBACK_RECORDS) + 1:03d}",
        session_id=request.session_id,
        case_id=request.case_id,
        rating=request.rating,
        user_comment=request.user_comment,
        trace_event_names=[event.event_type for event in events],
        eval_failure_categories=eval_result.failure_categories if eval_result else [],
        attributions=attributions,
        backfilled_case=backfilled_case,
    )
    FEEDBACK_RECORDS.append(record)
    return FeedbackSubmitResponse(record=record, eval_report=eval_report)
