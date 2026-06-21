<template>
  <div class="main-layout">
    <el-container class="layout-container">
      <!-- 侧边栏（桌面端） -->
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
            <el-button
              class="menu-toggle-btn"
              @click="sidebarVisible = true"
              :icon="Operation"
              text
            />
            <span class="header-breadcrumb">
              {{ pageTitle }}
            </span>
          </div>
          <div class="header-right">
            <el-button type="primary" plain @click="goToQA">
              <el-icon><ChatDotRound /></el-icon>
              <span class="btn-label">智能助手</span>
            </el-button>
          </div>
        </el-header>

        <!-- 内容区 -->
        <el-main class="layout-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>

    <!-- 移动端抽屉菜单 -->
    <el-drawer
      v-model="sidebarVisible"
      :with-header="false"
      direction="ltr"
      :size="220"
      class="mobile-sidebar-drawer"
    >
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
        @select="sidebarVisible = false"
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
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Document,
  Calendar,
  ChatDotRound,
  Operation,
} from "@element-plus/icons-vue";

const route = useRoute();
const router = useRouter();

const sidebarVisible = ref(false);

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
@use '@/assets/styles/variables' as *;

.main-layout {
  height: 100vh;
  overflow: hidden;
}

.layout-container {
  height: 100%;
}

/* ===== 侧边栏 ===== */
.layout-aside {
  background: linear-gradient(180deg, $sidebar-bg-start 0%, $sidebar-bg-end 100%);
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

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
    margin: 2px 8px;
    height: 44px;
    line-height: 44px;
    border-radius: 8px;

    &:hover {
      background-color: rgba($primary-color, 0.1);
      color: #e2e8f0;
    }

    // 选中态 — 左侧亮色指示条 + 加亮文字
    &.is-active {
      border-left-color: $primary-light;
      background: linear-gradient(
        90deg,
        rgba($primary-color, 0.15) 0%,
        rgba($primary-color, 0.04) 100%
      );
      color: #fff;

      .el-icon {
        color: $primary-light;
      }
    }

    .el-icon {
      color: rgba(255, 255, 255, 0.45);
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

/* ===== 移动端抽屉菜单 ===== */
// .mobile-sidebar-drawer {
:deep(.el-drawer) {
  width: 220px;
  --el-drawer-bg-color: #{$sidebar-bg-start};
  background-color: $sidebar-bg-start !important;
  border: none;
}

:deep(.el-drawer__body) {
  padding: 0;
  background: linear-gradient(180deg, $sidebar-bg-start 0%, $sidebar-bg-end 100%);
  display: flex;
  flex-direction: column;
}

:deep(.el-overlay) {
  background-color: rgba(0, 0, 0, 0.5);
}
// }

/* ===== 移动端菜单按钮 ===== */
.menu-toggle-btn {
  display: none;
}

/* ===== 移动端响应式 ===== */
@media (max-width: 767px) {
  /* 隐藏桌面侧边栏 */
  .layout-aside {
    display: none;
  }

  /* 显示 hamburger 按钮 */
  .menu-toggle-btn {
    display: inline-flex;
    margin-right: 8px;
    font-size: 18px;
  }

  /* 顶部栏紧凑 */
  .layout-header {
    padding: 0 12px;
    height: 52px;
  }

  .header-breadcrumb {
    font-size: 14px;
  }

  /* 智能助手按钮只显示图标 */
  .header-right .btn-label {
    display: none;
  }
}

/* 平板端：缩小侧边栏 */
@media (min-width: 768px) and (max-width: 991px) {
  .layout-aside {
    width: 64px !important;
    min-width: 64px !important;
  }

  .logo-area h3 {
    display: none;
  }

  .layout-menu :deep(.el-menu-item) {
    justify-content: center;
    padding: 0 !important;
  }

  .layout-menu :deep(.el-menu-item span) {
    display: none;
  }

  .layout-menu :deep(.el-menu-item .el-icon) {
    margin-right: 0 !important;
  }
}
</style>
