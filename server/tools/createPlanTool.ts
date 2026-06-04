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
    const { date, content, creator, visitTime } = args as {
      date: string;
      content: string;
      creator: string;
      visitTime: string;
    };
    const plan = createPlan({ date, content, creator, visitTime });
    return JSON.stringify({
      success: true,
      id: plan.id,
      message: `团队计划创建成功！日期：${plan.date}，内容：${plan.content}，填写人：${plan.creator}，时间：${plan.visitTime}`,
    });
  },
};
