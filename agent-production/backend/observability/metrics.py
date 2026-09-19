"""Prometheus 指标定义。计数器与直方图，由 /metrics 端点暴露。"""

from __future__ import annotations

from prometheus_client import Counter, Histogram

HTTP_REQUESTS = Counter(
    "http_requests_total",
    "HTTP 请求总数",
    ["method", "status"],
)

HTTP_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP 请求耗时（秒）",
    ["method"],
)

DEGRADED_TOTAL = Counter(
    "agent_degraded_total",
    "Agent 降级次数",
    ["reason"],
)

MODEL_CALLS = Counter(
    "agent_model_calls_total",
    "模型调用次数",
    ["model"],
)
