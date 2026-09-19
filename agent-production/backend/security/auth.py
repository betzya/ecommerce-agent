"""调用方服务令牌验证。保护受控端点，只放行持有有效令牌的调用方。

注意：这是「服务间认证」，证明调用方是可信内部系统；它不替代「用户身份认证」，
runtime_user_id 仍需在接入真实登录后，由服务端认证注入。
"""

from __future__ import annotations

import os

from fastapi import Header, HTTPException

from config.settings import load_env

TOKEN_HEADER = "X-Agent-API-Token"


def verify_api_token(x_agent_api_token: str = Header(default="")) -> None:
    """验证调用方令牌；未配置或令牌不匹配则拒绝（fail closed）。"""
    load_env()
    configured = os.getenv("AGENT_API_TOKEN", "")
    if not configured or x_agent_api_token != configured:
        raise HTTPException(status_code=401, detail="无效的 API 令牌")
