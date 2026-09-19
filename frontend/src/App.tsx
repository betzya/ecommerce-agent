import { FormEvent, useState } from "react";

import { MessageList } from "./components/MessageList";
import { ServiceStatusPanel } from "./components/ServiceStatusPanel";
import { TracePanel } from "./components/TracePanel";
import { useAgentChat } from "./hooks/useAgentChat";
import type { AgentCapabilityManifest, ChatResponse, DemoUser, DemoUserCreatePayload } from "./types/api";

// 调试后台固定开放的能力清单（前端不再依赖后端的 /capabilities 端点）
const DEBUG_CAPABILITIES: AgentCapabilityManifest = {
  schema_version: "agent_capabilities_v1",
  lesson: { id: "debug-console", title: "电商客服 Agent", summary: "" },
  agent: { name: "电商客服 Agent", version: "debug" },
  endpoints: { health: true, chat: true, chat_resume: true, trace: true },
  features: {
    chat: true,
    tool_calls: true,
    realtime_business_facts: true,
    rag_citations: true,
    tool_rag_joint_answer: true,
    mcp: true,
    mcp_tools: true,
    mcp_resources: true,
    mcp_prompts: true,
    memory: true,
    workflow: true,
    human_approval: true,
    cost_summary: true,
    hooks: true,
    trace: true,
  },
  disabled_reasons: {},
};

export default function App() {
  const {
    users,
    selectedUser,
    selectedUserId,
    messages,
    isLoading,
    isResuming,
    isCreatingUser,
    activeResponse,
    traceEvents,
    resumeResult,
    health,
    healthError,
    selectUser,
    createUser,
    sendMessage,
    resumeWorkflow,
    refreshHealth,
  } = useAgentChat();
  const [draft, setDraft] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isLoading || !draft.trim()) {
      return;
    }
    await sendMessage(draft.trim());
    setDraft("");
  }

  async function handleClarificationCandidateSelect(candidateValue: string) {
    if (isLoading || !candidateValue.trim()) {
      return;
    }
    const followUp = buildClarificationFollowUp(candidateValue.trim(), activeResponse);
    setDraft(followUp);
    await sendMessage(followUp);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">E-commerce Agent Debug Console</p>
          <h1>电商客服 Agent 调试后台</h1>
        </div>
        <p>围绕电商客户服务，观察工具、RAG、工作流、HITL、Hooks 和成本信号如何支撑 Agent 回答。</p>
      </header>

      <UserSwitcher
        users={users}
        selectedUserId={selectedUserId}
        selectedUser={selectedUser}
        isCreatingUser={isCreatingUser}
        onSelectUser={selectUser}
        onCreateUser={createUser}
      />

      <section className="top-grid" aria-label="对话与调试">
        <MessageList messages={messages} isLoading={isLoading} />
        <TracePanel
          response={activeResponse}
          traces={traceEvents}
          selectedReasoningView="summary"
          toggles={{ tools: true, rag: true, reasoning: false }}
          resumeResult={resumeResult}
          isResuming={isResuming}
          isChatLoading={isLoading}
          capabilities={DEBUG_CAPABILITIES}
          onClarificationCandidateSelect={handleClarificationCandidateSelect}
          onResumeWorkflow={resumeWorkflow}
        />
      </section>

      <section className="bottom-grid" aria-label="输入与状态">
        <form className="panel composer-panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <span>输入用户问题</span>
          </div>

          <textarea
            id="question"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={isLoading}
            rows={4}
            placeholder="例如：SO20260601090000008-a1000008 还没发货，我现在能退款吗？"
          />

          <div className="composer-actions">
            <button className="submit-button" disabled={isLoading} type="submit">
              {isLoading ? "处理中..." : "发送"}
            </button>
          </div>
        </form>

        <ServiceStatusPanel health={health} error={healthError} onRefresh={refreshHealth} />
      </section>
    </main>
  );
}

function buildClarificationFollowUp(candidateValue: string, response?: ChatResponse) {
  const clarificationField = stringValue((response?.clarification as Record<string, unknown> | undefined)?.clarification_field);
  const intent = response?.intent ?? stringValue(response?.session_state.intent);
  if (clarificationField === "sku") {
    return `查 ${candidateValue} 的库存和价格`;
  }
  if (intent === "refund_status_query" || intent?.includes("refund")) {
    return `查 ${candidateValue} 的退款进度`;
  }
  if (intent === "order_query" || intent?.includes("order")) {
    return `查 ${candidateValue} 的物流到哪了`;
  }
  return `我选择 ${candidateValue}`;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function UserSwitcher({
  users,
  selectedUserId,
  selectedUser,
  isCreatingUser,
  onSelectUser,
  onCreateUser,
}: {
  users: DemoUser[];
  selectedUserId: string;
  selectedUser: DemoUser;
  isCreatingUser: boolean;
  onSelectUser: (userId: string) => void;
  onCreateUser: (payload: DemoUserCreatePayload) => Promise<void>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<DemoUserCreatePayload>({
    userId: "",
    nickname: "",
    memberLevel: "normal",
    riskLevel: "low",
    preferredCategories: "",
    preferredDelivery: "",
    budgetMin: undefined,
    budgetMax: undefined,
    invoiceRequired: false,
  });
  const selectedPreferences = selectedUser.preferences;

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!form.userId.trim() || !form.nickname.trim()) {
      return;
    }
    await onCreateUser({
      ...form,
      userId: form.userId.trim(),
      nickname: form.nickname.trim(),
      preferredCategories: form.preferredCategories?.trim(),
      preferredDelivery: form.preferredDelivery?.trim(),
    });
    setIsAdding(false);
    setForm({
      userId: "",
      nickname: "",
      memberLevel: "normal",
      riskLevel: "low",
      preferredCategories: "",
      preferredDelivery: "",
      budgetMin: undefined,
      budgetMax: undefined,
      invoiceRequired: false,
    });
  }

  return (
    <section className="panel user-panel" aria-label="用户">
      <div className="panel-header">
        <span>用户</span>
        <small>切换用户会切换 Runtime Context、聊天历史和 trace</small>
      </div>
      <div className="user-layout">
        <div className="user-tabs">
          {users.map((user) => (
            <button
              key={user.profile.userId}
              type="button"
              className={user.profile.userId === selectedUserId ? "active" : ""}
              onClick={() => onSelectUser(user.profile.userId)}
            >
              <strong>{user.profile.nickname}</strong>
              <small>
                {user.profile.userId} · {user.profile.memberLevel} · risk {user.profile.riskLevel}
              </small>
            </button>
          ))}
          <button type="button" className={isAdding ? "active add-user" : "add-user"} onClick={() => setIsAdding((value) => !value)}>
            <strong>新增用户</strong>
            <small>写入电商后端</small>
          </button>
        </div>
        <div className="user-summary">
          <strong>
            {selectedUser.profile.nickname} / {selectedUser.profile.userId}
          </strong>
          <span>
            偏好：{selectedPreferences.preferredCategories || "未设置"} · 配送：
            {selectedPreferences.preferredDelivery || "未设置"} · 预算：
            {formatBudget(selectedPreferences.budgetMin, selectedPreferences.budgetMax)}
          </span>
        </div>
      </div>
      {isAdding ? (
        <form className="new-user-form" onSubmit={handleCreate}>
          <input
            value={form.userId}
            onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))}
            placeholder="用户 ID，例如 U2001"
          />
          <input
            value={form.nickname}
            onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))}
            placeholder="昵称"
          />
          <select value={form.memberLevel} onChange={(event) => setForm((current) => ({ ...current, memberLevel: event.target.value }))}>
            <option value="normal">normal</option>
            <option value="silver">silver</option>
            <option value="gold">gold</option>
          </select>
          <select value={form.riskLevel} onChange={(event) => setForm((current) => ({ ...current, riskLevel: event.target.value }))}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
          <input
            value={form.preferredCategories}
            onChange={(event) => setForm((current) => ({ ...current, preferredCategories: event.target.value }))}
            placeholder="偏好品类"
          />
          <input
            value={form.preferredDelivery}
            onChange={(event) => setForm((current) => ({ ...current, preferredDelivery: event.target.value }))}
            placeholder="配送偏好"
          />
          <input
            type="number"
            value={form.budgetMin ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, budgetMin: event.target.value ? Number(event.target.value) : undefined }))
            }
            placeholder="预算下限"
          />
          <input
            type="number"
            value={form.budgetMax ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, budgetMax: event.target.value ? Number(event.target.value) : undefined }))
            }
            placeholder="预算上限"
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={Boolean(form.invoiceRequired)}
              onChange={(event) => setForm((current) => ({ ...current, invoiceRequired: event.target.checked }))}
            />
            <span>偏好电子发票</span>
          </label>
          <button type="submit" disabled={isCreatingUser}>
            {isCreatingUser ? "创建中..." : "创建用户"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

function formatBudget(min?: number | null, max?: number | null) {
  if (typeof min === "number" && typeof max === "number") {
    return `${min}-${max}`;
  }
  if (typeof min === "number") {
    return `${min}+`;
  }
  if (typeof max === "number") {
    return `<=${max}`;
  }
  return "未设置";
}
