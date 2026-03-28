<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from "vue";
import { useTimer } from "../composables/useTimer";
import { useParticipants } from "../composables/useParticipants";
import { useSettings } from "../composables/useSettings";
import { useRoom } from "../composables/useRoom";
import { formatTime } from "../utils/formatTime";
import AudioPanel from "./AudioPanel.vue";

// バンドル分割: Tiptap/DOMPurify 等の重い依存を含むためチャンクを分離
const MemoEditor = defineAsyncComponent({
  loader: () => import("./MemoEditor.vue"),
  loadingComponent: { template: '<p class="text-sm text-gray-400 p-2">読み込み中…</p>' },
  errorComponent: {
    template: '<p class="text-sm text-red-500 p-2">メモの読み込みに失敗したのだ</p>',
  },
  delay: 200,
  timeout: 10000,
});
const PublicMemoList = defineAsyncComponent({
  loader: () => import("./PublicMemoList.vue"),
  loadingComponent: { template: '<p class="text-sm text-gray-400 p-2">読み込み中…</p>' },
  errorComponent: {
    template: '<p class="text-sm text-red-500 p-2">メモ一覧の読み込みに失敗したのだ</p>',
  },
  delay: 200,
  timeout: 10000,
});

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
  addTemporary,
  removeTemporary,
} = useParticipants();
const { settings } = useSettings();
const { roomId, sendAction } = useRoom();

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

/** ルームモード時は sendAction 経由、スタンドアロン時は直接実行 */
function handleStart() {
  if (roomId.value) sendAction({ kind: "start" });
  else start();
}

function handleStop() {
  if (roomId.value) sendAction({ kind: "stop" });
  else stop();
}

function handleNext() {
  if (roomId.value) sendAction({ kind: "next" });
  else next();
}

function handleReset() {
  if (roomId.value) sendAction({ kind: "reset" });
  else reset();
}

function handleShuffle() {
  if (roomId.value) sendAction({ kind: "shuffle" });
  else shuffle(isRunning.value);
}

function handleMarkAbsent(id: string) {
  if (roomId.value) sendAction({ kind: "markAbsent", participantId: id });
  else markAbsent(id);
}

function handleMarkPresent(id: string) {
  if (roomId.value) sendAction({ kind: "markPresent", participantId: id });
  else markPresent(id);
}

const newParticipantName = ref("");

function handleAddTemporary() {
  const name = newParticipantName.value.trim();
  if (!name) return;
  if (roomId.value) sendAction({ kind: "addParticipant", name });
  else addTemporary(name);
  newParticipantName.value = "";
}

function handleRemoveTemporary(id: string) {
  if (roomId.value) sendAction({ kind: "removeParticipant", participantId: id });
  else removeTemporary(id);
}
</script>

<template>
  <div class="p-4 max-w-5xl mx-auto">
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
        <div class="flex items-center justify-between mb-1">
          <h4 class="text-sm font-bold text-gray-700">
            {{ currentParticipant ? currentParticipant.name : "—" }}
          </h4>
          <span
            class="text-lg font-mono font-bold"
            :class="[
              currentPercent >= 95
                ? 'text-red-500'
                : currentPercent > 75
                  ? 'text-yellow-600'
                  : 'text-emerald-600',
            ]"
          >
            {{ formatTime(currentRemainingTime) }}
          </span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-10 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300 flex items-center justify-center text-white font-bold"
            :class="[progressColor(currentPercent), { 'animate-pulse': currentPercent >= 95 }]"
            :style="{ width: Math.min(100, currentPercent) + '%' }"
          >
            <span v-if="currentPercent > 15" class="text-sm">{{ currentPercent }}%</span>
          </div>
        </div>
      </section>

      <!-- 参加者リスト -->
      <section class="mb-4">
        <div class="flex flex-wrap items-center gap-1.5 justify-start">
          <span class="text-sm font-semibold text-gray-500 mr-1">参加者</span>
          <!-- 完了（左に表示） -->
          <span
            v-for="dp in doneParticipants"
            :key="dp.id"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-gray-200 text-gray-500"
          >
            ✓ {{ dp.name }}
            <span
              class="text-xs font-mono w-10 text-right"
              :class="{ 'text-red-500': dp.time >= individualMaxTime }"
            >
              {{ formatTime(dp.time) }}
            </span>
          </span>

          <!-- 待機中 -->
          <span
            v-for="(p, i) in participants"
            :key="p.id"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm"
            :class="{
              'bg-emerald-200 font-bold text-emerald-900': i === 0,
              'bg-blue-100 text-blue-800': i === 1,
              'bg-gray-100 text-gray-700': i > 1,
            }"
          >
            <button
              class="text-gray-400 hover:text-red-500 disabled:opacity-30 text-xs"
              :disabled="participants.length <= 2 || (i === 0 && isRunning)"
              title="不在にする"
              @click="handleMarkAbsent(p.id)"
            >
              ⊖
            </button>
            <button
              class="text-gray-400 hover:text-red-500 disabled:opacity-30 text-xs"
              :disabled="i === 0 && isRunning"
              title="この回から削除"
              @click="handleRemoveTemporary(p.id)"
            >
              ✕
            </button>
            {{ p.name }}
            <span v-if="i === 0 && isRunning" class="text-xs font-mono w-10 text-right">{{
              formatTime(currentElapsed)
            }}</span>
            <span v-else class="text-xs text-gray-400 font-mono w-10 text-right">-</span>
          </span>

          <!-- 不在 -->
          <span
            v-for="ap in absentParticipants"
            :key="ap.id"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-red-50 text-gray-400"
          >
            <button
              class="text-gray-400 hover:text-emerald-500 text-xs"
              title="出席に戻す"
              @click="handleMarkPresent(ap.id)"
            >
              ⊕
            </button>
            {{ ap.name }}
          </span>
        </div>
        <!-- その場限りの参加者追加 -->
        <form class="mt-2 flex gap-1" @submit.prevent="handleAddTemporary">
          <input
            v-model="newParticipantName"
            type="text"
            placeholder="参加者を追加"
            class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
          />
          <button
            type="submit"
            class="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-40"
            :disabled="!newParticipantName.trim()"
          >
            追加
          </button>
        </form>
      </section>

      <!-- ボタン群 -->
      <section class="flex gap-2 justify-center mb-6">
        <button
          v-if="!isRunning"
          class="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-40"
          :disabled="participants.length === 0"
          @click="handleStart"
        >
          ▶ スタート
        </button>
        <button
          v-if="isRunning"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          @click="handleNext"
        >
          ⏭ 次へ
        </button>
        <button
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-40"
          :disabled="!isRunning"
          @click="handleStop"
        >
          ⏹ ストップ
        </button>
        <button
          class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          @click="handleReset"
        >
          ↻ リセット
        </button>
        <button
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-40"
          :disabled="participants.length <= 2"
          @click="handleShuffle"
        >
          🔀 シャッフル
        </button>
      </section>

      <!-- 2カラムレイアウト: 左=音声+質問、右=メモ -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <!-- 音声コントロール -->
          <section class="mb-4 bg-gray-50 p-3 rounded-lg">
            <AudioPanel />
          </section>

          <!-- 3つの質問 -->
          <section class="bg-emerald-50 p-4 rounded-lg">
            <h4 class="font-semibold mb-2">デイリースクラムの質問なのだ</h4>
            <ol class="list-decimal list-inside space-y-1 text-gray-700">
              <li>昨日やったことは？</li>
              <li>今日やることは？</li>
              <li>困っていることは？</li>
            </ol>
          </section>
        </div>

        <!-- 自分のメモ -->
        <div>
          <section class="bg-gray-50 p-3 rounded-lg">
            <h4 class="text-sm font-semibold text-gray-600 mb-2">自分のメモ</h4>
            <MemoEditor />
          </section>
        </div>
      </div>

      <!-- みんなの公開メモ -->
      <section class="mb-6 bg-gray-50 p-3 rounded-lg">
        <PublicMemoList />
      </section>
    </div>
  </div>
</template>
