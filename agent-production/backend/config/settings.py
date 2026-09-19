"""配置层，集中处理 cases 路径和项目 .env 加载。"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

CASES_PATH = Path(__file__).resolve().parents[1] / "cases.yml"
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
DEFAULT_ECOMMERCE_BASE_URL = "http://127.0.0.1:8081"
TRACE_SCHEMA_VERSION = "trace_event_v1"


def api_key_is_missing(api_key: str | None) -> bool:
    """判断环境里的模型 Key 是否仍是空值或占位值。"""
    if not api_key:
        return True
    normalized = api_key.strip()
    return normalized in {
        "",
        "你的模型平台 Key",
        "your-api-key",
        "your_api_key",
        "YOUR_API_KEY",
        "sk-your-api-key",
        "sk-xxx",
        "替换成你的真实Key",
    }


def load_env() -> Path | None:
    """加载项目根目录的 .env，供模型配置和运行参数复用。"""
    env_path = Path(os.getenv("AGENT_ENV_FILE", str(ENV_PATH))).expanduser()
    if not env_path.exists():
        return None
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))
    return env_path


def ecommerce_base_url() -> str:
    """返回电商业务后端地址，避免工具层直接读取环境变量。"""
    return os.getenv("ECOMMERCE_BASE_URL", os.getenv("AGENT_ECOMMERCE_BASE_URL", DEFAULT_ECOMMERCE_BASE_URL)).rstrip("/")


def openai_base_url() -> str:
    """返回 OpenAI 兼容模型服务地址，本服务通过真实大模型生成客服话术。"""
    return os.getenv("AGENT_OPENAI_BASE_URL", "https://api.siliconflow.cn/v1").rstrip("/")


def openai_model_name() -> str:
    """返回客服 Agent 默认使用的聊天模型名称。"""
    return os.getenv("AGENT_OPENAI_MODEL", "Qwen/Qwen3-8B")


def embedding_model_name() -> str:
    """返回知识检索使用的真实 Embedding 模型名称。"""
    return os.getenv("AGENT_EMBEDDING_MODEL", "BAAI/bge-m3")
