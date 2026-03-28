<script setup lang="ts">
const navItems = [
  { to: "/", label: "タイマー(一人で進行)" },
  { to: "/room", label: "タイマー(誰でもで進行)" },
  { to: "/participants", label: "参加者" },
  { to: "/settings", label: "設定" },
  { to: "/help", label: "ヘルプ" },
] as const;
</script>

<template>
  <nav
    aria-label="メインナビゲーション"
    class="bg-emerald-600 text-white px-2 sm:px-4 py-3 flex items-center gap-2 sm:gap-4"
  >
    <h1 class="text-lg font-bold mr-auto whitespace-nowrap">ScrumTimer なのだ！</h1>
    <div class="flex gap-1 sm:gap-2 overflow-x-auto nav-scroll">
      <router-link
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="px-2 sm:px-3 py-1.5 rounded hover:bg-emerald-700 transition-colors whitespace-nowrap text-sm sm:text-base min-h-[44px] flex items-center"
        exact-active-class="bg-emerald-800"
      >
        {{ item.label }}
      </router-link>
    </div>
  </nav>
</template>

<style scoped>
.nav-scroll::-webkit-scrollbar {
  display: none;
}
.nav-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
