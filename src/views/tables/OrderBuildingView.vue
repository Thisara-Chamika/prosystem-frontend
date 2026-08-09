<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'

const route = useRoute()
const router = useRouter()
</script>

<template>
  <div class="placeholder-page">
    <i class="pi pi-hourglass" />
    <h2>Order Building — coming in the next step</h2>
    <p>Table ID: {{ route.params.tableId }}</p>
    <Button label="Back to Tables" icon="pi pi-arrow-left" @click="router.push('/tables')" />
  </div>
</template>

<style scoped>
.placeholder-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem 2rem;
  color: #64748b;
  text-align: center;
}
.placeholder-page i {
  font-size: 3rem;
}
.placeholder-page h2 {
  color: #94a3b8;
  font-weight: 600;
  margin: 0;
}
</style>
