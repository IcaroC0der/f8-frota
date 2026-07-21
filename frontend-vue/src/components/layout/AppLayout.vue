<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView } from "vue-router";
import Sidebar from "./Sidebar.vue";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
onMounted(() => auth.loadMe());
</script>

<template>
  <div class="flex min-h-screen bg-background">
    <Sidebar />
    <main class="flex-1 overflow-x-hidden">
      <RouterView />
    </main>
  </div>
</template>
