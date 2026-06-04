import type { Tool } from "kagent-ts";
import { createOrder } from "../orders.js";

export const createWorkOrderTool: Tool = {
  name: "create_work_order",
  description: "创建工单。当用户确认创建工单后调用此工具。",
  parameters: {
    type: "object",
    properties: {
      creator: { type: "string", description: "创建人姓名" },
      type: {
        type: "string",
        enum: ["项目验收", "项目赠送"],
        description: "工单类型",
      },
      duration: {
        type: "number",
        description: "工期（天数），必须大于 0",
      },
      cost: {
        type: "number",
        description: "费用（元），必须大于等于 0",
      },
    },
    required: ["creator", "type", "duration", "cost"],
  },
  async execute(args) {
    const { creator, type, duration, cost } = args as {
      creator: string;
      type: string;
      duration: number;
      cost: number;
    };
    const order = createOrder({ creator, type, duration, cost });
    return JSON.stringify({
      success: true,
      id: order.id,
      code: order.code,
      message: `工单 ${order.code} 创建成功！`,
    });
  },
};
