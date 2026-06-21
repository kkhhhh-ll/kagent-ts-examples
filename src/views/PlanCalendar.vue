<template>
  <div class="plan-calendar">
    <!-- 顶部工具栏 -->
    <div class="calendar-toolbar">
      <div class="toolbar-left">
        <el-button text @click="goToday">今天</el-button>
        <el-button text @click="prevMonth">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <el-button text @click="nextMonth">
          <el-icon><ArrowRight /></el-icon>
        </el-button>
        <span class="toolbar-title">{{ year }}年{{ month }}月</span>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增计划
        </el-button>
      </div>
    </div>

    <!-- 星期头 -->
    <div class="calendar-header">
      <div v-for="d in weekDays" :key="d" class="header-cell">{{ d }}</div>
    </div>

    <!-- 日历网格 -->
    <div class="calendar-grid">
      <div
        v-for="(cell, idx) in calendarDays"
        :key="idx"
        class="calendar-cell"
        :class="{
          'is-current-month': cell.isCurrentMonth,
          'is-today': cell.isToday,
          'is-other-month': !cell.isCurrentMonth,
        }"
        @click="handleCellClick(cell)"
      >
        <div class="cell-day-row">
          <span v-if="cell.isToday" class="cell-day is-today">{{
            cell.day
          }}</span>
          <span v-else class="cell-day">{{ cell.day }}</span>
          <button
            v-if="cell.isCurrentMonth"
            class="cell-add-btn"
            title="新增计划"
            @click.stop="handleCellAdd(cell)"
          >
            <el-icon><Plus /></el-icon>
          </button>
        </div>
        <div class="cell-plans">
          <template v-for="plan in cell.displayPlans" :key="plan.id">
            <div
              class="cell-plan"
              :title="`${plan.creator} ${plan.visitTime} ${plan.content}`"
              @click.stop="handleEditPlan(plan)"
            >
              <span class="plan-flag">
                <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                  <path d="M2 2h10l-2 4 2 4H2V2z" />
                  <line x1="2" y1="2" x2="2" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </span>
              <span class="plan-body">
                <span class="plan-creator">{{ plan.creator }}</span>
                <span class="plan-time">{{ plan.visitTime }}</span>
              </span>
              <el-popconfirm
                title="确定删除吗？"
                confirm-button-text="确定"
                cancel-button-text="取消"
                @click.stop
                @confirm.stop="handleDeletePlan(plan)"
              >
                <template #reference>
                  <button class="plan-del-btn" @click.stop title="删除">
                    <el-icon><Close /></el-icon>
                  </button>
                </template>
              </el-popconfirm>
            </div>
          </template>
          <div
            v-if="cell.overflowCount > 0"
            class="cell-more"
            @click.stop="handleShowDayDetail(cell.dateStr)"
          >
            更多 {{ cell.overflowCount }} 条
          </div>
        </div>
      </div>
    </div>

    <!-- 新增/编辑计划弹窗 -->
    <PlanDialog
      :visible="dialogVisible"
      :plan="editingPlan"
      :default-date="selectedDate"
      @update:visible="dialogVisible = $event"
      @confirm="handlePlanConfirm"
    />

    <!-- 某天计划详情抽屉 -->
    <el-drawer
      v-model="detailVisible"
      :title="detailTitle"
      size="380px"
      :lock-scroll="false"
      @close="detailVisible = false"
    >
      <div v-if="detailPlans.length === 0" class="detail-empty">暂无计划</div>
      <div
        v-for="group in detailGroups"
        :key="group.creator"
        class="detail-group"
      >
        <div class="detail-group-title">
          <span class="group-flag">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M2 2h10l-2 4 2 4H2V2z" />
              <line x1="2" y1="2" x2="2" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </span>
          {{ group.creator }}
          <span class="group-count">{{ group.plans.length }} 条</span>
        </div>
        <div v-for="plan in group.plans" :key="plan.id" class="detail-item">
          <div class="detail-item-header">
            <span class="detail-item-time">{{ plan.visitTime }}</span>
            <div class="detail-item-actions">
              <el-button
                link
                type="primary"
                size="small"
                @click="handleEditFromDetail(plan)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确定删除吗？"
                confirm-button-text="确定"
                cancel-button-text="取消"
                @confirm="handleDeletePlan(plan)"
              >
                <template #reference>
                  <el-button link type="danger" size="small">删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
          <div class="detail-item-content">{{ plan.content }}</div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Plus, Close, ArrowLeft, ArrowRight } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import type { TeamPlan, PlanFormData } from "@/types/teamPlan";
import PlanDialog from "@/components/PlanDialog.vue";
import { api } from "@/utils/request";

// ==================== 状态 ====================

const plans = ref<TeamPlan[]>([]);
const year = ref(new Date().getFullYear());
const month = ref(new Date().getMonth() + 1);
const dialogVisible = ref(false);
const editingPlan = ref<TeamPlan | null>(null);
const selectedDate = ref("");
const detailVisible = ref(false);
const detailDate = ref("");

const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

// ==================== 日历计算 ====================

interface CalendarCell {
  day: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  displayPlans: TeamPlan[];
  overflowCount: number;
}

function getDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const calendarDays = computed<CalendarCell[]>(() => {
  const y = year.value;
  const m = month.value;
  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);
  const daysInMonth = lastDay.getDate();

  // 周一=1, 周日=0 → 调整为 周一=0 … 周日=6
  let startWeekday = firstDay.getDay() - 1;
  if (startWeekday < 0) startWeekday = 6;

  const prevMonthLastDay = new Date(y, m - 1, 0).getDate();
  const todayStr = getDateStr(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    new Date().getDate(),
  );

  const cells: CalendarCell[] = [];
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    let day: number, isCurrentMonth: boolean;

    if (i < startWeekday) {
      // 上月
      day = prevMonthLastDay - startWeekday + i + 1;
      isCurrentMonth = false;
    } else if (i >= startWeekday + daysInMonth) {
      // 下月
      day = i - (startWeekday + daysInMonth) + 1;
      isCurrentMonth = false;
    } else {
      day = i - startWeekday + 1;
      isCurrentMonth = true;
    }

    let dateStr: string;
    if (i < startWeekday) {
      dateStr = getDateStr(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1, day);
    } else if (i >= startWeekday + daysInMonth) {
      dateStr = getDateStr(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, day);
    } else {
      dateStr = getDateStr(y, m, day);
    }

    const dayPlans = getPlansForDate(dateStr);
    const displayPlans = dayPlans.slice(0, 3);
    const overflowCount = Math.max(0, dayPlans.length - 3);

    cells.push({
      day,
      dateStr,
      isCurrentMonth,
      isToday: dateStr === todayStr,
      displayPlans,
      overflowCount,
    });
  }

  return cells;
});

// ==================== API 操作 ====================

async function loadPlans(): Promise<void> {
  try {
    const res = await api.get<{ list: TeamPlan[]; total: number }>("/api/plans");
    plans.value = res.list.map((p) => {
      // 兼容旧数据：visitTime 如果是单时间 "09:00" 转为 "09:00~09:00"
      if (p.visitTime && !p.visitTime.includes("~")) {
        p.visitTime = `${p.visitTime}~${p.visitTime}`;
      }
      return p;
    });
  } catch {
    plans.value = [];
  }
}

function getPlansForDate(dateStr: string): TeamPlan[] {
  return plans.value.filter((p) => p.date === dateStr);
}

// ==================== 用户操作 ====================

function handleAdd() {
  editingPlan.value = null;
  selectedDate.value = getDateStr(
    year.value,
    month.value,
    new Date().getDate(),
  );
  dialogVisible.value = true;
}

function handleCellClick(cell: CalendarCell) {
  // 点击非本月日期，切换到对应月份
  if (!cell.isCurrentMonth) {
    const parts = cell.dateStr.split("-");
    year.value = parseInt(parts[0]);
    month.value = parseInt(parts[1]);
  }
  // 本月单元格点击不触发新增，仅通过"+"按钮新增
}

function handleCellAdd(cell: CalendarCell) {
  editingPlan.value = null;
  selectedDate.value = cell.dateStr;
  dialogVisible.value = true;
}

function handleEditPlan(plan: TeamPlan) {
  editingPlan.value = plan;
  selectedDate.value = plan.date;
  dialogVisible.value = true;
}

function handleEditFromDetail(plan: TeamPlan) {
  detailVisible.value = false;
  editingPlan.value = plan;
  selectedDate.value = plan.date;
  dialogVisible.value = true;
}

async function handlePlanConfirm(data: PlanFormData) {
  try {
    if (editingPlan.value) {
      // 编辑
      const res = await api.put<{ success: boolean; plan: TeamPlan }>(
        `/api/plans/${editingPlan.value.id}`,
        data,
      );
      if (res.success) {
        const idx = plans.value.findIndex((p) => p.id === editingPlan.value!.id);
        if (idx !== -1) {
          plans.value[idx] = res.plan;
        }
        ElMessage.success("编辑成功");
      }
    } else {
      // 新增
      const res = await api.post<{ success: boolean; plan: TeamPlan }>(
        "/api/plans",
        data,
      );
      if (res.success) {
        plans.value.push(res.plan);
        // 如果新增的日期不在当前月份，自动切换到对应月份
        const parts = data.date.split("-");
        if (
          parseInt(parts[0]) !== year.value ||
          parseInt(parts[1]) !== month.value
        ) {
          year.value = parseInt(parts[0]);
          month.value = parseInt(parts[1]);
        }
        ElMessage.success("新增成功");
      }
    }
    dialogVisible.value = false;
  } catch {
    // api.request 内部已弹错误提示
  }
}

async function handleDeletePlan(plan: TeamPlan) {
  try {
    const res = await api.delete<{ success: boolean }>(`/api/plans/${plan.id}`);
    if (res.success) {
      plans.value = plans.value.filter((p) => p.id !== plan.id);
      ElMessage.success("删除成功");
    }
  } catch {
    // api.request 内部已弹错误提示
  }
}

function handleShowDayDetail(dateStr: string) {
  detailDate.value = dateStr;
  detailVisible.value = true;
}

const detailTitle = computed(() => {
  if (!detailDate.value) return "";
  return `${detailDate.value} 计划详情`;
});

const detailPlans = computed(() => {
  return plans.value.filter((p) => p.date === detailDate.value);
});

const detailGroups = computed(() => {
  const groups: { creator: string; plans: TeamPlan[] }[] = [];
  const map = new Map<string, TeamPlan[]>();
  for (const plan of detailPlans.value) {
    if (!map.has(plan.creator)) {
      map.set(plan.creator, []);
    }
    map.get(plan.creator)!.push(plan);
  }
  for (const [creator, planList] of map.entries()) {
    groups.push({ creator, plans: planList });
  }
  return groups;
});

// ==================== 月份切换 ====================

function prevMonth() {
  if (month.value === 1) {
    year.value--;
    month.value = 12;
  } else {
    month.value--;
  }
}

function nextMonth() {
  if (month.value === 12) {
    year.value++;
    month.value = 1;
  } else {
    month.value++;
  }
}

function goToday() {
  const now = new Date();
  year.value = now.getFullYear();
  month.value = now.getMonth() + 1;
}

// ==================== 初始化 ====================

onMounted(() => {
  loadPlans();
});
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as *;

.plan-calendar {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  box-sizing: border-box;
  overflow: hidden;
}

/* ===== 顶部工具栏 ===== */
.calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-left: 8px;
  min-width: 120px;
}

/* ===== 星期头 ===== */
.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  flex-shrink: 0;
}

.header-cell {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  padding: 8px 0;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-bottom: none;

  &:first-child {
    border-left: none;
  }
  &:last-child {
    border-right: none;
  }
}

/* ===== 日历网格 ===== */
.calendar-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 1fr;
  border: 1px solid #dcdfe6;
  border-top: none;
}

.calendar-cell {
  border-right: 1px solid #dcdfe6;
  border-bottom: 1px solid #dcdfe6;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  cursor: default;
  background: #fff;
  transition: background 0.15s;
  overflow: hidden;

  &:hover {
    background: #f0f7ff;

    .cell-add-btn {
      opacity: 1;
    }
  }

  &:nth-child(7n) {
    border-right: none;
  }

  &.is-other-month {
    background: #f5f5f5;

    .cell-day {
      color: #c0c4cc;
    }
  }
}

/* ===== 日期行（日期 + 新增按钮） ===== */
.cell-day-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
  flex-shrink: 0;
  min-height: 24px;
}

.cell-day {
  font-size: 13px;
  font-weight: 600;
  color: #303133;

  &.is-today {
    background: #{$primary-color};
    color: #fff;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.cell-add-btn {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #{$primary-color};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition:
    opacity 0.15s,
    background 0.15s;
  flex-shrink: 0;

  &:hover {
    background: rgba($primary-color, 0.15);
  }
}

.cell-plans {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
  min-height: 0;
}

.cell-plan {
  display: flex;
  align-items: flex-start;
  gap: 2px;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
  position: relative;

  &:hover {
    background: rgba($primary-color, 0.1);

    .plan-del-btn {
      opacity: 1;
    }
  }
}

.plan-flag {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  margin-top: 1px;
  width: 14px;
  justify-content: center;
  color: #f56c6c;
}

.plan-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0;
  line-height: 1;
}

.plan-creator {
  font-size: 11px;
  font-weight: 500;
  color: #303133;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-time {
  font-size: 10px;
  color: #909399;
  line-height: 1.4;
}

.plan-del-btn {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: none;
  background: transparent;
  color: #c0c4cc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition:
    opacity 0.15s,
    color 0.15s,
    background 0.15s;
  flex-shrink: 0;
  padding: 0;

  &:hover {
    color: #f56c6c;
    background: rgba(245, 108, 108, 0.1);
  }
}

.cell-more {
  font-size: 12px;
  color: #{$primary-color};
  cursor: pointer;
  padding: 2px 4px;
  flex-shrink: 0;

  &:hover {
    color: $primary-light;
  }
}

/* ===== 计划详情抽屉 ===== */
.detail-empty {
  text-align: center;
  color: #909399;
  padding: 40px 0;
  font-size: 14px;
}

.detail-group {
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
}

.detail-group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid #e8e8e8;
}

.group-flag {
  color: #f56c6c;
  display: flex;
  align-items: center;
}

.group-count {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
  margin-left: auto;
}

.detail-item {
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.detail-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.detail-item-time {
  font-size: 12px;
  font-weight: 600;
  color: #{$primary-color};
  background: rgba($primary-color, 0.08);
  padding: 1px 8px;
  border-radius: 4px;
}

.detail-item-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.detail-item:hover .detail-item-actions {
  opacity: 1;
}

.detail-item-content {
  font-size: 14px;
  color: #303133;
  line-height: 1.6;
  word-break: break-word;
}

/* Drawer 内容区内边距 */
:deep(.el-drawer__body) {
  padding: 16px 20px;
}

/* ===== 手机端 ===== */
@media (max-width: 767px) {
  .plan-calendar {
    padding: 8px 6px;
  }

  .calendar-toolbar {
    margin-bottom: 8px;
    flex-wrap: wrap;
    gap: 6px;
  }

  .toolbar-title {
    font-size: 15px;
    min-width: auto;
    margin-left: 4px;
  }

  .header-cell {
    font-size: 11px;
    padding: 4px 0;
  }

  .calendar-cell {
    padding: 2px 2px;
  }

  .cell-day {
    font-size: 11px;

    &.is-today {
      width: 20px;
      height: 20px;
      font-size: 10px;
    }
  }

  // 手机上隐藏单元格新增按钮
  .cell-add-btn {
    display: none;
  }

  // 隐藏计划文字，只保留标记旗帜
  .cell-plan .plan-body {
    display: none;
  }

  .cell-plan {
    padding: 1px 2px;
    justify-content: center;
  }

  .plan-flag {
    width: 10px;
  }

  .plan-del-btn {
    opacity: 1;
    width: 18px;
    height: 18px;
  }

  .cell-more {
    font-size: 10px;
    padding: 1px 2px;
  }

  // 详情抽屉适应
  :deep(.el-drawer) {
    width: 100% !important;
    max-width: 100vw;
  }
}
</style>
