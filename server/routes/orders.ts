import { Router } from "express";
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
} from "../orders.js";

const router = Router();

router.get("/", (_req, res) => {
  const sorted = getAllOrders();
  res.json({ list: sorted, total: sorted.length });
});

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const order = getOrderById(id);
  if (!order) {
    res.status(404).json({ error: "工单不存在" });
    return;
  }
  res.json(order);
});

router.post("/", (req, res) => {
  const { creator, type, duration, cost } = req.body;
  if (!creator || !type || duration == null || cost == null) {
    res.status(400).json({ error: "缺少必填字段" });
    return;
  }
  const order = createOrder({ creator, type, duration, cost });
  res.json({ success: true, order });
});

router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const order = updateOrder(id, req.body);
  if (!order) {
    res.status(404).json({ error: "工单不存在" });
    return;
  }
  res.json({ success: true, order });
});

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!deleteOrder(id)) {
    res.status(404).json({ error: "工单不存在" });
    return;
  }
  res.json({ success: true });
});

export default router;
