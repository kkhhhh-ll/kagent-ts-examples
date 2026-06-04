<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑工单' : '新建工单'"
    width="560px"
    :close-on-click-modal="false"
    :lock-scroll="false"
    class="wo-form-dialog"
    @update:model-value="$emit('update:visible', $event)"
    @open="handleOpen"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
      label-position="right"
    >
      <el-form-item label="单据编号" v-if="isEdit">
        <el-input :model-value="order?.code" disabled />
      </el-form-item>
      <el-form-item label="创建时间" v-if="isEdit">
        <el-input :model-value="formatTime(order?.createTime)" disabled />
      </el-form-item>
      <el-form-item label="创建人" prop="creator">
        <el-input
          v-model="formData.creator"
          placeholder="请输入创建人"
          maxlength="20"
        />
      </el-form-item>
      <el-form-item label="工单类型" prop="type">
        <el-select
          v-model="formData.type"
          placeholder="请选择工单类型"
          style="width: 100%"
        >
          <el-option label="项目验收" value="项目验收" />
          <el-option label="项目赠送" value="项目赠送" />
        </el-select>
      </el-form-item>
      <div class="form-row">
        <el-form-item prop="duration" label="工期（天）" style="flex: 1">
          <el-input-number
            v-model="formData.duration"
            :min="1"
            :controls="false"
            style="width: 100%"
            placeholder="请输入工期"
          />
        </el-form-item>
        <el-form-item prop="cost" label="费用（元）" style="flex: 1">
          <el-input-number
            v-model="formData.cost"
            :min="0"
            :controls="false"
            :precision="2"
            style="width: 100%"
            placeholder="请输入费用"
          />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleConfirm" :loading="submitting">
        确认
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import type {
  WorkOrder,
  WorkOrderFormData,
  WorkOrderType,
} from "@/types/workOrder";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    order?: WorkOrder | null;
  }>(),
  {
    order: null,
  },
);

const emit = defineEmits<{
  "update:visible": [value: boolean];
  confirm: [data: WorkOrderFormData];
}>();

const formRef = ref<FormInstance>();
const submitting = ref(false);

const isEdit = computed(() => !!props.order);

const formData = reactive<WorkOrderFormData>({
  creator: "",
  type: "" as WorkOrderType,
  duration: 1,
  cost: 0,
});

const rules: FormRules<WorkOrderFormData> = {
  creator: [
    { required: true, message: "请输入创建人", trigger: "blur" },
    { max: 20, message: "创建人不能超过20个字符", trigger: "blur" },
  ],
  type: [{ required: true, message: "请选择工单类型", trigger: "change" }],
  duration: [
    { required: true, message: "请输入工期", trigger: "blur" },
    { type: "number", min: 1, message: "工期必须大于0", trigger: "blur" },
  ],
  cost: [
    { required: true, message: "请输入费用", trigger: "blur" },
    { type: "number", min: 0, message: "费用不能为负数", trigger: "blur" },
  ],
};

function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function handleOpen() {
  if (props.order) {
    formData.creator = props.order.creator;
    formData.type = props.order.type;
    formData.duration = props.order.duration;
    formData.cost = props.order.cost;
  } else {
    formData.creator = "";
    formData.type = "" as WorkOrderType;
    formData.duration = 1;
    formData.cost = 0;
  }
}

function handleClosed() {
  formRef.value?.resetFields();
}

function handleCancel() {
  emit("update:visible", false);
}

async function handleConfirm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    emit("confirm", { ...formData });
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.form-row-sep {
  flex-shrink: 0;
  color: #606266;
  font-size: 14px;
  padding: 0 4px;
}

/* ===== 手机端 ===== */
@media (max-width: 767px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>

<!-- 非 scoped：穿透 el-dialog 的 Teleport，用于对话框容器样式 -->
<style lang="scss">
@media (max-width: 767px) {
  .wo-form-dialog {
    width: 92% !important;
    max-width: 92% !important;
  }
  .wo-form-dialog .el-dialog__body {
    padding: 16px;
  }
  .wo-form-dialog .el-form-item {
    margin-bottom: 14px;
  }
  .wo-form-dialog .el-form-item__label {
    width: 80px !important;
  }
  .wo-form-dialog .el-form-item__content {
    margin-left: 80px !important;
  }
}
</style>
