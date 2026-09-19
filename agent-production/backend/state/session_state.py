"""内存状态。这里保留反馈、回填 case 和 FAQ 缓存等可重建/非关键的轻量状态。

会话计数、checkpoint 和幂等已迁到 state.db 的 SQLite 持久化层；
剩余这些全局对象用于开发调试（反馈回填、缓存），重启丢失可接受。
"""

from __future__ import annotations

from typing import Any

from api.schemas import FeedbackRecord

FEEDBACK_RECORDS: list[FeedbackRecord] = []
BACKFILLED_CASES: list[dict[str, Any]] = []
COMMON_HIT_CACHE: dict[str, dict[str, Any]] = {}
