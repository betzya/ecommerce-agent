"""SQLite 持久化层。把会话、checkpoint 和幂等从内存迁到磁盘，重启不丢。

资金相关的幂等键用数据库唯一约束兜底，保证同一个审批动作不会被重复提交。
"""

from __future__ import annotations

import json
import os
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any

DB_PATH = Path(os.getenv("AGENT_DB_PATH", str(Path(__file__).resolve().parents[1] / "agent.db")))

_initialized = False


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    """创建持久化表；幂等表用主键做唯一约束。"""
    global _initialized
    if _initialized:
        return
    with closing(_connect()) as conn:
        with conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS workflow_checkpoints (
                    session_id TEXT NOT NULL,
                    workflow_id TEXT NOT NULL,
                    data_json TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    PRIMARY KEY (session_id, workflow_id)
                );
                CREATE TABLE IF NOT EXISTS submitted_actions (
                    idempotency_key TEXT PRIMARY KEY,
                    request_id TEXT NOT NULL,
                    workflow_id TEXT,
                    order_id TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                CREATE TABLE IF NOT EXISTS session_state (
                    session_id TEXT PRIMARY KEY,
                    message_count INTEGER NOT NULL DEFAULT 0,
                    memory_json TEXT,
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                """
            )
    _initialized = True


def _dump(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


def save_checkpoint(session_id: str, workflow_id: str, data: dict[str, Any]) -> None:
    """保存暂停审批的 checkpoint，覆盖同会话同 workflow 的旧记录。"""
    init_db()
    with closing(_connect()) as conn:
        with conn:
            conn.execute(
                "INSERT OR REPLACE INTO workflow_checkpoints (session_id, workflow_id, data_json) VALUES (?, ?, ?)",
                (session_id, workflow_id, _dump(data)),
            )


def get_checkpoint(session_id: str, workflow_id: str) -> dict[str, Any] | None:
    """读取 checkpoint；不存在返回 None。"""
    init_db()
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT data_json FROM workflow_checkpoints WHERE session_id = ? AND workflow_id = ?",
            (session_id, workflow_id),
        ).fetchone()
    return json.loads(row["data_json"]) if row else None


def record_submitted_action(idempotency_key: str, request_id: str, workflow_id: str, order_id: str | None) -> bool:
    """记录一次已提交的售后动作。

    幂等键是主键，重复提交会触发唯一约束冲突；返回 False 表示这是重复提交。
    """
    init_db()
    try:
        with closing(_connect()) as conn:
            with conn:
                conn.execute(
                    "INSERT INTO submitted_actions (idempotency_key, request_id, workflow_id, order_id) VALUES (?, ?, ?, ?)",
                    (idempotency_key, request_id, workflow_id, order_id),
                )
        return True
    except sqlite3.IntegrityError:
        return False


def get_submitted_action(idempotency_key: str) -> dict[str, Any] | None:
    """按幂等键读取已提交动作，用于识别重复恢复。"""
    init_db()
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT * FROM submitted_actions WHERE idempotency_key = ?",
            (idempotency_key,),
        ).fetchone()
    return dict(row) if row else None


def increment_message_count(session_id: str) -> int:
    """会话消息计数 +1 并返回新值。"""
    init_db()
    with closing(_connect()) as conn:
        with conn:
            conn.execute(
                "INSERT INTO session_state (session_id, message_count) VALUES (?, 1) "
                "ON CONFLICT(session_id) DO UPDATE SET message_count = message_count + 1, updated_at = datetime('now')",
                (session_id,),
            )
            row = conn.execute(
                "SELECT message_count FROM session_state WHERE session_id = ?",
                (session_id,),
            ).fetchone()
    return row["message_count"]


def save_session_memory(session_id: str, memory: dict[str, Any]) -> None:
    """保存会话记忆（最近订单、最近意图等轻量信息）。"""
    init_db()
    with closing(_connect()) as conn:
        with conn:
            conn.execute(
                "INSERT INTO session_state (session_id, memory_json) VALUES (?, ?) "
                "ON CONFLICT(session_id) DO UPDATE SET memory_json = excluded.memory_json, updated_at = datetime('now')",
                (session_id, _dump(memory)),
            )


def get_session_memory(session_id: str) -> dict[str, Any] | None:
    """读取会话记忆；不存在返回 None。"""
    init_db()
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT memory_json FROM session_state WHERE session_id = ?",
            (session_id,),
        ).fetchone()
    return json.loads(row["memory_json"]) if row and row["memory_json"] else None
