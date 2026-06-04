import { ElMessage } from "element-plus";

// ============ API 基础地址 ============

/** 后端 API 基础地址，前后端分别部署时通过构建时环境变量 VITE_API_BASE_URL 设置 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// ============ 类型 ============

export interface RequestOptions {
  /** 请求方法，默认 GET */
  method?: string;
  /** 请求体 */
  body?: unknown;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 超时时间（毫秒），默认 30000，传 0 禁用 */
  timeout?: number;
  /** 网络错误重试次数，默认 1 */
  retry?: number;
  /** 是否静默模式（失败不弹提示），默认 false */
  silent?: boolean;
}

// ============ 工具函数 ============

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError && err.message === "Failed to fetch";
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return String(err) || fallback;
}

// ============ 核心请求函数 ============

/**
 * 统一的请求封装，支持：
 * - 超时控制（AbortSignal.timeout）
 * - 网络错误自动重试（最多 retry 次）
 * - 非 2xx 自动抛错
 * - 可选静默模式（不弹 Message 提示）
 *
 * @example
 * ```ts
 * const data = await request<WorkOrder[]>('/api/orders');
 * await request('/api/orders', { method: 'POST', body: formData });
 * await request('/api/orders', { silent: true }); // 失败不弹提示
 * ```
 */
export async function request<T = any>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    timeout = 30000,
    retry = 1,
    silent = false,
  } = options;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  // 超时控制
  if (timeout > 0) {
    fetchOptions.signal = AbortSignal.timeout(timeout);
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const res = await fetch(API_BASE_URL + url, fetchOptions);

      if (!res.ok) {
        const errorText = await res
          .text()
          .catch(() => `HTTP ${res.status}`);
        throw new Error(
          errorText.startsWith("{") ? `请求失败 (${res.status})` : errorText,
        );
      }

      // 204 No Content
      if (res.status === 204) return undefined as T;

      return (await res.json()) as T;
    } catch (err: unknown) {
      lastError = err;

      // 中断请求（用户取消或超时），不重试
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }

      // 网络错误且还有重试次数 → 等待后重试
      if (isNetworkError(err) && attempt < retry) {
        await sleep(1000 * (attempt + 1)); // 1s, 2s 递增
        continue;
      }

      // 最后一次尝试也失败了 → 弹错误提示
      if (!silent) {
        const msg = getErrorMessage(err, "网络请求失败，请稍后重试");
        ElMessage.error(msg);
      }

      break;
    }
  }

  throw lastError;
}

// ============ 便捷方法 ============

export const api = {
  get<T>(url: string, opts?: RequestOptions) {
    return request<T>(url, { ...opts, method: "GET" });
  },
  post<T>(url: string, body?: unknown, opts?: RequestOptions) {
    return request<T>(url, { ...opts, method: "POST", body });
  },
  put<T>(url: string, body?: unknown, opts?: RequestOptions) {
    return request<T>(url, { ...opts, method: "PUT", body });
  },
  delete<T>(url: string, opts?: RequestOptions) {
    return request<T>(url, { ...opts, method: "DELETE" });
  },
};
