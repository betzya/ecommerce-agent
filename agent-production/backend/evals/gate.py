"""eval 门禁 CLI:运行全部评测用例,任何 case 失败就以非零退出码退出,供 CI 拦截。

运行前置:
  1. 电商后端已在跑(工具调用要真实订单数据),默认 http://127.0.0.1:8081;
  2. 模型 Key 已配置(agent-production/.env 或环境变量 AGENT_OPENAI_API_KEY)。

用法(在 backend 目录下):
  python -m evals.gate
"""

from __future__ import annotations

import os
import sys

from agents.customer_service_agent import CustomerServiceAgent
from config.logging_conf import setup_logging
from config.settings import CASES_PATH, api_key_is_missing, load_env
from evals.runner import EvalRunner


def main() -> int:
    load_env()

    if api_key_is_missing(os.getenv("AGENT_OPENAI_API_KEY")):
        print("❌ 缺少 AGENT_OPENAI_API_KEY,请先在 agent-production/.env 配置模型 Key")
        return 1

    setup_logging()
    report = EvalRunner(CustomerServiceAgent(), CASES_PATH).run()

    for result in report.results:
        if result.passed:
            continue
        print(f"\n❌ 失败 case: {result.case_id}")
        print(f"   问题类别: {', '.join(result.failure_categories) or 'unknown'}")
        print(f"   实际回答: {result.actual_answer}")
        print(f"   实际工具: {result.actual_tools}")
        if result.missing_signals:
            print(f"   缺失信号: {result.missing_signals}")
        if result.missing_tools:
            print(f"   缺失工具: {result.missing_tools}")
        if result.unexpected_tools:
            print(f"   不该调用的工具: {result.unexpected_tools}")
        if result.missing_citations:
            print(f"   缺失引用: {result.missing_citations}")
        if result.forbidden_citation_hits:
            print(f"   违规引用: {result.forbidden_citation_hits}")
        if result.missing_session_state:
            print(f"   状态不匹配: {result.missing_session_state}")
        if result.forbidden_text_hits:
            print(f"   命中禁止文本: {result.forbidden_text_hits}")

    print(f"\n{'✅ 通过' if not report.failed else '❌ 未通过'} eval 门禁: {report.passed}/{report.total} 通过")
    return 1 if report.failed else 0


if __name__ == "__main__":
    sys.exit(main())
