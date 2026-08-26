<script setup lang="ts">
import AdminSidebar from './AdminSidebar.vue'
</script>

<template>
  <div class="admin-layout">
    <AdminSidebar />
    <main class="admin-main-content">
      <RouterView :key="$route.path" />
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background: #0f172a;
}

.admin-main-content {
  margin-left: 220px;
  padding: 2rem;
  min-height: 100vh;
}
</style>
