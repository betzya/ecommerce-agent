import { useEffect, useMemo, useRef, useState } from "react";

import type {
  ChatResumeDecision,
  ChatResumeResponse,
  ChatResponse,
  ConversationMessage,
  DemoUser,
  DemoUserCreatePayload,
  RuntimeOrderContextResponse,
  TraceEvent,
} from "../types/api";

const AGENT_BASE_URL = import.meta.env.VITE_AGENT_BASE_URL ?? "http://localhost:8000";
const ECOMMERCE_BASE_URL = import.meta.env.VITE_ECOMMERCE_BASE_URL ?? "http://localhost:8081";
const AGENT_API_TOKEN = import.meta.env.VITE_AGENT_API_TOKEN ?? "";

const welcomeMessage: ConversationMessage = {
  role: "assistant",
  content: "欢迎来到电商客服 Agent 调试后台。请选择当前用户，或直接输入问题观察响应。",
};

const initialUsers: DemoUser[] = [
  {
    profile: { userId: "U1001", nickname: "张三", memberLevel: "gold", riskLevel: "low" },
    preferences: {
      userId: "U1001",
      preferredCategories: "耳机,充电器",
      preferredDelivery: "顺丰速运",
      budgetMin: 200,
      budgetMax: 800,
      invoiceRequired: true,
    },
  },
  {
    profile: { userId: "U1002", nickname: "李四", memberLevel: "silver", riskLevel: "low" },
    preferences: {
      userId: "U1002",
      preferredCategories: "音箱,户外数码",
      preferredDelivery: "普通快递",
      budgetMin: 100,
      budgetMax: 500,
      invoiceRequired: false,
    },
  },
  {
    profile: { userId: "U1003", nickname: "王五", memberLevel: "normal", riskLevel: "medium" },
    preferences: {
      userId: "U1003",
      preferredCategories: "",
      preferredDelivery: "",
      budgetMin: null,
      budgetMax: null,
      invoiceRequired: false,
    },
  },
];

type UserConversationState = {
  sessionId: string;
  messages: ConversationMessage[];
  activeResponse?: ChatResponse;
  traceEvents: TraceEvent[];
  resumeResult?: ChatResumeResponse;
};

function createConversationState(userId: string): UserConversationState {
  return {
    sessionId: `session-${userId}-${Math.random().toString(36).slice(2, 10)}`,
    messages: initialConversationMessages[userId]?.map((message) => ({ ...message })) ?? [welcomeMessage],
    traceEvents: [],
  };
}

const initialConversationMessages: Record<string, ConversationMessage[]> = {};

async function loadCourseRuntimeContext(userId: string): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(
      `${ECOMMERCE_BASE_URL}/api/course-debug/users/${encodeURIComponent(userId)}/order-context`,
    );
    if (!response.ok) {
      return {
        currentPage: "AGENT_WORKBENCH",
        currentUserOrders: [],
        currentUserOrdersTruncated: true,
      };
    }
    const envelope = (await response.json()) as { data?: RuntimeOrderContextResponse };
    if (!envelope.data || !Array.isArray(envelope.data.orders)) {
      return {
        currentPage: "AGENT_WORKBENCH",
        currentUserOrders: [],
        currentUserOrdersTruncated: true,
      };
    }
    return {
      currentPage: "AGENT_WORKBENCH",
      currentUserOrders: envelope.data.orders,
      currentUserOrdersTruncated: envelope.data.truncated === true,
    };
  } catch {
    return {
      currentPage: "AGENT_WORKBENCH",
      currentUserOrders: [],
      currentUserOrdersTruncated: true,
    };
  }
}

export function useAgentChat() {
  const [users, setUsers] = useState<DemoUser[]>(initialUsers);
  const [selectedUserId, setSelectedUserId] = useState(initialUsers[0].profile.userId);
  const [conversationByUser, setConversationByUser] = useState<Record<string, UserConversationState>>(() =>
    Object.fromEntries(
      initialUsers.map((user) => [user.profile.userId, createConversationState(user.profile.userId)]),
    ),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [health, setHealth] = useState<Record<string, unknown> | undefined>();
  const [healthError, setHealthError] = useState<string | undefined>();
  const isSendingRef = useRef(false);

  const selectedUser = useMemo(
    () => users.find((user) => user.profile.userId === selectedUserId) ?? users[0],
    [selectedUserId, users],
  );
  const activeConversation = conversationByUser[selectedUserId] ?? createConversationState(selectedUserId);

  async function refreshHealth() {
    try {
      const response = await fetch(`${AGENT_BASE_URL}/health`);
      if (!response.ok) {
        throw new Error("健康检查失败");
      }
      setHealth((await response.json()) as Record<string, unknown>);
      setHealthError(undefined);
    } catch (error) {
      setHealth(undefined);
      setHealthError(error instanceof Error ? error.message : "健康检查失败");
    }
  }

  useEffect(() => {
    void refreshHealth();
  }, []);

  function updateActiveConversation(updater: (current: UserConversationState) => UserConversationState) {
    setConversationByUser((current) => {
      const existing = current[selectedUserId] ?? createConversationState(selectedUserId);
      const next = { ...current, [selectedUserId]: updater(existing) };
      return next;
    });
  }

  function selectUser(userId: string) {
    setSelectedUserId(userId);
    setConversationByUser((current) =>
      current[userId] ? current : persistConversations({ ...current, [userId]: createConversationState(userId) }),
    );
  }

  async function createUser(payload: DemoUserCreatePayload) {
    setIsCreatingUser(true);
    try {
      const response = await fetch(`${ECOMMERCE_BASE_URL}/api/users/demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => undefined)) as { message?: string; detail?: string } | undefined;
        throw new Error(formatErrorDetail(errorPayload?.message ?? errorPayload?.detail));
      }
      const envelope = (await response.json()) as { data: DemoUser };
      const created = envelope.data;
      setUsers((current) => [...current.filter((user) => user.profile.userId !== created.profile.userId), created]);
      setConversationByUser((current) => ({
        ...persistConversations({
          ...current,
          [created.profile.userId]: createConversationState(created.profile.userId),
        }),
      }));
      setSelectedUserId(created.profile.userId);
    } finally {
      setIsCreatingUser(false);
    }
  }

  async function sendMessage(userMessage: string) {
    if (isSendingRef.current) {
      return;
    }

    isSendingRef.current = true;
    setIsLoading(true);
    const userId = selectedUserId;
    const sessionId = activeConversation.sessionId;
    updateActiveConversation((current) => ({
      ...current,
      messages: [...current.messages, { role: "user", content: userMessage }],
    }));

    try {
      const runtimeContext = await loadCourseRuntimeContext(userId);
      const chatResponse = await fetch(`${AGENT_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(AGENT_API_TOKEN ? { "X-Agent-API-Token": AGENT_API_TOKEN } : {}),
        },
        body: JSON.stringify({
          session_id: sessionId,
          runtime_user_id: userId,
          runtime_nickname: selectedUser.profile.nickname,
          runtime_member_level: selectedUser.profile.memberLevel,
          runtime_risk_level: selectedUser.profile.riskLevel,
          user_message: userMessage,
          history_messages: activeConversation.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          reasoning_view: "summary",
          debug: true,
          runtime_context: runtimeContext,
        }),
      });

      if (!chatResponse.ok) {
        const errorPayload = (await chatResponse.json().catch(() => undefined)) as { detail?: string } | undefined;
        throw new Error(formatErrorDetail(errorPayload?.detail));
      }

      const payload = (await chatResponse.json()) as ChatResponse;
      setConversationByUser((current) => {
        const existing = current[userId] ?? createConversationState(userId);
        return persistConversations({
          ...current,
          [userId]: {
            ...existing,
            messages: [...existing.messages, { role: "assistant", content: payload.answer, response: payload }],
            activeResponse: payload,
            resumeResult: undefined,
          },
        });
      });

      await refreshTrace(userId, sessionId);
    } catch (error) {
      setConversationByUser((current) => {
        const existing = current[userId] ?? createConversationState(userId);
        return persistConversations({
          ...current,
          [userId]: {
            ...existing,
            messages: [
              ...existing.messages,
              { role: "assistant", content: error instanceof Error ? error.message : "Agent 请求失败" },
            ],
          },
        });
      });
    } finally {
      isSendingRef.current = false;
      setIsLoading(false);
    }
  }

  async function resumeWorkflow(decision: ChatResumeDecision, reviewerNote: string) {
    const userId = selectedUserId;
    const conversation = conversationByUser[userId];
    const workflow = conversation?.activeResponse?.session_state.workflow;
    if (!conversation || !workflow?.workflow_id || !workflow.resume_token) {
      return;
    }

    setIsResuming(true);
    try {
      const resumeResponse = await fetch(`${AGENT_BASE_URL}/chat/resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(AGENT_API_TOKEN ? { "X-Agent-API-Token": AGENT_API_TOKEN } : {}),
        },
        body: JSON.stringify({
          session_id: conversation.sessionId,
          workflow_id: workflow.workflow_id,
          resume_token: workflow.resume_token,
          reviewer_id: "debug-reviewer-001",
          reviewer_role: "after_sale_manager",
          decision,
          reviewer_note: reviewerNote,
        }),
      });

      if (!resumeResponse.ok) {
        const errorPayload = (await resumeResponse.json().catch(() => undefined)) as { detail?: string } | undefined;
        throw new Error(formatErrorDetail(errorPayload?.detail));
      }

      const payload = (await resumeResponse.json()) as ChatResumeResponse;
      setConversationByUser((current) => {
        const existing = current[userId] ?? createConversationState(userId);
        const activeResponse =
          existing.activeResponse && payload.session_state
            ? {
                ...existing.activeResponse,
                session_state: { ...existing.activeResponse.session_state, ...payload.session_state },
              }
            : existing.activeResponse;
        return persistConversations({
          ...current,
          [userId]: {
            ...existing,
            activeResponse,
            resumeResult: payload,
            messages: payload.answer
              ? [...existing.messages, { role: "assistant", content: payload.answer }]
              : existing.messages,
          },
        });
      });
      await refreshTrace(userId, conversation.sessionId);
    } catch (error) {
      updateActiveConversation((current) => ({
        ...current,
        messages: [
          ...current.messages,
          { role: "assistant", content: error instanceof Error ? error.message : "审批恢复请求失败" },
        ],
      }));
    } finally {
      setIsResuming(false);
    }
  }

  async function refreshTrace(userId: string, sessionId: string) {
    const traceResponse = await fetch(`${AGENT_BASE_URL}/sessions/${sessionId}/trace`);
    if (traceResponse.ok) {
      const traces = (await traceResponse.json()) as TraceEvent[];
      setConversationByUser((current) => {
        const existing = current[userId] ?? createConversationState(userId);
        return persistConversations({ ...current, [userId]: { ...existing, traceEvents: traces } });
      });
    }
  }

  return {
    users,
    selectedUser,
    selectedUserId,
    messages: activeConversation.messages,
    isLoading,
    isResuming,
    isCreatingUser,
    activeResponse: activeConversation.activeResponse,
    traceEvents: activeConversation.traceEvents,
    resumeResult: activeConversation.resumeResult,
    agentBaseUrl: AGENT_BASE_URL,
    health,
    healthError,
    selectUser,
    createUser,
    sendMessage,
    resumeWorkflow,
    refreshHealth,
  };
}

function persistConversations(conversations: Record<string, UserConversationState>) {
  return conversations;
}

function formatErrorDetail(detail: unknown) {
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (detail) {
    return JSON.stringify(detail);
  }
  return "Agent 请求失败";
}
