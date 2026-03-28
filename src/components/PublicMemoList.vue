<script setup lang="ts">
import { ref, computed } from "vue";
import DOMPurify from "dompurify";
import { useMemo } from "../composables/useMemo";

const { publicMemos } = useMemo();
const isCollapsed = ref(false);

/** WebRTC 経由のHTMLをサニタイズしたメモ一覧 */
const sanitizedMemos = computed(() =>
  [...publicMemos.value.entries()].map(([id, memo]) => ({
    ...memo,
    participantId: id,
    sanitizedContent: DOMPurify.sanitize(memo.content),
  })),
);
</script>

<template>
  <div class="public-memos">
    <button
      class="flex items-center gap-1 text-sm font-semibold text-gray-600 mb-2"
      @click="isCollapsed = !isCollapsed"
    >
      <span class="transition-transform" :class="{ '-rotate-90': isCollapsed }">▼</span>
      みんなの公開メモ（{{ sanitizedMemos.length }}人）
    </button>
    <div v-if="!isCollapsed && sanitizedMemos.length > 0" class="space-y-2">
      <div
        v-for="memo in sanitizedMemos"
        :key="memo.participantId"
        class="bg-white p-2 rounded border border-gray-200"
      >
        <div class="text-xs font-semibold text-emerald-700 mb-1">{{ memo.participantName }}</div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div
          class="text-sm text-gray-700 prose prose-sm max-w-none"
          v-html="memo.sanitizedContent"
        ></div>
      </div>
    </div>
    <div v-if="!isCollapsed && sanitizedMemos.length === 0" class="text-sm text-gray-400">
      まだ公開メモがないのだ
    </div>
  </div>
</template>
