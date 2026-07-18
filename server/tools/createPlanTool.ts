import type { Tool } from "kagent-ts";
import { createPlan } from "../plans.js";

export const createPlanTool: Tool = {
  name: "create_team_plan",
  description: "创建团队计划。当用户确认创建团队计划后调用此工具。",
  parameters: {
    type: "object",
    properties: {
      date: { type: "string", description: "计划日期，格式 YYYY-MM-DD" },
      content: { type: "string", description: "计划内容" },
      creator: { type: "string", description: "填写人姓名" },
      visitTime: { type: "string", description: "拜访时间，格式 HH:mm~HH:mm，例如 09:00~10:30" },
    },
    required: ["date", "content", "creator", "visitTime"],
  },
  async execute(args) {
    try {
      const { date, content, creator, visitTime } = args as {
        date: string;
        content: string;
        creator: string;
        visitTime: string;
      };

      // 参数校验：返回结构化错误，让 LLM 能理解并引导用户修正
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return JSON.stringify({ success: false, error: "计划日期格式不正确，应为 YYYY-MM-DD" });
      }
      if (!content || !content.trim()) {
        return JSON.stringify({ success: false, error: "计划内容不能为空" });
      }
      if (!creator || !creator.trim()) {
        return JSON.stringify({ success: false, error: "填写人姓名不能为空" });
      }

      const plan = createPlan({ date, content, creator, visitTime });
      return JSON.stringify({
        success: true,
        id: plan.id,
        message: `团队计划创建成功！日期：${plan.date}，内容：${plan.content}，填写人：${plan.creator}，时间：${plan.visitTime}`,
      });
    } catch (err: any) {
      // 数据库写入等异常：不抛出，返回结构化失败结果，避免中断 Agent 循环
      return JSON.stringify({
        success: false,
        error: `创建团队计划失败：${err?.message || "未知错误"}`,
      });
    }
  },
};
