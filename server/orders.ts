import { queryAll, queryOne, insertAndGetId, executeWrite } from "./database.js";

// ============ 类型定义 ============

export interface StoredOrder {
  id: number;
  code: string;
  createTime: string;
  creator: string;
  type: string;
  duration: number;
  cost: number;
}

export interface CreateOrderInput {
  creator: string;
  type: string;
  duration: number;
  cost: number;
}

// ============ 内部辅助 ============

/** 将 SQLite 行数据（snake_case）转为 StoredOrder（camelCase） */
function rowToOrder(row: Record<string, any>): StoredOrder {
  return {
    id: row.id,
    code: row.code,
    createTime: row.create_time,
    creator: row.creator,
    type: row.type,
    duration: row.duration,
    cost: row.cost,
  };
}

/** 生成工单编号：WO-YYYYMMDD-NNN */
function generateOrderCode(todayCount: number): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const seq = String(todayCount + 1).padStart(3, "0");
  return `WO-${y}${m}${d}-${seq}`;
}

/** 查询今日已有工单数，用于生成编号 */
function getTodayOrderCount(): number {
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10);
  const row = queryOne<{ cnt: number }>(
    "SELECT COUNT(*) AS cnt FROM orders WHERE create_time LIKE ?",
    [`${datePrefix}%`],
  );
  return row?.cnt ?? 0;
}

// ============ CRUD ============

export function getAllOrders(): StoredOrder[] {
  const rows = queryAll<Record<string, any>>(
    "SELECT * FROM orders ORDER BY create_time DESC",
  );
  return rows.map(rowToOrder);
}

export function getOrderById(id: number): StoredOrder | undefined {
  const row = queryOne<Record<string, any>>(
    "SELECT * FROM orders WHERE id = ?",
    [id],
  );
  return row ? rowToOrder(row) : undefined;
}

export function createOrder(input: CreateOrderInput): StoredOrder {
  const todayCount = getTodayOrderCount();
  const code = generateOrderCode(todayCount);
  const createTime = new Date().toISOString();

  const id = insertAndGetId(
    `INSERT INTO orders (code, create_time, creator, type, duration, cost)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [code, createTime, input.creator, input.type, input.duration, input.cost],
  );

  return {
    id,
    code,
    createTime,
    creator: input.creator,
    type: input.type,
    duration: input.duration,
    cost: input.cost,
  };
}

export function updateOrder(
  id: number,
  data: Partial<CreateOrderInput>,
): StoredOrder | null {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.creator !== undefined) {
    fields.push("creator = ?");
    values.push(data.creator);
  }
  if (data.type !== undefined) {
    fields.push("type = ?");
    values.push(data.type);
  }
  if (data.duration !== undefined) {
    fields.push("duration = ?");
    values.push(data.duration);
  }
  if (data.cost !== undefined) {
    fields.push("cost = ?");
    values.push(data.cost);
  }

  if (fields.length === 0) return getOrderById(id) ?? null;

  values.push(id);
  const affected = executeWrite(
    `UPDATE orders SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );

  if (affected === 0) return null;
  return getOrderById(id) ?? null;
}

export function deleteOrder(id: number): boolean {
  const affected = executeWrite("DELETE FROM orders WHERE id = ?", [id]);
  return affected > 0;
}
