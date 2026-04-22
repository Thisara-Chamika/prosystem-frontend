<script setup lang="ts">
import AppTopbar from './AppTopbar.vue'
import AppSidebar from './AppSidebar.vue'
</script>

<template>
  <div class="app-layout">
    <AppTopbar />
    <AppSidebar />
    <main class="main-content">
      <RouterView :key="$route.path" />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: #0f172a;
}

.main-content {
  margin-left: 220px;
  margin-top: 60px;
  padding: 1.5rem;
  min-height: calc(100vh - 60px);
}
</style>
