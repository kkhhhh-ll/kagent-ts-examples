import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import path from "path";
import fs from "fs";

// ============ 数据库文件路径 ============

/** 数据库存储在项目根目录的 data/ 文件夹下 */
const DB_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "work-orders.db");

let db: SqlJsDatabase | null = null;

// ============ 初始化 ============

/**
 * 初始化 SQLite 数据库（启动时调用一次）
 * - 存在 db 文件则加载，否则新建
 * - 自动建表（幂等）
 */
export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  // 确保 data 目录存在
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // 加载或新建数据库
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 建表（幂等，重复执行无害）
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      code        TEXT    NOT NULL,
      create_time TEXT    NOT NULL,
      creator     TEXT    NOT NULL,
      type        TEXT    NOT NULL,
      duration    REAL    NOT NULL,
      cost        REAL    NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL DEFAULT '新会话',
      created_at INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id   TEXT NOT NULL,
      role         TEXT NOT NULL,
      content      TEXT NOT NULL DEFAULT '',
      tool_calls   TEXT,
      tool_call_id TEXT,
      name         TEXT,
      created_at   INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS team_plans (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT    NOT NULL,
      content     TEXT    NOT NULL,
      creator     TEXT    NOT NULL,
      visit_time  TEXT    NOT NULL,
      create_time TEXT    NOT NULL
    )
  `);

  // 写入磁盘持久化
  flushDatabase();
  console.log(`📦 数据库已就绪: ${DB_PATH}`);
}

// ============ 数据库实例 ============

export function getDb(): SqlJsDatabase {
  if (!db) throw new Error("数据库尚未初始化，请先调用 initDatabase()");
  return db;
}

/** 将内存中的数据库写入磁盘文件 */
export function flushDatabase(): void {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ============ 便捷查询辅助 ============

export interface QueryResult<T> {
  columns: string[];
  values: T[][];
}

/** 执行 SELECT 查询，返回行对象数组 */
export function queryAll<T extends Record<string, any>>(
  sql: string,
  params?: any[],
): T[] {
  const stmt = getDb().prepare(sql);
  if (params) stmt.bind(params as any);

  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

/** 执行 SELECT 查询，返回第一行或 undefined */
export function queryOne<T extends Record<string, any>>(
  sql: string,
  params: any[],
): T | undefined {
  const stmt = getDb().prepare(sql);
  stmt.bind(params as any);

  let row: T | undefined;
  if (stmt.step()) {
    row = stmt.getAsObject() as T;
  }
  stmt.free();
  return row;
}

/** 执行 INSERT 并返回自增 ID */
export function insertAndGetId(sql: string, params: any[]): number {
  const db = getDb();
  db.run(sql, params as any);
  const result = db.exec("SELECT last_insert_rowid() AS id");
  const id = result[0].values[0][0] as number;
  flushDatabase();
  return id;
}

/** 执行 UPDATE / DELETE，返回受影响行数 */
export function executeWrite(sql: string, params: any[]): number {
  const db = getDb();
  db.run(sql, params as any);
  const result = db.exec("SELECT changes() AS affected");
  const affected = result[0].values[0][0] as number;
  flushDatabase();
  return affected;
}
