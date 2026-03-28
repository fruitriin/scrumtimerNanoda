<script setup lang="ts">
import { computed } from "vue";
import { useSettings } from "../composables/useSettings";
import { useAudio } from "../composables/useAudio";

const { settings, updateSettings } = useSettings();
const { playTimeup, audioError, dismissAudioError } = useAudio();

const volumeModel = computed({
  get: () => Math.round(settings.value.volume * 100),
  set: (val: number) => updateSettings({ volume: val / 100 }),
});

function toggleMute() {
  updateSettings({ muted: !settings.value.muted });
}

const alertOptions = [
  { key: "wrapUp" as const, label: "残り30秒「まとめに入ってる？」" },
  { key: "timeup" as const, label: "時間切れ" },
  { key: "overtime10" as const, label: "超過10秒「ながい」" },
  { key: "overtime30" as const, label: "超過30秒「長すぎ」" },
];

function toggleAlert(key: keyof typeof settings.value.alerts) {
  updateSettings({ alerts: { ...settings.value.alerts, [key]: !settings.value.alerts[key] } });
}
</script>

<template>
  <div class="space-y-2">
    <!-- 音量 + ミュート + テスト -->
    <div class="flex items-center gap-2">
      <button
        class="w-10 h-10 sm:w-7 sm:h-7 flex items-center justify-center rounded hover:bg-gray-200 text-sm"
        :title="settings.muted ? 'ミュート解除' : 'ミュート'"
        :aria-label="settings.muted ? 'ミュート解除' : 'ミュート'"
        @click="toggleMute"
      >
        <span v-if="settings.muted || settings.volume === 0">&#x1F507;</span>
        <span v-else-if="settings.volume < 0.5">&#x1F509;</span>
        <span v-else>&#x1F50A;</span>
      </button>

      <input
        v-model.number="volumeModel"
        type="range"
        min="0"
        max="100"
        aria-label="音量"
        class="flex-1 h-1.5 accent-emerald-500"
        :disabled="settings.muted"
      />
      <span class="text-xs text-gray-400 w-8 text-right">{{ volumeModel }}%</span>

      <button
        class="px-2 py-1 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:opacity-40 min-h-[44px] sm:min-h-0"
        :disabled="settings.muted"
        aria-label="音声テスト再生"
        @click="playTimeup"
      >
        &#x25B6; テスト
      </button>
    </div>

    <!-- 警告音声チェックボックス -->
    <div class="flex flex-wrap gap-x-4 gap-y-1">
      <label
        v-for="opt in alertOptions"
        :key="opt.key"
        class="flex items-center gap-1 text-xs text-gray-600"
      >
        <input
          type="checkbox"
          class="w-3.5 h-3.5"
          :checked="settings.alerts[opt.key]"
          @change="toggleAlert(opt.key)"
        />
        {{ opt.label }}
      </label>
    </div>

    <!-- 音声再生エラー通知 -->
    <div
      v-if="audioError"
      role="alert"
      class="flex items-center justify-between bg-yellow-50 text-yellow-800 text-xs p-2 rounded"
    >
      <span>{{ audioError }}</span>
      <button
        class="text-yellow-600 hover:text-yellow-800 ml-2"
        aria-label="閉じる"
        @click="dismissAudioError"
      >
        ✕
      </button>
    </div>
  </div>
</template>
