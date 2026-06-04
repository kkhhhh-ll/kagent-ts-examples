import { queryAll, queryOne, insertAndGetId, executeWrite } from "./database.js";

// ============ 类型定义 ============

export interface StoredPlan {
  id: number;
  date: string;
  content: string;
  creator: string;
  visitTime: string;
  createTime: string;
}

export interface CreatePlanInput {
  date: string;
  content: string;
  creator: string;
  visitTime: string;
}

// ============ 内部辅助 ============

/** 将 SQLite 行数据（snake_case）转为 StoredPlan（camelCase） */
function rowToPlan(row: Record<string, any>): StoredPlan {
  return {
    id: row.id,
    date: row.date,
    content: row.content,
    creator: row.creator,
    visitTime: row.visit_time,
    createTime: row.create_time,
  };
}

// ============ CRUD ============

export function getAllPlans(): StoredPlan[] {
  const rows = queryAll<Record<string, any>>(
    "SELECT * FROM team_plans ORDER BY date DESC, id DESC",
  );
  return rows.map(rowToPlan);
}

export function getPlanById(id: number): StoredPlan | undefined {
  const row = queryOne<Record<string, any>>(
    "SELECT * FROM team_plans WHERE id = ?",
    [id],
  );
  return row ? rowToPlan(row) : undefined;
}

export function getPlansByDate(date: string): StoredPlan[] {
  const rows = queryAll<Record<string, any>>(
    "SELECT * FROM team_plans WHERE date = ? ORDER BY visit_time ASC",
    [date],
  );
  return rows.map(rowToPlan);
}

export function createPlan(input: CreatePlanInput): StoredPlan {
  const createTime = new Date().toISOString();

  const id = insertAndGetId(
    `INSERT INTO team_plans (date, content, creator, visit_time, create_time)
     VALUES (?, ?, ?, ?, ?)`,
    [input.date, input.content, input.creator, input.visitTime, createTime],
  );

  return {
    id,
    date: input.date,
    content: input.content,
    creator: input.creator,
    visitTime: input.visitTime,
    createTime,
  };
}

export function updatePlan(
  id: number,
  data: Partial<CreatePlanInput>,
): StoredPlan | null {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.date !== undefined) {
    fields.push("date = ?");
    values.push(data.date);
  }
  if (data.content !== undefined) {
    fields.push("content = ?");
    values.push(data.content);
  }
  if (data.creator !== undefined) {
    fields.push("creator = ?");
    values.push(data.creator);
  }
  if (data.visitTime !== undefined) {
    fields.push("visit_time = ?");
    values.push(data.visitTime);
  }

  if (fields.length === 0) return getPlanById(id) ?? null;

  values.push(id);
  const affected = executeWrite(
    `UPDATE team_plans SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );

  if (affected === 0) return null;
  return getPlanById(id) ?? null;
}

export function deletePlan(id: number): boolean {
  const affected = executeWrite("DELETE FROM team_plans WHERE id = ?", [id]);
  return affected > 0;
}
