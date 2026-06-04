import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// ============ 加载 .env ============

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn("⚠️  未找到 .env 文件，将使用环境变量");
}

// ============ 校验函数 ============

interface ConfigErrors {
  field: string;
  message: string;
}

function validateConfig(): ConfigErrors[] {
  const errors: ConfigErrors[] = [];
  const warns: string[] = [];

  // ─── OPENAI_API_KEY ──────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    errors.push({ field: "OPENAI_API_KEY", message: "未设置，请在 .env 中配置" });
  } else if (apiKey === "sk-your-api-key-here") {
    errors.push({
      field: "OPENAI_API_KEY",
      message: "使用了占位值 sk-your-api-key-here，请替换为真实的 API Key",
    });
  } else if (apiKey.length < 20) {
    warns.push("OPENAI_API_KEY 长度过短，请确认是否为有效的 API Key");
  }

  // ─── OPENAI_MODEL ────────────────────────────────────────────────
  const model = process.env.OPENAI_MODEL;
  if (model && model.length > 0) {
    const knownModels = [
      "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4",
      "o1", "o3", "o4-mini",
      "claude-", "deepseek-", "gemini-",
    ];
    const isKnown = knownModels.some((k) => model.startsWith(k));
    if (!isKnown) {
      warns.push(`OPENAI_MODEL="${model}" 不是 kagent-ts 常见模型，请确认拼写`);
    }
  }

  // ─── OPENAI_BASE_URL ─────────────────────────────────────────────
  const baseURL = process.env.OPENAI_BASE_URL;
  if (baseURL) {
    try {
      new URL(baseURL);
    } catch {
      warns.push(`OPENAI_BASE_URL="${baseURL}" 格式无效，将被忽略`);
    }
  }

  // ─── PORT ─────────────────────────────────────────────────────────
  const port = process.env.PORT;
  if (port) {
    const n = Number(port);
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      warns.push(`PORT="${port}" 不是有效的端口号 (1-65535)，将使用默认值 3001`);
    }
  }

  if (warns.length > 0) {
    for (const w of warns) {
      console.warn(`  ⚠️  ${w}`);
    }
  }

  return errors;
}

// ============ 运行时配置 ============

export interface AppConfig {
  /** OpenAI / 兼容 API 的 Key */
  apiKey: string;
  /** 模型名，默认 gpt-4o */
  model: string;
  /** 自定义 API 地址（可选） */
  baseURL: string | undefined;
  /** 服务端口，默认 3001 */
  port: number;
}

let config: AppConfig | null = null;

/**
 * 校验配置并返回结构化的配置对象。
 * 校验失败时打印错误并退出进程。
 */
export function loadConfig(): AppConfig {
  if (config) return config;

  const errors = validateConfig();

  if (errors.length > 0) {
    console.error("");
    console.error("❌  配置校验失败，请修复以下问题：");
    for (const e of errors) {
      console.error(`    ${e.field}: ${e.message}`);
    }
    console.error("");
    console.error("📄  参考模板：");
    console.error("    .env 文件内容示例：");
    console.error("    OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx");
    console.error("    OPENAI_MODEL=gpt-4o              # 可选");
    console.error("    PORT=3001                        # 可选");
    console.error("");
    process.exit(1);
  }

  config = {
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_MODEL || "gpt-4o",
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    port: Number(process.env.PORT) || 3001,
  };

  return config;
}

/**
 * 启动时打印配置摘要（隐藏 Key 中间部分）
 */
export function printConfigSummary(cfg: AppConfig): void {
  const maskedKey =
    cfg.apiKey.length > 12
      ? cfg.apiKey.slice(0, 6) + "…" + cfg.apiKey.slice(-4)
      : "***";

  console.log("");
  console.log("═══════════════════════════════════════");
  console.log("  智能助手 · 配置摘要");
  console.log("═══════════════════════════════════════");
  console.log(`  API Key    ${maskedKey}`);
  console.log(`  模型       ${cfg.model}`);
  console.log(`  接口地址   ${cfg.baseURL || "https://api.openai.com/v1"}`);
  console.log(`  端口       ${cfg.port}`);
  console.log("");
}
