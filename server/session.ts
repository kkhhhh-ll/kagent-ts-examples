import type { MessageData, ToolCall } from "kagent-ts";
import { Role } from "kagent-ts";
import { OpenAIProvider } from "kagent-ts";
import { createLLM } from "./llm.js";
import { queryAll, queryOne, insertAndGetId, executeWrite } from "./database.js";

// ============ Q&A 会话（内存缓存） ============

export interface QASession {
  llm: OpenAIProvider;
  /** 完整消息历史（用于 LLM 上下文 + 前端展示） */
  messages: MessageData[];
  title: string;
  createdAt: number;
}

/** 内存中的会话缓存，key = sessionId */
const qaSessions = new Map<string, QASession>();

// ============ 数据库操作 ============

function rowToMessage(row: Record<string, any>): MessageData {
  const msg: MessageData = {
    role: row.role as Role,
    content: row.content || "",
  };
  if (row.tool_calls) {
    try {
      msg.tool_calls = JSON.parse(row.tool_calls) as ToolCall[];
    } catch {
      /* ignore corrupt JSON */
    }
  }
  if (row.tool_call_id) msg.tool_call_id = row.tool_call_id;
  if (row.name) msg.name = row.name;
  return msg;
}

/** 从数据库加载指定会话的所有消息 */
function loadMessages(sessionId: string): MessageData[] {
  const rows = queryAll<Record<string, any>>(
    "SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC",
    [sessionId],
  );
  return rows.map(rowToMessage);
}

/** 从数据库加载会话元信息 */
function loadSessionMeta(
  sessionId: string,
): { title: string; createdAt: number } | null {
  const row = queryOne<Record<string, any>>(
    "SELECT * FROM sessions WHERE id = ?",
    [sessionId],
  );
  if (!row) return null;
  return { title: row.title, createdAt: row.created_at };
}

/** 将消息持久化到数据库 */
function saveMessageToDb(sessionId: string, msg: MessageData): void {
  insertAndGetId(
    `INSERT INTO messages (session_id, role, content, tool_calls, tool_call_id, name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      msg.role,
      msg.content || "",
      msg.tool_calls ? JSON.stringify(msg.tool_calls) : null,
      msg.tool_call_id || null,
      msg.name || null,
      Date.now(),
    ],
  );
}

/** 更新会话标题到数据库 */
function updateSessionTitle(sessionId: string, title: string): void {
  executeWrite("UPDATE sessions SET title = ? WHERE id = ?", [title, sessionId]);
}

// ============ 导出接口 ============

export function getOrCreateQASession(sessionId: string): QASession {
  // 内存缓存命中
  const cached = qaSessions.get(sessionId);
  if (cached) return cached;

  // 尝试从数据库加载
  const meta = loadSessionMeta(sessionId);
  if (meta) {
    const messages = loadMessages(sessionId);
    const session: QASession = {
      llm: createLLM(),
      messages,
      title: meta.title,
      createdAt: meta.createdAt,
    };
    qaSessions.set(sessionId, session);
    return session;
  }

  // 新建
  const createdAt = Date.now();
  insertAndGetId(
    "INSERT INTO sessions (id, title, created_at) VALUES (?, ?, ?)",
    [sessionId, "新会话", createdAt],
  );

  const session: QASession = {
    llm: createLLM(),
    messages: [],
    title: "新会话",
    createdAt,
  };
  qaSessions.set(sessionId, session);
  return session;
}

export function getAllSessions() {
  const rows = queryAll<Record<string, any>>(
    `SELECT s.*,
            (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) AS msg_count
     FROM sessions s
     ORDER BY s.created_at DESC`,
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    msgCount: r.msg_count,
    createdAt: r.created_at,
  }));
}

export function deleteSession(sessionId: string): boolean {
  // 清除内存缓存
  qaSessions.delete(sessionId);
  // 数据库级联删除（先删消息，再删会话）
  executeWrite("DELETE FROM messages WHERE session_id = ?", [sessionId]);
  const affected = executeWrite("DELETE FROM sessions WHERE id = ?", [sessionId]);
  return affected > 0;
}

/**
 * 向会话追加一条消息（内存 + 数据库双写）
 */
export function pushSessionMessage(
  session: QASession,
  sessionId: string,
  msg: MessageData,
): void {
  session.messages.push(msg);
  saveMessageToDb(sessionId, msg);
}

/**
 * 更新会话标题（内存 + 数据库双写）
 */
export function setSessionTitle(
  session: QASession,
  sessionId: string,
  title: string,
): void {
  session.title = title;
  updateSessionTitle(sessionId, title);
}

// ============ SSE 工具函数 ============

/** SSE 数据推送 */
export function sendSSE(res: any, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/** 工具调用 accumulator：将流式 chunk 中的 tool_calls delta 合并为完整 ToolCall */
export function accumulateToolCalls(
  acc: Map<number, Partial<ToolCall>>,
  deltas: Array<{
    index: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  }>,
) {
  for (const d of deltas) {
    const existing = acc.get(d.index) || {
      id: "",
      type: "function" as const,
      function: { name: "", arguments: "" },
    };
    if (d.id) existing.id = d.id;
    if (d.function?.name) existing.function!.name! += d.function.name;
    if (d.function?.arguments) existing.function!.arguments! += d.function.arguments;
    acc.set(d.index, existing);
  }
}

/** 构建包含会话上下文和动态系统提示词的 LLM 消息列表 */
export function buildLLMMessages(
  session: QASession,
  userMessage: string,
  systemPrompt?: string,
): MessageData[] {
  return [
    { role: Role.System, content: systemPrompt ?? AGENT_SYSTEM_PROMPT },
    ...session.messages,
    { role: Role.User, content: userMessage },
  ] as MessageData[];
}

/** SSE 路线未激活技能时的默认系统提示词 */
const AGENT_SYSTEM_PROMPT = `你是一个智能助手，可以回答用户的问题，也可以使用技能来帮助用户完成各种任务。遇到超出自己能力范围的问题时，要诚实告诉用户，并尽力提供有用的信息。`;

/** 过滤出只供前端展示的消息（user + assistant） */
export function getDisplayMessages(session: QASession) {
  return session.messages
    .filter((m) => m.role === Role.User || m.role === Role.Assistant)
    .map((m) => ({ role: m.role, content: m.content || "" }));
}
