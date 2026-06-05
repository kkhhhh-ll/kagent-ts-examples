import { ReActAgent, SkillManager, TraceLogger } from "kagent-ts";
import type { Tool } from "kagent-ts";
import path from "path";
import fs from "fs";
import { PROJECT_ROOT, SERVER_DIR } from "./paths.js";
import { createLLM } from "./llm.js";

/** TraceLogger 输出目录（data/traces/，和 .db 文件放在一起） */
const TRACE_OUTPUT_DIR = path.resolve(SERVER_DIR, "data", "traces");

/** Skills 目录（server/skills/） */
const SKILLS_DIR = path.resolve(SERVER_DIR, "skills");

// ============ Trace 持久化（重启不丢） ============

/** trace 事件的 sidecar JSON 文件路径 */
function traceEventsPath(sessionId: string): string {
  return path.join(TRACE_OUTPUT_DIR, `${sessionId}.events.json`);
}

/** 持久化 trace 事件到 sidecar JSON（重启后可恢复） */
export function persistTraceEvents(
  logger: TraceLogger,
  sessionId: string,
): void {
  try {
    const events = logger.getEvents();
    if (events.length === 0) return;
    if (!fs.existsSync(TRACE_OUTPUT_DIR)) {
      fs.mkdirSync(TRACE_OUTPUT_DIR, { recursive: true });
    }
    fs.writeFileSync(
      traceEventsPath(sessionId),
      JSON.stringify(events),
      "utf-8",
    );
  } catch {
    // sidecar 文件写入失败不影响主流程
  }
}

/**
 * 从 sidecar JSON 文件中恢复 trace 事件到新创建的 TraceLogger。
 * 利用 `(logger as any)` 注入 events 数组（private 属性运行时仍可访问）。
 */
function restoreTraceEvents(logger: TraceLogger, sessionId: string): void {
  try {
    const filePath = traceEventsPath(sessionId);
    if (!fs.existsSync(filePath)) return;
    const raw = fs.readFileSync(filePath, "utf-8");
    const events = JSON.parse(raw);
    if (!Array.isArray(events) || events.length === 0) return;
    (logger as any).events = events;
    (logger as any).eventId = events.length;
  } catch {
    // 恢复失败就当新会话处理
  }
}

/** 创建 TraceLogger 并恢复历史事件 */
function createPersistentTraceLogger(
  sessionId: string,
  agentLabel: string,
): TraceLogger {
  const llm = createLLM();
  const modelName = (llm as any).model || process.env.OPENAI_MODEL || "gpt-4o";
  const logger = new TraceLogger({
    sessionId,
    modelName,
    agentLabel,
    outputDir: TRACE_OUTPUT_DIR,
  });
  // 恢复重启前的事件，保证 trace 完整
  restoreTraceEvents(logger, sessionId);
  return logger;
}

// ============ 基础系统提示词 ============

/**
 * 基础系统提示词 — 只包含智能助手的基础身份信息。
 * 具体的技能指令（如工单创建、日报编写等）通过 kagent-ts 的 Skill 机制
 * 自动加载到提示词中，无需在此处硬编码。
 *
 */
export const AGENT_SYSTEM_PROMPT = `你是一个智能助手，可以回答用户的问题，也可以使用技能来帮助用户完成各种任务。遇到超出自己能力范围的问题时，要诚实告诉用户，并尽力提供有用的信息。

## 工具调用规则
- 用户问不相关的问题（如推荐歌曲、闲聊等），**绝对不要调用任何工具**，正常回答即可
`;

// ============ Agent 对话管理（ReAct 路线） ============

const agentSessions = new Map<string, ReActAgent>();
const traceLoggers = new Map<string, TraceLogger>();

export function getOrCreateAgent(sessionId: string, tools: Tool[]): ReActAgent {
  let agent = agentSessions.get(sessionId);
  if (!agent) {
    const llm = createLLM();
    const traceLogger = createPersistentTraceLogger(sessionId, "工单助手");
    traceLoggers.set(sessionId, traceLogger);

    agent = new ReActAgent({
      llm,
      tools,
      hooks: traceLogger,
      systemPrompt: AGENT_SYSTEM_PROMPT,
      skillsDir: SKILLS_DIR, // 每个 agent 实例拥有独立的 SkillManager，自动检测并加载技能
      maxIterations: 20,
      preferences: {
        language: "Always respond in Chinese.",
      },
    });
    agentSessions.set(sessionId, agent);
  }
  return agent;
}

/** 获取指定会话的 TraceLogger（用于 SSE 路线手动追踪） */
export function getTraceLogger(sessionId: string): TraceLogger | undefined {
  return traceLoggers.get(sessionId);
}

/** 获取或创建指定会话的 TraceLogger（SSE 路线按会话复用） */
export function getOrCreateSessionTraceLogger(sessionId: string): TraceLogger {
  const existing = traceLoggers.get(sessionId);
  if (existing) return existing;

  const logger = createPersistentTraceLogger(sessionId, "智能助手");
  traceLoggers.set(sessionId, logger);
  return logger;
}

// ============ SSE 路线 — 按会话管理 SkillManager ============

/**
 * SSE 路线不使用 ReActAgent，而是手动管理 LLM 调用循环。
 * 因此需要为每个会话单独维护 SkillManager，技能激活状态按会话隔离。
 */
const sseSkillManagers = new Map<string, SkillManager>();

/**
 * 获取或创建指定会话的 SkillManager。
 * 技能注册仅在首次创建时执行一次。
 */
export function getOrCreateSSESkillManager(sessionId: string): SkillManager {
  let sm = sseSkillManagers.get(sessionId);
  if (!sm) {
    sm = new SkillManager();
    sm.registerFromDirectory(SKILLS_DIR);
    sseSkillManagers.set(sessionId, sm);
  }
  return sm;
}

/**
 * 为 SSE 路线构建包含技能信息的完整系统提示词。
 *
 * 1. 检测用户输入中的技能关键词，自动激活匹配的技能
 * 2. 在基础提示词后追加未激活技能的提示（渐进披露）
 * 3. 追加已激活技能的完整指令
 */
export function buildSSESystemPrompt(
  skillManager: SkillManager,
  userMessage: string,
): string {
  const activated = skillManager.detectAndActivate(userMessage);
  if (activated.length > 0) {
    console.log(`[Skills] SSE route activated: ${activated.join(", ")}`);
  }

  const parts: string[] = [AGENT_SYSTEM_PROMPT];

  const hint = skillManager.buildAvailableSkillsHint();
  if (hint) parts.push(hint);

  const skillsPrompt = skillManager.buildSkillsPrompt();
  if (skillsPrompt) parts.push(skillsPrompt);

  return parts.join("\n\n");
}

// ============ 会话清理 ============

export function deleteAgent(sessionId: string) {
  agentSessions.delete(sessionId);
  traceLoggers.delete(sessionId);
  sseSkillManagers.delete(sessionId);
}

// ============ 应用层日志 → Trace ============

export type TraceLogLevel = "info" | "warn" | "error";

/**
 * 向会话的 trace 中写入一条日志/错误记录，事件会自动出现在 HTML 报告中。
 *
 * - info / warn → 显示为 💭 Thought 事件
 * - error → 显示为 ⚠️ Tool Error 事件（红色高亮）
 *
 * 写入后自动 flush，确保文件始终是最新状态。
 */
export function traceLog(
  sessionId: string,
  level: TraceLogLevel,
  message: string,
  data?: Record<string, unknown>,
): void {
  const logger = traceLoggers.get(sessionId);
  if (!logger) return;

  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  const tag = `[${level.toUpperCase()}]`;

  if (level === "error") {
    logger.onToolError(
      message,
      `${tag} ${timestamp} — ${message}${
        data ? "\n数据: " + JSON.stringify(data, null, 2) : ""
      }`,
    );
  } else {
    const detail = data ? ` — ${JSON.stringify(data)}` : "";
    logger.onThought(`${tag} ${timestamp} ${message}${detail}`);
  }

  logger.flush();
  persistTraceEvents(logger, sessionId);
}
