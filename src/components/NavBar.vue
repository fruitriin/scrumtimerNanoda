<script setup lang="ts">
const navItems = [
  { to: "/", label: "タイマー(一人)" },
  { to: "/room", label: "タイマー(ルーム)" },
  { to: "/participants", label: "参加者" },
  { to: "/settings", label: "設定" },
  { to: "/help", label: "ヘルプ" },
] as const;
</script>

<template>
  <nav class="bg-emerald-600 text-white px-4 py-3 flex items-center gap-4">
    <h1 class="text-lg font-bold mr-auto">ScrumTimer なのだ！</h1>
    <router-link
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="px-3 py-1 rounded hover:bg-emerald-700 transition-colors"
      exact-active-class="bg-emerald-800"
    >
      {{ item.label }}
    </router-link>
  </nav>
</template>
