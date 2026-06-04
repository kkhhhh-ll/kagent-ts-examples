import { Router } from "express";
import {
  getAllPlans,
  getPlanById,
  getPlansByDate,
  createPlan,
  updatePlan,
  deletePlan,
} from "../plans.js";

const router = Router();

router.get("/", (req, res) => {
  const { date } = req.query;
  if (date && typeof date === "string") {
    const list = getPlansByDate(date);
    res.json({ list, total: list.length });
    return;
  }
  const sorted = getAllPlans();
  res.json({ list: sorted, total: sorted.length });
});

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const plan = getPlanById(id);
  if (!plan) {
    res.status(404).json({ error: "计划不存在" });
    return;
  }
  res.json(plan);
});

router.post("/", (req, res) => {
  const { date, content, creator, visitTime } = req.body;
  if (!date || !content || !creator || !visitTime) {
    res.status(400).json({ error: "缺少必填字段" });
    return;
  }
  const plan = createPlan({ date, content, creator, visitTime });
  res.json({ success: true, plan });
});

router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const plan = updatePlan(id, req.body);
  if (!plan) {
    res.status(404).json({ error: "计划不存在" });
    return;
  }
  res.json({ success: true, plan });
});

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!deletePlan(id)) {
    res.status(404).json({ error: "计划不存在" });
    return;
  }
  res.json({ success: true });
});

export default router;
