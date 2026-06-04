import express from "express";
import cors from "cors";
import path from "path";
import { PROJECT_ROOT } from "./paths.js";
import qaRouter from "./routes/qa.js";
import orderRouter from "./routes/orders.js";
import planRouter from "./routes/plans.js";
import { initDatabase } from "./database.js";
import { loadConfig, printConfigSummary } from "./config.js";

// ============ 启动配置校验 ============

const config = loadConfig();
printConfigSummary(config);

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// ============ 静态文件 ============

// 提供 trace HTML 报告访问：http://localhost:3001/traces/<sessionId>.html
const TRACES_DIR = path.resolve(PROJECT_ROOT, "data", "traces");
app.use("/traces", express.static(TRACES_DIR));

// 生产环境：提供前端构建产物（dist/）
const DIST_DIR = path.resolve(PROJECT_ROOT, "dist");

// ============ 挂载路由 ============

app.use("/api/qa", qaRouter);
app.use("/api/orders", orderRouter);
app.use("/api/plans", planRouter);

// ============ 可选：前端静态文件 + SPA 回退 ============
// 前后端分别部署时关闭此功能，前端由 Nginx / CDN 独立托管。
// 设置 SERVE_STATIC=true 来启用。

if (config.serveStatic) {
  app.use(express.static(DIST_DIR));
  // SPA 回退：所有非 API 路由返回 index.html（API 路由已在上面优先匹配）
  app.get("*", (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

// ============ 全局错误处理 ============

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(
    JSON.stringify({
      level: "ERROR",
      timestamp: new Date().toISOString(),
      message: err?.message || "未知错误",
      stack: err?.stack?.split("\n").slice(0, 3).join(" | "),
    }),
  );
  res.status(err?.status || 500).json({
    error: err?.message || "服务器内部错误",
  });
});

// ============ 启动 ============

initDatabase().then(() => {
  app.listen(config.port, () => {
    console.log(`✅ Q&A 服务已启动: http://localhost:${config.port}`);
  });
});
