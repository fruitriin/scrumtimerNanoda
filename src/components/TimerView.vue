<script setup lang="ts">
import { computed } from "vue";
import { useTimer } from "../composables/useTimer";
import { useParticipants } from "../composables/useParticipants";
import { useSettings } from "../composables/useSettings";
import { formatTime } from "../utils/formatTime";

const {
  isRunning,
  currentElapsed,
  totalElapsed,
  currentParticipant,
  individualMaxTime,
  currentPercent,
  totalPercent,
  totalTimePercent,
  start,
  stop,
  next,
  reset,
} = useTimer();

const {
  participants,
  doneParticipants,
  absentParticipants,
  markAbsent,
  markPresent,
  shuffle,
  sort,
} = useParticipants();
const { settings } = useSettings();

const hasParticipants = computed(
  () => participants.value.length > 0 || doneParticipants.value.length > 0,
);

const currentRemainingTime = computed(() =>
  Math.max(0, individualMaxTime.value - currentElapsed.value),
);

const totalRemainingTime = computed(() =>
  Math.max(0, settings.value.globalMaxTime - totalElapsed.value - currentElapsed.value),
);

/** 進捗色: <75% 緑, <95% 黄, >=95% 赤 */
function progressColor(percent: number): string {
  if (percent >= 95) return "bg-red-500";
  if (percent > 75) return "bg-yellow-500";
  return "bg-emerald-500";
}
</script>

<template>
  <div class="p-4 max-w-2xl mx-auto">
    <!-- 参加者がいない場合 -->
    <div v-if="!hasParticipants" class="text-center py-12">
      <h2 class="text-2xl font-bold mb-4">参加者がいないのだ！</h2>
      <p class="text-gray-500 mb-4">
        タイマーを使うには、まず
        <router-link to="/participants" class="text-emerald-600 underline"
          >参加者リスト</router-link
        >
        で参加者を追加するのだ。
      </p>
    </div>

    <!-- タイマー画面 -->
    <div v-else>
      <!-- 全体進捗 -->
      <section class="mb-4">
        <h4 class="text-sm font-semibold text-gray-500 mb-1">全体進捗</h4>
        <div class="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300 flex items-center justify-center text-white text-xs font-bold bg-emerald-500"
            :style="{ width: totalPercent + '%' }"
          >
            <span v-if="totalPercent > 10">{{ totalPercent }}%</span>
          </div>
        </div>
      </section>

      <!-- 全体時間 -->
      <section v-if="settings.useGlobalMaxTime" class="mb-4">
        <h4 class="text-sm font-semibold text-gray-500 mb-1">全体時間</h4>
        <div class="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300 flex items-center justify-center text-white text-xs font-bold"
            :class="[progressColor(totalTimePercent), { 'animate-pulse': totalTimePercent >= 95 }]"
            :style="{ width: Math.min(100, totalTimePercent) + '%' }"
          >
            <span v-if="totalTimePercent > 10">{{ formatTime(totalRemainingTime) }}</span>
          </div>
        </div>
      </section>

      <!-- 現在の発表者 -->
      <section class="mb-6">
        <h4 class="text-sm font-semibold text-gray-500 mb-1">
          {{ currentParticipant ? `${currentParticipant.name} [${currentParticipant.init}]` : "—" }}
        </h4>
        <div class="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300 flex items-center justify-center text-white text-sm font-bold"
            :class="[progressColor(currentPercent), { 'animate-pulse': currentPercent >= 95 }]"
            :style="{ width: Math.min(100, currentPercent) + '%' }"
          >
            <span v-if="currentPercent > 10">{{ formatTime(currentRemainingTime) }}</span>
          </div>
        </div>
        <div class="text-center text-4xl font-mono mt-2">
          {{ formatTime(currentRemainingTime) }}
        </div>
      </section>

      <!-- ボタン群 -->
      <section class="flex gap-2 justify-center mb-6">
        <button
          v-if="!isRunning"
          class="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-40"
          :disabled="participants.length === 0"
          @click="start"
        >
          ▶ スタート {{ currentParticipant?.init ?? "" }}
        </button>
        <button
          v-if="isRunning"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          :disabled="participants.length <= 1"
          @click="next"
        >
          ⏭ 次へ
        </button>
        <button
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-40"
          :disabled="!isRunning"
          @click="stop"
        >
          ⏹ ストップ
        </button>
        <button class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600" @click="reset">
          ↻ リセット
        </button>
      </section>

      <!-- 3つの質問 -->
      <section class="mb-6 bg-emerald-50 p-4 rounded-lg">
        <h4 class="font-semibold mb-2">デイリースクラムの質問なのだ</h4>
        <ol class="list-decimal list-inside space-y-1 text-gray-700">
          <li>昨日やったことは？</li>
          <li>今日やることは？</li>
          <li>困っていることは？</li>
        </ol>
      </section>

      <!-- 参加者リスト -->
      <section>
        <div class="flex items-center gap-2 mb-2">
          <h4 class="font-semibold">参加者</h4>
          <button
            class="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-40"
            :disabled="participants.length <= 2"
            @click="shuffle"
          >
            🔀 シャッフル
          </button>
          <button
            class="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-40"
            :disabled="participants.length <= 2"
            @click="sort"
          >
            🔤 ソート
          </button>
        </div>

        <ul class="space-y-1">
          <!-- 待機中 -->
          <li
            v-for="(p, i) in participants"
            :key="p.id"
            class="flex items-center gap-2 px-3 py-2 rounded"
            :class="{
              'bg-emerald-100 font-bold': i === 0,
              'bg-blue-50': i === 1,
              'bg-white': i > 1,
            }"
          >
            <button
              class="text-gray-400 hover:text-red-500 disabled:opacity-30"
              :disabled="participants.length <= 2 || (i === 0 && isRunning)"
              title="不在にする"
              @click="markAbsent(p.id)"
            >
              ⊖
            </button>
            <span>{{ p.name }} [{{ p.init }}]</span>
          </li>

          <!-- 完了 -->
          <li
            v-for="dp in doneParticipants"
            :key="dp.id"
            class="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-500 rounded"
          >
            <span>✓</span>
            <span>{{ dp.name }} [{{ dp.init }}]</span>
            <span class="ml-auto" :class="{ 'text-red-500': dp.time >= individualMaxTime }">
              {{ formatTime(dp.time) }}
            </span>
          </li>

          <!-- 不在 -->
          <li
            v-for="ap in absentParticipants"
            :key="ap.id"
            class="flex items-center gap-2 px-3 py-2 bg-red-50 text-gray-400 rounded"
          >
            <button
              class="text-gray-400 hover:text-emerald-500"
              title="出席に戻す"
              @click="markPresent(ap.id)"
            >
              ⊕
            </button>
            <span>{{ ap.name }} [{{ ap.init }}]</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
