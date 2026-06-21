<template>
  <div class="qa-layout">
    <!-- 侧边栏 -->
    <aside class="qa-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <!-- 展开状态 -->
      <template v-if="sidebarContentVisible">
        <div class="sidebar-header">
          <span class="sidebar-title">智能助手</span>
          <button
            class="sidebar-icon-btn"
            @click="handleNewSession"
            title="新建会话"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <div class="sidebar-list">
          <div
            v-for="s in sessionList"
            :key="s.id"
            class="sidebar-item"
            :class="{ active: s.id === sessionId }"
            @click="switchSession(s.id)"
          >
            <div class="sidebar-item-content">
              <div class="sidebar-item-title">{{ s.title }}</div>
            </div>
            <button
              class="sidebar-item-btn"
              :class="{ disabled: s.msgCount === 0 }"
              @click.stop="s.msgCount > 0 && openTrace(s.id)"
              :title="s.msgCount > 0 ? '查看轨迹' : '暂无对话记录'"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </button>
            <button
              v-if="sessionList.length > 1"
              class="sidebar-item-del"
              @click.stop="handleDeleteSession(s.id)"
              title="删除会话"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
          <div v-if="sessionList.length === 0" class="sidebar-empty">
            暂无会话
          </div>
        </div>

        <div class="sidebar-footer">
          <button class="sidebar-back-btn" @click="goBack">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>返回</span>
          </button>
          <button
            class="sidebar-collapse-btn"
            @click="sidebarCollapsed = true"
            title="折叠侧边栏"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <line x1="17" y1="5" x2="7" y2="12" />
              <line x1="17" y1="19" x2="7" y2="12" />
            </svg>
          </button>
        </div>
      </template>

      <!-- 折叠状态：只保留图标 -->
      <template v-else>
        <div class="sidebar-collapsed-top">
          <button
            class="sidebar-icon-btn"
            @click="handleNewSession"
            title="新建会话"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
        <div class="sidebar-collapsed-bottom">
          <button
            class="sidebar-icon-btn"
            @click="sidebarCollapsed = false"
            title="展开侧边栏"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <line x1="7" y1="5" x2="17" y2="12" />
              <line x1="7" y1="19" x2="17" y2="12" />
            </svg>
          </button>
          <button class="sidebar-icon-btn" @click="goBack" title="返回">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        </div>
      </template>
    </aside>

    <!-- 主聊天区 -->
    <main class="qa-main">
      <div class="chat-container" ref="chatRef">
        <div v-if="messages.length === 0" class="chat-empty">
          <h1>智能助手</h1>
          <p>有什么我可以帮你的？</p>
        </div>

        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="message"
          :class="msg.role"
        >
          <div class="message-icon">
            <svg
              v-if="msg.role === 'user'"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <svg
              v-else
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
              <path d="M4 14h16" />
              <path d="M12 14v7" />
            </svg>
          </div>
          <div class="message-content">{{ msg.content }}</div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="chat-input-area">
        <div class="chat-input-wrapper">
          <textarea
            ref="textareaRef"
            v-model="inputText"
            class="chat-input-box"
            placeholder="发送消息"
            :disabled="loading"
            @keydown.enter.prevent="handleSend"
            rows="1"
          />
          <button
            class="chat-mic-btn"
            :class="{ recording: isRecording }"
            :disabled="loading"
            @click="toggleVoice"
            :title="isRecording ? '点击停止录音' : '语音输入'"
          >
            <svg
              v-if="!isRecording"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
            <svg
              v-else
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          </button>
          <button
            class="chat-send-btn"
            :disabled="!inputText.trim() || loading"
            @click="handleSend"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p v-if="voiceError" class="chat-input-error">{{ voiceError }}</p>
        <!-- <p class="chat-input-hint">AI 助手生成的内容仅供参考</p> -->
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessageBox, ElMessage } from "element-plus";
import { api, API_BASE_URL } from "@/utils/request";

const router = useRouter();
const chatRef = ref<HTMLElement>();
const textareaRef = ref<HTMLTextAreaElement>();
const inputText = ref("");
const loading = ref(false);
const sidebarCollapsed = ref(false);
const sidebarContentVisible = ref(true);
const sessionId = ref("");
const messages = ref<{ role: string; content: string }[]>([]);
const sessionList = ref<{ id: string; title: string; msgCount: number }[]>([]);

let abortController: AbortController | null = null;
let recognition: any = null;
let voiceSilenceTimer: ReturnType<typeof setTimeout> | null = null;
const isRecording = ref(false);
const voiceSupported = ref(false);
const voiceError = ref("");

onMounted(() => {
  const hasApi = !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
  voiceSupported.value = hasApi;
  if (!hasApi) {
    voiceError.value = "当前浏览器不支持语音识别，请使用 Chrome 或 Edge";
  }

  // 小屏幕（<=767px）默认折叠侧边栏
  const mq = window.matchMedia("(max-width: 767px)");
  sidebarCollapsed.value = mq.matches;
  mq.addEventListener("change", (e) => {
    sidebarCollapsed.value = e.matches;
  });
});

// 折叠侧边栏时：立即隐藏内容；展开时：等待动画完成再展示内容
watch(sidebarCollapsed, (collapsed) => {
  if (collapsed) {
    sidebarContentVisible.value = false;
  } else {
    setTimeout(() => {
      sidebarContentVisible.value = true;
    }, 200);
  }
});

function toggleVoice() {
  if (isRecording.value) {
    stopVoice();
  } else {
    startVoice();
  }
}

function startVoice() {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  voiceError.value = "";
  let lastFinalLength = inputText.value.length;

  function resetSilenceTimer() {
    if (voiceSilenceTimer) clearTimeout(voiceSilenceTimer);
    voiceSilenceTimer = setTimeout(() => {
      stopVoice();
      voiceSilenceTimer = null;
    }, 7000);
  }

  recognition = new SpeechRecognition();
  recognition.lang = "zh-CN";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    let interimText = "";
    let finalText = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalText += result[0].transcript;
      } else {
        interimText += result[0].transcript;
      }
    }

    inputText.value =
      inputText.value.slice(0, lastFinalLength) + finalText + interimText;

    if (finalText) {
      lastFinalLength = inputText.value.length;
    }

    autoResize();
    resetSilenceTimer();
  };

  recognition.onerror = (event: any) => {
    if (voiceSilenceTimer) clearTimeout(voiceSilenceTimer);
    const errorMap: Record<string, string> = {
      "not-allowed": "麦克风权限被拒绝，请在浏览器设置中允许麦克风访问",
      "no-speech": "未检测到语音，请检查麦克风是否正常工作",
      "audio-capture": "未找到麦克风设备",
      network: "网络错误，语音识别需要网络连接",
      aborted: "录音已中止",
      "language-not-supported": "当前语言（中文）不受支持",
      "service-not-allowed": "语音识别服务不可用",
    };
    voiceError.value = errorMap[event.error] || `语音识别错误: ${event.error}`;
    isRecording.value = false;
    recognition = null;
    setTimeout(() => {
      voiceError.value = "";
    }, 3000);
  };

  recognition.onend = () => {
    if (voiceSilenceTimer) clearTimeout(voiceSilenceTimer);
    isRecording.value = false;
    recognition = null;
  };

  try {
    recognition.start();
    isRecording.value = true;
    resetSilenceTimer();
  } catch (e: any) {
    voiceError.value = `启动语音识别失败: ${e.message}`;
  }
}

function stopVoice() {
  if (voiceSilenceTimer) {
    clearTimeout(voiceSilenceTimer);
    voiceSilenceTimer = null;
  }
  if (recognition) {
    try {
      recognition.abort();
    } catch {
      /* ignore */
    }
    recognition = null;
  }
  isRecording.value = false;
}

function goBack() {
  router.push("/");
}

function openTrace(id: string) {
  window.open(`${API_BASE_URL}/traces/${id}.html`, "_blank");
}

function scrollToBottom() {
  nextTick(() => {
    if (chatRef.value) {
      chatRef.value.scrollTop = chatRef.value.scrollHeight;
    }
  });
}

function autoResize() {
  const ta = textareaRef.value;
  if (ta) {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }
}

watch(inputText, autoResize);
watch(messages, scrollToBottom, { deep: true });

// ====== 会话列表 ======

async function fetchSessions() {
  try {
    const data = await api.get<{ sessions: typeof sessionList.value }>(
      "/api/qa/sessions",
      { silent: true },
    );
    sessionList.value = data.sessions;
  } catch {
    sessionList.value = [];
  }
}

async function createNewSession() {
  const data = await api.post<{ sessionId: string }>("/api/qa/new", undefined, {
    silent: true,
  });
  return data.sessionId;
}

async function handleNewSession() {
  if (loading.value && abortController) {
    abortController.abort();
  }
  try {
    const sid = await createNewSession();
    sessionId.value = sid;
    messages.value = [];
    await fetchSessions();
  } catch {
    // 错误已在 request.ts 中弹提示
  }
}

async function switchSession(id: string) {
  if (loading.value && abortController) {
    abortController.abort();
  }
  sessionId.value = id;
  messages.value = [];
  try {
    const data = await api.get<{ messages: typeof messages.value }>(
      `/api/qa/${id}`,
      { silent: true },
    );
    messages.value = data.messages || [];
  } catch {
    // 静默失败，不弹提示
  }
}

async function handleDeleteSession(id: string) {
  try {
    await ElMessageBox.confirm("确定删除该会话？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }

  try {
    const isCurrentSession = sessionId.value === id;
    await api.delete(`/api/qa/${id}`, { silent: true });
    ElMessage.success("会话已删除");
    await fetchSessions();

    if (isCurrentSession) {
      // 删除的是当前会话 → 切到第一个剩余会话并加载真实消息
      const remaining = sessionList.value.filter((s) => s.id !== id);
      if (remaining.length > 0) {
        await switchSession(remaining[0].id);
      }
    }
  } catch {
    // 错误已在 request.ts 中弹提示
  }
}

// ====== 聊天 ======

async function handleSend() {
  const text = inputText.value.trim();
  if (!text || loading.value) return;

  inputText.value = "";
  if (textareaRef.value) {
    textareaRef.value.style.height = "auto";
  }
  loading.value = true;

  if (!sessionId.value) {
    try {
      sessionId.value = await createNewSession();
      await fetchSessions();
    } catch {
      loading.value = false;
      return;
    }
  }

  messages.value.push({ role: "user", content: text });
  const msgIdx = messages.value.length;
  messages.value.push({ role: "assistant", content: "" });

  abortController = new AbortController();
  // SSE 连接超时设为 120 秒（含多次 LLM 调用+工具链）
  const timeoutId = setTimeout(() => abortController?.abort(), 120000);

  try {
    // 首次启动后端时可能返回 502，最多重试 2 次
    let res: Response | null = null;
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        res = await fetch(`${API_BASE_URL}/api/qa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionId.value, message: text }),
          signal: abortController.signal,
        });
        if (res.ok) break;
        if (res.status !== 502 || attempt >= 2) {
          throw new Error(`请求失败 (${res.status})`);
        }
      } catch (err: any) {
        if (err.name === "AbortError") throw err;
        if (attempt >= 2) throw err;
        // 等待后重试（1s, 2s）
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
    }

    clearTimeout(timeoutId);

    if (!res || !res.ok) throw new Error(`请求失败 (${res?.status || "unknown"})`);
    if (!res.body) throw new Error("无响应体");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.content) {
            messages.value[msgIdx].content += data.content;
          }
          if (data.tool_start) {
            const label =
              data.tool_start.name === "create_work_order"
                ? "正在创建工单..."
                : `正在调用工具: ${data.tool_start.name}...`;
            messages.value[msgIdx].content += `\n\n_${label}_`;
          }
          if (data.tool_result) {
            const result = data.tool_result;
            if (result && result.message) {
              messages.value[msgIdx].content += `\n\n**${result.message}**`;
            }
          }
        } catch {
          // 跳过解析错误
        }
      }
    }

    // 刷新会话列表（标题可能已更新）
    await fetchSessions();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      messages.value[msgIdx].content = "请求超时，请检查网络后重试";
      ElMessage.warning("请求超时，已中断");
    } else {
      messages.value[msgIdx].content = `请求失败: ${err.message}`;
      ElMessage.error(`请求失败: ${err.message}`);
    }
  } finally {
    loading.value = false;
    abortController = null;
  }
}
onMounted(async () => {
  await fetchSessions();
  if (sessionList.value.length > 0) {
    await switchSession(sessionList.value[0].id);
  } else {
    // 没有会话时，自动创建一个新会话作为默认
    try {
      sessionId.value = await createNewSession();
      await fetchSessions();
    } catch {
      // 静默失败
    }
  }
});
</script>

<style scoped>
/* ===== 全局暗色 ===== */
.qa-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #212121;
  color: #ececf1;
  font-family:
    -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* ===== 侧边栏 ===== */
.qa-sidebar {
  width: 260px;
  min-width: 260px;
  background: #171717;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  transition:
    width 0.2s,
    min-width 0.2s;
}
.qa-sidebar.collapsed {
  width: 52px;
  min-width: 52px;
  align-items: stretch;
}

/* 通用图标按钮 */
.sidebar-icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #ececf1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  flex-shrink: 0;
}
.sidebar-icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 折叠状态的布局 */
.sidebar-collapsed-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 4px;
}
.sidebar-collapsed-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 4px;
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.sidebar-header {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  gap: 8px;
  flex-shrink: 0;
}

.sidebar-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #ececf1;
}

.sidebar-new-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: #ececf1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.sidebar-new-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 2px;
  transition: background 0.15s;
  position: relative;
}
.sidebar-item:hover {
  background: rgba(255, 255, 255, 0.06);
}
.sidebar-item.active {
  background: rgba(255, 255, 255, 0.1);
}
.sidebar-item:hover .sidebar-item-btn,
.sidebar-item:hover .sidebar-item-del {
  opacity: 1;
}

.sidebar-item-btn {
  opacity: 0;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    opacity 0.15s,
    color 0.15s,
    background 0.15s;
}
.sidebar-item-btn:hover {
  color: #58a6ff;
  background: rgba(88, 166, 255, 0.12);
}
.sidebar-item-btn.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.sidebar-item-btn.disabled:hover {
  color: rgba(255, 255, 255, 0.4);
  background: transparent;
}

.sidebar-item-content {
  flex: 1;
  min-width: 0;
}

.sidebar-item-title {
  font-size: 13px;
  color: #ececf1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-item-del {
  opacity: 0;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    opacity 0.15s,
    color 0.15s,
    background 0.15s;
}
.sidebar-item-del:hover {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
}

.sidebar-empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  padding: 32px 0;
  font-size: 13px;
}

.sidebar-footer {
  padding: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.sidebar-back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  border-radius: 8px;
  font-size: 13px;
  transition:
    background 0.15s,
    color 0.15s;
}
.sidebar-back-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #ececf1;
}

.sidebar-collapse-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    background 0.15s,
    color 0.15s;
}
.sidebar-collapse-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #ececf1;
}

/* ===== 主聊天区 ===== */
.qa-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #212121;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  scroll-behavior: smooth;
}

/* 滚动条 */
.chat-container::-webkit-scrollbar,
.sidebar-list::-webkit-scrollbar {
  width: 6px;
}
.chat-container::-webkit-scrollbar-track,
.sidebar-list::-webkit-scrollbar-track {
  background: transparent;
}
.chat-container::-webkit-scrollbar-thumb,
.sidebar-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

/* ===== 空状态 ===== */
.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  flex: 1;
}
.chat-empty h1 {
  font-size: 28px;
  font-weight: 600;
  color: #ececf1;
  margin: 0;
}
.chat-empty p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

/* ===== 消息 ===== */
.message {
  display: flex;
  gap: 16px;
  padding: 16px 48px;
  line-height: 1.65;
  font-size: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.message.user {
  background: #212121;
}
.message.assistant {
  background: #2a2a2a;
}

.message-icon {
  width: 28px;
  height: 28px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}
.message.user .message-icon {
  background: #5436da;
  color: #fff;
}
.message.assistant .message-icon {
  background: #10a37f;
  color: #fff;
}

.message-content {
  flex: 1;
  min-width: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: #ececf1;
}

/* ===== 输入区 ===== */
.chat-input-area {
  padding: 10px 48px 24px;
  flex-shrink: 0;
}

.chat-input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: #2a2a2a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 10px 12px;
  max-width: 768px;
  margin: 0 auto;
  transition: border-color 0.2s;
}
.chat-input-wrapper:focus-within {
  border-color: rgba(255, 255, 255, 0.25);
}

.chat-input-box {
  flex: 1;
  border: none;
  background: transparent;
  color: #ececf1;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  resize: none;
  max-height: 200px;
}
.chat-input-box::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.chat-send-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    background 0.15s,
    color 0.15s;
}
.chat-send-btn:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.2);
  color: #ececf1;
}
.chat-send-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

/* ===== 语音按钮 ===== */
.chat-mic-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    background 0.15s,
    color 0.15s;
}
.chat-mic-btn:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
}
.chat-mic-btn:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}
.chat-mic-btn.recording {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.12);
  animation: mic-pulse 1.2s ease-in-out infinite;
}
@keyframes mic-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.3);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(245, 108, 108, 0);
  }
}

.chat-input-hint {
  text-align: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.2);
  margin: 8px 0 0;
}

.chat-input-error {
  text-align: center;
  font-size: 12px;
  color: #f56c6c;
  margin: 6px 0 0;
}

/* ===== 手机端 ===== */
@media (max-width: 767px) {
  .qa-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
  }
  .qa-sidebar.collapsed {
    position: static;
  }

  .chat-mic-btn,
  .chat-input-error {
    display: none;
  }

  .message {
    padding: 14px 16px;
    gap: 12px;
  }

  .chat-input-area {
    padding: 8px 12px 16px;
  }

  .chat-input-wrapper {
    padding: 8px 10px;
  }

  .chat-empty h1 {
    font-size: 22px;
  }
}
</style>
