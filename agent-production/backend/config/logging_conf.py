"""结构化 JSON 日志配置。把服务日志变成每行一条可检索的 JSON。"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

# LogRecord 自带字段，不重复写进 JSON；其余 extra= 传入的字段会并进去
_RESERVED_ATTRS = frozenset({
    "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
    "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
    "created", "msecs", "relativeCreated", "thread", "threadName",
    "processName", "process", "taskName", "message", "asctime",
})


class JsonFormatter(logging.Formatter):
    """把一条日志记录格式化成一行 JSON。"""

    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, Any] = {
            "time": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(record.created)),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key, value in record.__dict__.items():
            if key not in _RESERVED_ATTRS and not key.startswith("_"):
                entry[key] = value
        if record.exc_info:
            entry["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(entry, ensure_ascii=False, default=str)


def setup_logging() -> None:
    """配置根 logger 为 JSON 输出，避免重复 handler。"""
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    for handler in root.handlers[:]:
        root.removeHandler(handler)
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root.addHandler(handler)
