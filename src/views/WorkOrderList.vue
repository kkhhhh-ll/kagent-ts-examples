<template>
  <div class="work-order-list">
    <!-- 搜索 / 筛选 -->
    <div class="list-toolbar">
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        新建工单
      </el-button>
    </div>

    <!-- 搜索 / 筛选 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="query" size="default">
        <el-form-item label="关键字">
          <el-input
            v-model="query.keyword"
            placeholder="单据编号 / 创建人"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="工单类型">
          <el-select
            v-model="query.type"
            placeholder="全部"
            clearable
            style="width: 140px"
            @change="handleSearch"
          >
            <el-option label="项目验收" value="项目验收" />
            <el-option label="项目赠送" value="项目赠送" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never" class="table-card">
      <el-table
        :data="list"
        stripe
        v-loading="loading"
        empty-text="暂无工单数据"
        height="100%"
      >
        <el-table-column prop="code" label="单据编号" />
        <el-table-column prop="createTime" label="创建时间">
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="creator" label="创建人" />
        <el-table-column prop="type" label="工单类型">
          <template #default="{ row }">
            <el-tag
              :type="row.type === '项目验收' ? 'success' : 'warning'"
              effect="plain"
            >
              {{ row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="工期" />
        <el-table-column prop="cost" label="费用（元）">
          <template #default="{ row }">
            {{ row.cost.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              @click="handleView(row)"
            >
              查看
            </el-button>
            <el-button
              link
              type="primary"
              size="small"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-popconfirm
              title="确定删除吗？"
              confirm-button-text="确定"
              cancel-button-text="取消"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :page-sizes="[5, 10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 新建 / 编辑弹窗 -->
    <WorkOrderForm
      :visible="formVisible"
      :order="editingOrder"
      @update:visible="formVisible = $event"
      @confirm="handleFormConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Plus } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import type { WorkOrder, WorkOrderFormData } from "@/types/workOrder";
import WorkOrderForm from "@/components/WorkOrderForm.vue";
import { api } from "@/utils/request";

const router = useRouter();

const list = ref<WorkOrder[]>([]);
const total = ref(0);
const loading = ref(false);
const formVisible = ref(false);
const editingOrder = ref<WorkOrder | null>(null);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: "",
  type: "",
});

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function fetchData() {
  loading.value = true;
  try {
    const data = await api.get<{ list: WorkOrder[] }>("/api/orders", {
      silent: true,
    });
    let filtered = data.list || [];
    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      filtered = filtered.filter(
        (o: any) =>
          o.code.toLowerCase().includes(kw) ||
          o.creator.toLowerCase().includes(kw),
      );
    }
    if (query.type) {
      filtered = filtered.filter((o: any) => o.type === query.type);
    }
    const len = filtered.length;
    const start = (query.page - 1) * query.pageSize;
    list.value = filtered.slice(start, start + query.pageSize) as WorkOrder[];
    total.value = len;
  } catch (err: any) {
    list.value = [];
    total.value = 0;
    const msg =
      err?.message === "Failed to fetch"
        ? "无法连接到后端服务，请确认后端已启动"
        : err?.message || "网络请求失败，请稍后重试";
    ElMessage.error(msg);
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  query.page = 1;
  fetchData();
}

function handleReset() {
  query.keyword = "";
  query.type = "";
  query.page = 1;
  fetchData();
}

function handleCreate() {
  editingOrder.value = null;
  formVisible.value = true;
}

function handleEdit(row: WorkOrder) {
  editingOrder.value = row;
  formVisible.value = true;
}

function handleView(row: WorkOrder) {
  router.push(`/detail/${row.id}`);
}

async function handleDelete(row: WorkOrder) {
  try {
    await api.delete(`/api/orders/${row.id}`, { silent: true });
    ElMessage.success("删除成功");
    if (list.value.length === 1 && query.page > 1) {
      query.page--;
    }
    fetchData();
  } catch {
    // 错误已在 request.ts 中弹提示
  }
}

async function handleFormConfirm(data: WorkOrderFormData) {
  try {
    if (editingOrder.value) {
      await api.put(`/api/orders/${editingOrder.value.id}`, data, {
        silent: true,
      });
      ElMessage.success("编辑成功");
    } else {
      await api.post("/api/orders", data, { silent: true });
      ElMessage.success("新建成功");
    }
    formVisible.value = false;
    fetchData();
  } catch {
    // 错误已在 request.ts 中弹提示
  }
}

onMounted(() => {
  fetchData();
});
</script>

<style lang="scss" scoped>
.work-order-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 24px 0;
  box-sizing: border-box;
}

.list-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.search-card {
  flex-shrink: 0;
  margin-bottom: 16px;
}

.table-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
  min-height: 0;
  overflow: hidden;

  :deep(.el-card__body) {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding-bottom: 0;
  }

  :deep(.el-table) {
    flex: 1;
    height: 100%;

    th.el-table__cell {
      background-color: #f5f7fa;
      color: #606266;
      font-weight: 600;
    }
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  padding: 12px 0 24px;
}

/* ===== 手机端 ===== */
@media (max-width: 767px) {
  .work-order-list {
    padding: 8px 12px 0;
  }

  .list-toolbar {
    justify-content: stretch;

    .el-button {
      width: 100%;
    }
  }

  .search-card {
    margin-bottom: 12px;
  }

  // 搜索表单堆叠
  .search-card :deep(.el-form--inline) {
    .el-form-item {
      display: block;
      width: 100%;
      margin-right: 0;
    }

    .el-form-item__label {
      display: block;
      text-align: left;
      padding-bottom: 4px;
    }

    .el-form-item__content {
      display: block;
      width: 100%;
    }

    .el-input,
    .el-select {
      width: 100% !important;
    }

    // 查询/重置按钮行：两个按钮各占一半
    .el-form-item:last-child {
      display: flex;
      gap: 8px;

      .el-button {
        flex: 1;
      }
    }
  }

  // 表格：缩小单元格、允许水平滚动
  .table-card {
    margin-bottom: 12px;

    :deep(.el-table) {
      th.el-table__cell,
      td.el-table__cell {
        padding: 6px 4px;
        font-size: 12px;
      }
    }

    // 手机上去掉固定列（操作列自然滚动）
    :deep(.el-table__fixed-right) {
      display: none !important;
    }

    :deep(.el-table__body-wrapper) {
      overflow-x: auto;
    }
  }

  // 分页精简
  .pagination-wrapper {
    justify-content: center;
    padding: 8px 0 16px;

    :deep(.el-pagination) {
      .el-pagination__total,
      .el-pagination__sizes,
      .el-pagination__jump {
        display: none;
      }

      .btn-prev,
      .btn-next {
        min-width: 36px;
        height: 36px;
      }

      .el-pager li {
        min-width: 36px;
        height: 36px;
        line-height: 36px;
      }
    }
  }
}
</style>
