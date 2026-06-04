<template>
  <div class="work-order-detail">
    <div class="detail-header">
      <el-button @click="goBack" :icon="ArrowLeft" text> 返回 </el-button>
    </div>
    <el-card
      shadow="never"
      v-if="order"
      class="detail-card"
      v-loading="loading"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="单据编号" width="120px">
          {{ order.code }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatTime(order.createTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="创建人">
          {{ order.creator }}
        </el-descriptions-item>
        <el-descriptions-item label="工单类型">
          <el-tag
            :type="order.type === '项目验收' ? 'success' : 'warning'"
            effect="plain"
          >
            {{ order.type }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="工期">
          {{ order.duration }} 天
        </el-descriptions-item>
        <el-descriptions-item label="费用">
          {{ order.cost.toFixed(2) }} 元
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-empty v-else description="工单不存在" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import type { WorkOrder } from "@/types/workOrder";
import { api } from "@/utils/request";

const route = useRoute();
const router = useRouter();

function goBack() {
  router.back();
}

const order = ref<WorkOrder | null>(null);
const loading = ref(false);

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function fetchOrder() {
  const id = Number(route.params.id);
  if (isNaN(id)) {
    ElMessage.error("无效的工单 ID");
    order.value = null;
    return;
  }
  loading.value = true;
  try {
    order.value = await api.get<WorkOrder>(`/api/orders/${id}`, {
      silent: true,
    });
  } catch (err: any) {
    order.value = null;
    const msg =
      err?.message === "Failed to fetch"
        ? "无法连接到后端服务，请确认后端已启动"
        : err?.message || "网络请求失败，请稍后重试";
    ElMessage.error(msg);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchOrder);
</script>

<style lang="scss" scoped>
.work-order-detail {
  padding: 24px;
}

.detail-header {
  margin-bottom: 16px;
}

.detail-card {
  :deep(.el-descriptions__label) {
    font-weight: 600;
    color: #606266;
  }
}

/* ===== 平板端 ===== */
@media (min-width: 768px) and (max-width: 991px) {
  .work-order-detail {
    padding: 16px;
  }
}

/* ===== 手机端 ===== */
@media (max-width: 767px) {
  .work-order-detail {
    padding: 12px;
  }

  .detail-header {
    margin-bottom: 12px;
  }

  .detail-card {
    // 将 el-descriptions 的 border 表格从 table 布局折叠为块级堆叠
    :deep(.el-descriptions__table.is-bordered),
    :deep(.el-descriptions__table.is-bordered) tbody,
    :deep(.el-descriptions__table.is-bordered) tr,
    :deep(.el-descriptions__table.is-bordered) td {
      display: block;
      width: 100% !important;
      box-sizing: border-box;
    }

    // label 行：去掉底部边框，浅色背景，紧凑内边距
    :deep(.el-descriptions__label.is-bordered-label) {
      border-bottom: none !important;
      padding: 10px 12px 2px;
      background: #f9fafb;
      font-weight: 600;
      font-size: 13px;
      width: 100% !important;
    }

    // content 行：保留底部边框作为行分隔线
    :deep(.el-descriptions__content.is-bordered-content) {
      border-top: none !important;
      padding: 2px 12px 10px;
      width: 100% !important;
      font-size: 14px;
    }
  }
}
</style>
