<script setup lang="ts">
import { computed } from "vue";
import { useSettings } from "../composables/useSettings";
import AudioPanel from "./AudioPanel.vue";

const { settings, updateSettings, resetSettings } = useSettings();

const globalMaxTimeMinutes = computed({
  get: () => Math.floor(settings.value.globalMaxTime / 60),
  set: (min: number) => updateSettings({ globalMaxTime: min * 60 }),
});

const useGlobalMaxTimeModel = computed({
  get: () => settings.value.useGlobalMaxTime,
  set: (val: boolean) => updateSettings({ useGlobalMaxTime: val }),
});
</script>

<template>
  <div class="p-4 max-w-lg mx-auto">
    <h2 class="text-2xl font-bold mb-6">設定</h2>

    <!-- グローバル最大時間 -->
    <section class="mb-6">
      <label class="flex items-center gap-2 mb-3">
        <input v-model="useGlobalMaxTimeModel" type="checkbox" class="w-4 h-4" />
        <span class="font-semibold">グローバル最大時間を使用する</span>
      </label>

      <div v-if="settings.useGlobalMaxTime" class="ml-6 space-y-2">
        <label class="block text-sm text-gray-600">
          最大時間（分）:
          <input
            v-model.number="globalMaxTimeMinutes"
            type="number"
            min="1"
            max="120"
            class="ml-2 w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>
        <p class="text-xs text-gray-400">
          {{ settings.globalMaxTime }} 秒 = {{ globalMaxTimeMinutes }} 分
        </p>
      </div>

      <div v-else class="ml-6">
        <p class="text-sm text-gray-500">個別の持ち時間（固定 2 分）を使用するのだ。</p>
      </div>
    </section>

    <!-- 音声設定 -->
    <section class="mb-6">
      <h3 class="font-semibold mb-3">音声設定</h3>
      <AudioPanel />
    </section>

    <!-- VoiceVox / ルーム設定（予約枠） -->
    <section class="mb-6 opacity-50">
      <h3 class="font-semibold mb-2">VoiceVox 設定</h3>
      <p class="text-sm text-gray-400">後のフェーズで実装するのだ</p>
    </section>

    <section class="mb-6 opacity-50">
      <h3 class="font-semibold mb-2">ルーム設定</h3>
      <p class="text-sm text-gray-400">後のフェーズで実装するのだ</p>
    </section>

    <!-- リセット -->
    <button
      class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
      @click="resetSettings"
    >
      設定をリセット
    </button>
  </div>
</template>
