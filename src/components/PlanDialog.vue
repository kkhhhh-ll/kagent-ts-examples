<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑计划' : '新增计划'"
    width="520px"
    :close-on-click-modal="false"
    :lock-scroll="false"
    @update:model-value="$emit('update:visible', $event)"
    @open="handleOpen"
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="80px">
      <el-form-item label="日期" prop="date">
        <el-date-picker
          v-model="formData.date"
          type="date"
          placeholder="选择日期"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="拜访时间" prop="visitTime" class="time-range-item">
        <el-time-picker
          v-model="timeRange"
          is-range
          range-separator="~"
          start-placeholder="开始"
          end-placeholder="结束"
          format="HH:mm"
          value-format="HH:mm"
          :step="900"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="填写人" prop="creator">
        <el-input
          v-model="formData.creator"
          placeholder="请输入填写人"
          maxlength="20"
        />
      </el-form-item>
      <el-form-item label="计划内容" prop="content">
        <el-input
          v-model="formData.content"
          type="textarea"
          :rows="4"
          placeholder="请输入计划内容"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
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
import type { TeamPlan, PlanFormData } from "@/types/teamPlan";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    plan?: TeamPlan | null;
    /** 预设日期（新增时默认选中） */
    defaultDate?: string;
  }>(),
  {
    plan: null,
    defaultDate: "",
  },
);

const emit = defineEmits<{
  "update:visible": [value: boolean];
  confirm: [data: PlanFormData];
}>();

const formRef = ref<FormInstance>();
const submitting = ref(false);
const timeRange = ref<string[]>([]);

const isEdit = computed(() => !!props.plan);

const formData = reactive<PlanFormData>({
  date: "",
  content: "",
  creator: "",
  visitTime: "",
});

const rules: FormRules<PlanFormData> = {
  date: [{ required: true, message: "请选择日期", trigger: "change" }],
  visitTime: [{ required: true, message: "请选择拜访时间", trigger: "change" }],
  creator: [
    { required: true, message: "请输入填写人", trigger: "blur" },
    { max: 20, message: "填写人不能超过20个字符", trigger: "blur" },
  ],
  content: [
    { required: true, message: "请输入计划内容", trigger: "blur" },
    { max: 200, message: "计划内容不能超过200个字符", trigger: "blur" },
  ],
};

function handleOpen() {
  if (props.plan) {
    formData.date = props.plan.date;
    formData.creator = props.plan.creator;
    formData.content = props.plan.content;
    // 解析 "09:00~10:30" → ["09:00", "10:30"]
    timeRange.value = props.plan.visitTime ? props.plan.visitTime.split("~") : [];
  } else {
    formData.date = props.defaultDate || "";
    formData.creator = "";
    formData.content = "";
    timeRange.value = [];
  }
}

function handleClosed() {
  formRef.value?.resetFields();
}

function handleCancel() {
  emit("update:visible", false);
}

async function handleConfirm() {
  // 将 timeRange ["09:00","10:30"] 转为 formData.visitTime "09:00~10:30"
  if (timeRange.value.length === 2) {
    formData.visitTime = timeRange.value.join("~");
  } else {
    formData.visitTime = "";
  }

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
