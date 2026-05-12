/**
 * 模块级单例 WebSocket —— 整个应用共享一个连接实例
 * 所有组件调用 useWebSocket() 返回同一个对象
 */
import { ref } from "vue";
import { getDeviceIdentity, signPayload } from "../utils/device";

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

type WsStatus = "connecting" | "connected" | "disconnected";
type EventHandler = (payload: unknown) => void;

const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];
const MAX_RETRIES = 10;

// ── 模块级单例状态 ──────────────────────────────────────────────
const status = ref<WsStatus>("disconnected");
let ws: WebSocket | null = null;
let retryCount = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let connectTimer: ReturnType<typeof setTimeout> | null = null;
let shouldReconnect = true;
let savedToken = "";
let savedUrl = "";
const handlers = new Map<string, Set<EventHandler>>();
const pendingRequests = new Map<string, (res: unknown) => void>();
// ────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────

function on(event: string, handler: EventHandler) {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event)!.add(handler);
  return () => handlers.get(event)?.delete(handler);
}

function emit(event: string, payload: unknown) {
  handlers.get(event)?.forEach((h) => h(payload));
}

function send(frame: object) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(frame));
  }
}

async function sendConnectFrame(nonce: string = "") {
  // 使用中央身份工具获取 deviceId 和 publicKey
  const device = await getDeviceIdentity();
  const signedAt = Date.now();
  const SCOPES = [
    "operator.admin",
    "operator.approvals",
    "operator.pairing",
    "operator.read",
    "operator.write",
  ];
  const payload = [
    "v2",
    device.deviceId,
    "gateway-client",
    "backend",
    "operator",
    SCOPES.join(","),
    String(signedAt),
    savedToken,
    nonce,
  ].join("|");
  const signature = await signPayload(payload);
  send({
    type: "req",
    id: uuid(),
    method: "connect",
    params: {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: "gateway-client",
        version: "1.0.0",
        platform: "web",
        mode: "backend",
      },
      role: "operator",
      scopes: SCOPES,
      caps: [],
      auth: { token: savedToken },
      device: {
        id: device.deviceId,
        publicKey: device.publicKeyBase64,
        signedAt,
        nonce,
        signature,
      },
      locale: "zh-CN",
      userAgent: navigator.userAgent,
    },
  });
}

function request(method: string, params: object = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = uuid();
    pendingRequests.set(id, resolve);
    send({ type: "req", id, method, params });
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }
    }, 15000);
  });
}

function connect(token: string, url: string) {
  savedToken = token;
  savedUrl = url;
  shouldReconnect = true;
  if (ws) {
    ws.onclose = null;
    ws.close();
  }
  status.value = "connecting";

  ws = new WebSocket(url);

  // onopen 不发 connect —— 等服务端先发 connect.challenge
  ws.onopen = () => {
    // 等待短暂时间看是否收到 challenge，否则直接发送 connect
    connectTimer = setTimeout(() => {
      if (status.value === "connecting") {
        sendConnectFrame("");
      }
    }, 500);
  };

  ws.onmessage = async (e) => {
    console.log("Received message:", e.data);
    let frame: Record<string, unknown>;
    try {
      frame = JSON.parse(e.data);
    } catch {
      return;
    }

    if (frame.type === "res") {
      const id = frame.id as string;
      const resolve = pendingRequests.get(id);
      if (resolve) {
        resolve(frame);
        pendingRequests.delete(id);
      }

      // 错误处理：拦截 NOT_PAIRED 错误并发出事件
      if (frame.ok === false) {
        const err = frame.error as Record<string, unknown> | undefined;
        if (err?.code === "NOT_PAIRED") {
          emit("not-paired", err);
        }
        if (err?.code === "INVALID_REQUEST") {
          status.value = "disconnected";
          shouldReconnect = false;
          emit("invalid-request", err);
          ws?.close();
        }
      }

      // connect 握手响应：服务端以 res 帧返回，payload.type === 'hello-ok'
      const payload = frame.payload as Record<string, unknown> | undefined;
      if (frame.ok && payload?.type === "hello-ok") {
        status.value = "connected";
        retryCount = 0;
        // 从 snapshot 中提取 sessionKey
        const snapshot = payload.snapshot as Record<string, unknown> | undefined;
        const sessionDefaults = snapshot?.sessionDefaults as Record<string, unknown> | undefined;
        const sessionKey =
          (sessionDefaults?.mainSessionKey as string) ||
          `agent:${(sessionDefaults?.defaultAgentId as string) || "main"}:main`;
        emit("connected", { ...payload, sessionKey });
      }
      return;
    }

    if (frame.type === "event") {
      const ev = frame.event as string;

      // 服务端发出挑战 → 用设备密钥签名完整 payload 响应
      if (ev === "connect.challenge") {
        if (connectTimer) {
          clearTimeout(connectTimer);
          connectTimer = null;
        }
        const { nonce } = (frame.payload ?? {}) as { nonce?: string };
        await sendConnectFrame(nonce || "");
        return;
      }

      emit(ev, frame.payload);
    }
  };

  ws.onclose = (e) => {
    status.value = "disconnected";
    ws = null;
    if (e.code === 4001) {
      emit("auth-error", { code: e.code });
      return;
    }
    if (shouldReconnect && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)];
      emit("reconnecting", { attempt: retryCount + 1 });
      retryTimer = setTimeout(() => connect(savedToken, savedUrl), delay);
      retryCount++;
    } else if (retryCount >= MAX_RETRIES) {
      emit("max-retries", {});
    }
  };

  ws.onerror = () => {
    /* onclose handles retry */
  };
}

function disconnect() {
  shouldReconnect = false;
  if (retryTimer) clearTimeout(retryTimer);
  if (connectTimer) clearTimeout(connectTimer);
  ws?.close();
}

/** 返回模块级单例，全局共享同一 WS 连接 */
export function useWebSocket() {
  return { status, send, request, on, connect, disconnect };
}
