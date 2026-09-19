"""依赖健康检查。检查数据库、电商后端和 LLM 配置状态。"""

from __future__ import annotations

import os
import sqlite3
from contextlib import closing
from typing import Any

import httpx

from config.settings import api_key_is_missing, ecommerce_base_url, load_env
from state.db import DB_PATH


def check_database() -> str:
    """SQLite 能否正常读写。"""
    try:
        with closing(sqlite3.connect(DB_PATH)) as conn:
            conn.execute("SELECT 1")
        return "ok"
    except Exception:
        return "down"


def check_ecommerce_backend() -> str:
    """电商后端健康端点是否可达。"""
    try:
        response = httpx.get(f"{ecommerce_base_url()}/actuator/health", timeout=2)
        return "ok" if response.status_code == 200 else "down"
    except Exception:
        return "down"


def check_llm_api() -> str:
    """LLM API Key 是否已配置（不真调模型，省成本与延迟）。"""
    load_env()
    key = os.getenv("AGENT_OPENAI_API_KEY")
    return "ok" if not api_key_is_missing(key) else "not_configured"


def build_health_status() -> dict[str, Any]:
    """汇总依赖状态，整体状态由依赖决定；进程存活始终返回 200。"""
    dependencies = {
        "database": check_database(),
        "ecommerce_backend": check_ecommerce_backend(),
        "llm_api": check_llm_api(),
    }
    status = "ok" if all(value == "ok" for value in dependencies.values()) else "degraded"
    return {"status": status, "service": "agent", "dependencies": dependencies}
