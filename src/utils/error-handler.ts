import type { App } from "vue";
import { ElNotification } from "element-plus";

/**
 * 注册 Vue 全局错误处理器。
 * - 组件渲染错误
 * - 侦听器错误
 * - 未捕获的 Promise 异常
 */
export function setupGlobalErrorHandler(app: App): void {
  app.config.errorHandler = (err: unknown, _instance, info) => {
    console.error(
      `[Vue Error] ${info}`,
      err instanceof Error ? err : new Error(String(err)),
    );

    // 非敏感错误才弹 UI 提示，避免频繁打扰
    if (err instanceof Error) {
      const msg = err.message;
      // 忽略组件库内部溢出等非关键错误
      if (
        msg.includes("ResizeObserver") ||
        msg.includes("MutationObserver") ||
        msg.includes("Failed to execute")
      ) {
        return;
      }
    }

    ElNotification.error({
      title: "页面异常",
      message: "页面发生了意外错误，请刷新重试",
      duration: 5000,
    });
  };

  // 未捕获的 Promise 拒绝（非 Vue 环境）
  window.addEventListener("unhandledrejection", (event) => {
    const err = event.reason;
    console.error("[Unhandled Rejection]", err);

    // 避免和 request.ts 里弹过消息的重复提示
    if (err instanceof DOMException && err.name === "AbortError") return;

    // 已取消的 fetch 不提示
    if (
      err instanceof Error &&
      (err.message?.includes("aborted") || err.message?.includes("timeout"))
    ) {
      return;
    }

    event.preventDefault();
  });
}
