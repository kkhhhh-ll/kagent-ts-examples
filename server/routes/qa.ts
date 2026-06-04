import { Router } from "express";
import { Role, parseReActResponse } from "kagent-ts";
import type { ToolCall, MessageData } from "kagent-ts";
import {
  getOrCreateAgent,
  getTraceLogger,
  deleteAgent,
  getOrCreateSessionTraceLogger,
  traceLog,
  persistTraceEvents,
  getOrCreateSSESkillManager,
  buildSSESystemPrompt,
} from "../agent.js";
import {
  getOrCreateQASession,
  getAllSessions,
  deleteSession,
  sendSSE,
  accumulateToolCalls,
  buildLLMMessages,
  getDisplayMessages,
  pushSessionMessage,
  setSessionTitle,
} from "../session.js";
import { createWorkOrderTool } from "../tools/createWorkOrder.js";
import { createPlanTool } from "../tools/createPlanTool.js";

/** Agent 可用的所有工具 */
const AGENT_TOOLS = [createWorkOrderTool, createPlanTool];

/** 解析 ReAct JSON，只返回用户可见的 answer */
function extractAnswer(raw: string): string {
  if (!raw) return "";
  try {
    const parsed = parseReActResponse(raw);
    if (parsed.answer) return parsed.answer;
  } catch {}
  return raw;
}

/**
 * 从累积缓冲区中增量提取 answer 内容。
 * 处理 "answer": "回答内容" 格式，兼容 key/value 之间的空格。
 */

const router = Router();

// ============ 1. Agent 对话（非流式） ============

router.post<{}, any, { sessionId?: string; message: string }>(
  "/agent",
  async (req, res) => {
    const { sessionId: sid, message } = req.body;
    if (!message || !message.trim()) {
      res.status(400).json({ error: "消息不能为空" });
      return;
    }

    const sessionId = sid || `agent_${Date.now()}`;
    const agent = getOrCreateAgent(sessionId, AGENT_TOOLS);
    const qaSession = getOrCreateQASession(sessionId);

    if (qaSession.title === "新会话") {
      setSessionTitle(
        qaSession,
        sessionId,
        message.length > 20 ? message.slice(0, 20) + "…" : message,
      );
    }

    try {
      const reply = await agent.run(message);
      const logger = getTraceLogger(sessionId);
      if (logger) persistTraceEvents(logger, sessionId);
      pushSessionMessage(qaSession, sessionId, {
        role: Role.User,
        content: message,
      } as MessageData);
      pushSessionMessage(qaSession, sessionId, {
        role: Role.Assistant,
        content: reply,
      } as MessageData);
      res.json({ reply, sessionId });
    } catch (err: any) {
      traceLog(sessionId, "error", "Agent 运行出错", {
        message: err?.message,
      });
      console.error("Agent error:", err?.message || err);
      res.status(500).json({ error: err?.message || "处理出错" });
    }
  },
);

// ============ 2. SSE 流式 Q&A ============

router.post<{}, any, { sessionId?: string; message: string }>(
  "/",
  async (req, res) => {
    const { sessionId: clientSessionId, message } = req.body;
    if (!message || !message.trim()) {
      res.status(400).json({ error: "消息不能为空" });
      return;
    }

    const sid = clientSessionId || `session_${Date.now()}`;
    const session = getOrCreateQASession(sid);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    if (session.messages.length === 0 && session.title === "新会话") {
      setSessionTitle(
        session,
        sid,
        message.length > 20 ? message.slice(0, 20) + "…" : message,
      );
    }

    const skillManager = getOrCreateSSESkillManager(sid);
    const systemPrompt = buildSSESystemPrompt(skillManager, message);

    const MAX_ITERATIONS = 5;
    let currentMessages = buildLLMMessages(session, message, systemPrompt);
    let assistantContent = "";
    const traceLogger = getOrCreateSessionTraceLogger(sid);

    try {
      for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        let contentBuffer = "";
        let lastSentLen = 0;
        const toolCallsAcc = new Map<number, Partial<ToolCall>>();

        traceLogger.onLLMStart(currentMessages, AGENT_TOOLS);
        for await (const event of session.llm.chatStream(currentMessages, [
          ...AGENT_TOOLS,
        ])) {
          if (event.type === "chunk") {
            if (event.content) {
              contentBuffer += event.content;
              // 不做解析和过滤，直接推送原始内容，保证打字机效果和内容正常展示
              sendSSE(res, { content: event.content });
            }
            if (event.tool_calls && event.tool_calls.length > 0) {
              accumulateToolCalls(toolCallsAcc, event.tool_calls);
            }
          }
        }

        const toolCalls = Array.from(toolCallsAcc.values()).filter(
          (tc) => tc.id && tc.function?.name,
        );

        if (toolCalls.length > 0) {
          currentMessages.push({
            role: Role.Assistant,
            content: contentBuffer || "",
            tool_calls: toolCalls as ToolCall[],
          } as MessageData);

          for (const tc of toolCalls) {
            try {
              const args = JSON.parse(tc.function?.arguments || "{}");
              sendSSE(res, {
                tool_start: { name: tc.function?.name, arguments: args },
              });
              traceLogger.onToolStart(tc.function?.name || "unknown", args);
              const tool = AGENT_TOOLS.find(
                (t) => t.name === tc.function?.name,
              );
              if (!tool) throw new Error(`未知工具: ${tc.function?.name}`);
              const result = await tool.execute(args || {});
              traceLogger.onToolEnd(tc.function?.name || "unknown", result);
              let resObj: Record<string, unknown> = { raw: result };
              try { resObj = JSON.parse(result); } catch {}
              sendSSE(res, { tool_result: resObj });
              if (resObj.message) {
                sendSSE(res, { content: String(resObj.message) });
              }
              currentMessages.push({
                role: Role.Tool,
                content: result,
                tool_call_id: tc.id,
                name: tc.function?.name,
              } as MessageData);
            } catch (execErr: any) {
              traceLogger.onToolError(
                tc.function?.name || "unknown",
                execErr?.message || "未知错误",
              );
              currentMessages.push({
                role: Role.Tool,
                content: `工具执行失败: ${execErr?.message || "未知错误"}`,
                tool_call_id: tc.id,
                name: tc.function?.name,
              } as MessageData);
            }
          }

          assistantContent += extractAnswer(contentBuffer);
          continue;
        }

        assistantContent += extractAnswer(contentBuffer);
        break;
      }

      const finalContent = assistantContent || "(空回答)";
      traceLogger.flush();
      persistTraceEvents(traceLogger, sid);
      pushSessionMessage(session, sid, {
        role: Role.User,
        content: message,
      } as MessageData);
      pushSessionMessage(session, sid, {
        role: Role.Assistant,
        content: finalContent,
      } as MessageData);

      sendSSE(res, { done: true, sessionId: sid });
      res.end();
    } catch (err: any) {
      traceLog(sid, "error", "SSE 流式处理出错", {
        message: err?.message,
      });
      console.error("Stream error:", err?.message || err);
      sendSSE(res, { error: `处理请求时出错: ${err?.message || "未知错误"}` });
      res.end();
    }
  },
);

// ============ 3. 会话管理 ============

router.post("/new", (_req, res) => {
  const sessionId = `session_${Date.now()}`;
  getOrCreateQASession(sessionId);
  res.json({ sessionId });
});

router.get("/sessions", (_req, res) => {
  res.json({ sessions: getAllSessions() });
});

router.get("/:sessionId", (req, res) => {
  const qs = getOrCreateQASession(req.params.sessionId);
  res.json({
    sessionId: req.params.sessionId,
    messages: getDisplayMessages(qs),
    title: qs.title,
    createdAt: qs.createdAt,
  });
});

router.delete("/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const deleted = deleteSession(sessionId);
  deleteAgent(sessionId);
  if (!deleted) {
    res.status(404).json({ error: "会话不存在" });
    return;
  }
  res.json({ success: true });
});

export default router;
