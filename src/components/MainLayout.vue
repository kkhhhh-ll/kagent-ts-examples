<template>
  <div class="main-layout">
    <el-container class="layout-container">
      <!-- 侧边栏 -->
      <el-aside width="220px" class="layout-aside">
        <div class="logo-area">
          <h3>业务管理系统</h3>
        </div>
        <el-menu
          :default-active="route.path"
          router
          class="layout-menu"
          background-color="transparent"
          text-color="rgba(255,255,255,0.65)"
          active-text-color="#fff"
        >
          <el-menu-item index="/">
            <el-icon><Document /></el-icon>
            <span>工单管理</span>
          </el-menu-item>
          <el-menu-item index="/plan">
            <el-icon><Calendar /></el-icon>
            <span>团队计划</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 主区域 -->
      <el-container class="layout-body">
        <!-- 顶部栏 -->
        <el-header class="layout-header">
          <div class="header-left">
            <span class="header-breadcrumb">
              {{ pageTitle }}
            </span>
          </div>
          <div class="header-right">
            <el-button type="primary" plain @click="goToQA">
              <el-icon><ChatDotRound /></el-icon>
              智能助手
            </el-button>
          </div>
        </el-header>

        <!-- 内容区 -->
        <el-main class="layout-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Document, Calendar, ChatDotRound } from "@element-plus/icons-vue";

const route = useRoute();
const router = useRouter();

const pageTitle = computed(() => {
  const path = route.path;
  if (path === "/") return "工单管理";
  if (path.startsWith("/detail/")) return "工单详情";
  if (path === "/plan") return "团队计划";
  return "";
});

function goToQA() {
  router.push("/qa");
}
</script>

<style lang="scss" scoped>
.main-layout {
  height: 100vh;
  overflow: hidden;
}

.layout-container {
  height: 100%;
}

/* ===== 侧边栏 ===== */
.layout-aside {
  background-color: #1e293b;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.logo-area {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  h3 {
    color: #f1f5f9;
    font-size: 16px;
    margin: 0;
    letter-spacing: 1px;
    font-weight: 600;
  }
}

.layout-menu {
  border-right: none;
  padding: 8px 0;

  // 覆写 Element Plus 默认菜单样式
  :deep(.el-menu-item) {
    border-left: 3px solid transparent;
    transition: all 0.2s ease;
    margin: 2px 0;
    height: 44px;
    line-height: 44px;

    &:hover {
      background-color: rgba(255, 255, 255, 0.08);
      color: #f1f5f9;
    }

    // 选中态 — 左侧亮色指示条 + 加亮文字
    &.is-active {
      border-left-color: #60a5fa;
      background: linear-gradient(
        90deg,
        rgba(96, 165, 250, 0.12) 0%,
        transparent 100%
      );
      color: #fff;

      .el-icon {
        color: #60a5fa;
      }
    }

    .el-icon {
      color: rgba(255, 255, 255, 0.5);
      transition: color 0.2s;
      margin-right: 10px;
    }
  }
}

/* ===== 主体 ===== */
.layout-body {
  display: flex;
  flex-direction: column;
}

/* ===== 顶部栏 ===== */
.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e6e6e6;
  padding: 0 24px;
  height: 60px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-breadcrumb {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ===== 内容区 ===== */
.layout-content {
  background: #f0f2f5;
  padding: 0;
  overflow: auto;
}
</style>
