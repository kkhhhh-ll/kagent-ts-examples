import { fileURLToPath } from "node:url";
import path from "node:path";

// ============ 计算项目根目录 ============

const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

/**
 * 项目根目录的绝对路径。
 *
 * 开发时（tsx）：脚本在 server/paths.ts → _dirname = server/ → 父目录是项目根目录
 * 生产时（编译后）：脚本在 server/dist/paths.js → _dirname = server/dist/ → 再往上一级
 *
 * 使用此常量替代 process.cwd()，确保无论从何处启动路径都正确。
 */
const _isDist = path.basename(_dirname) === "dist";
export const PROJECT_ROOT = _isDist
  ? path.resolve(_dirname, "../..")
  : path.resolve(_dirname, "..");

/**
 * 后端代码目录的绝对路径。
 *
 * 开发时（tsx）：就是 _dirname 本身（server/）
 * 生产时（编译后）：server/dist/ 的父目录（server/）
 *
 * 无论部署时叫 server 还是 backend，此路径始终正确。
 */
export const SERVER_DIR = _isDist
  ? path.resolve(_dirname, "..")
  : _dirname;
