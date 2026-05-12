import { defineStore } from "pinia";
import { ref } from "vue";

export interface Project {
  id: string;
  name: string;
  channelId: string;
  avatar?: string;
  orgType?: number;
  isMaster?: number;
}

export interface Session {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  backendId?: number; // 后端 pkId，来自 addChat 接口
}

export interface PlatformAction {
  label: string
  payload: unknown
}

export interface ActionPayload {
  action: "open_modal";
  modal: string;
  data: Record<string, unknown>;
  autoOpen: boolean;
}

export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // base64
  previewUrl?: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  actionJson?: ActionPayload;
  platformActions?: PlatformAction[];
  attachments?: Attachment[];
  status: "sending" | "streaming" | "done" | "error";
  createdAt: string;
  /** <MSG_SPLIT> 后拆分出的内容片段（竖向展示），仅第一条记录有 */
  splitContents?: string[];
}

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  totalMessages: number;
  lastUpdated: string;
}

export const useChatStore = defineStore("chat", () => {
  const projects = ref<Project[]>([]);
  const activeProjectId = ref<string>("");
  const sessions = ref<Session[]>([]);
  const activeSessionId = ref<string>("");
  const messages = ref<Message[]>([]);
  const wsStatus = ref<"connecting" | "connected" | "disconnected">(
    "disconnected",
  );
  const wsMaxRetries = ref(false); // true = 超出重试上限
  const agentRunning = ref(false);
  const usage = ref<UsageStats | null>(null);
  const switchingRole = ref(false); // 切换角色加载中
  const aiReplying = ref(false); // AI 正在回复中（禁止切换角色）

  function activeProject() {
    return projects.value.find((p) => p.id === activeProjectId.value) ?? null;
  }

  function activeSessionMessages() {
    return messages.value.filter((m) => m.sessionId === activeSessionId.value);
  }

  function sessionsByProject(projectId: string) {
    return sessions.value
      .filter((s) => s.projectId === projectId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  /** 退出登录时重置所有会话状态 */
  function resetAll() {
    sessions.value = []
    activeSessionId.value = ''
    messages.value = []
    aiReplying.value = false
  }

  return {
    projects,
    activeProjectId,
    sessions,
    activeSessionId,
    messages,
    wsStatus,
    wsMaxRetries,
    agentRunning,
    usage,
    switchingRole,
    aiReplying,
    activeProject,
    activeSessionMessages,
    sessionsByProject,
    resetAll,
  };
});
