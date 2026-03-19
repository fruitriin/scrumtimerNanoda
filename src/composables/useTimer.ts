import { ref, computed } from "vue";
import { useParticipants } from "./useParticipants";
import { useSettings } from "./useSettings";

/** グローバル最大時間を使わない場合のフォールバック値（2分） */
const FALLBACK_INDIVIDUAL_MAX_TIME = 120;

/**
 * タイマーロジック composable（モジュールスコープでシングルトン化）
 *
 * - setInterval(1000) で UI 更新をトリガー
 * - 実際の経過時間は Date.now() - startedAt で計算（バックグラウンドタブ対策）
 *
 * クリーンアップ: reset() を呼ぶとインターバルが停止する。
 * コンポーネント側で onUnmounted(() => reset()) を呼ぶこと。
 */

const isRunning = ref(false);
const currentElapsed = ref(0);
const totalElapsed = ref(0);
let intervalId: ReturnType<typeof setInterval> | null = null;
let startedAt: number | null = null;

export function useTimer() {
  const { participants, doneParticipants, moveFirstToDone, resetAll } = useParticipants();
  const { settings } = useSettings();

  const currentParticipant = computed(() => participants.value[0] ?? null);

  const individualMaxTime = computed(() => {
    if (!settings.value.useGlobalMaxTime) return FALLBACK_INDIVIDUAL_MAX_TIME;
    const remaining = participants.value.length;
    if (remaining === 0) return 0;
    const timeLeft = settings.value.globalMaxTime - totalElapsed.value;
    if (timeLeft <= 0) return 1; // 猶予 1 秒
    return Math.round(timeLeft / remaining);
  });

  const currentPercent = computed(() => {
    if (individualMaxTime.value === 0) return 0;
    return Math.min(100, Math.round((currentElapsed.value / individualMaxTime.value) * 100));
  });

  const totalPercent = computed(() => {
    const total = participants.value.length + doneParticipants.value.length;
    if (total === 0) return 0;
    // 発表中の人も「完了予定」としてカウント（1サイクル早めた進捗表示）
    const done = isRunning.value
      ? doneParticipants.value.length + 1
      : doneParticipants.value.length;
    return Math.round((Math.min(done, total) / total) * 100);
  });

  const totalTimePercent = computed(() => {
    if (settings.value.globalMaxTime === 0) return 0;
    return Math.min(
      100,
      Math.round(
        ((totalElapsed.value + currentElapsed.value) / settings.value.globalMaxTime) * 100,
      ),
    );
  });

  function tick() {
    if (startedAt === null) return;
    currentElapsed.value = Math.round((Date.now() - startedAt) / 1000);
  }

  function start() {
    if (participants.value.length === 0) return;
    if (isRunning.value) return;
    startedAt = Date.now();
    currentElapsed.value = 0;
    isRunning.value = true;
    intervalId = setInterval(tick, 1000);
  }

  /**
   * タイマーを停止し、現在の参加者を完了リストに移動する。
   * next() とは異なり、インターバルを停止して isRunning を false にする。
   */
  function stop() {
    if (!isRunning.value) return;
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (currentParticipant.value) {
      totalElapsed.value += currentElapsed.value;
      moveFirstToDone(currentElapsed.value);
    }
    currentElapsed.value = 0;
    startedAt = null;
    isRunning.value = false;
  }

  /**
   * 次の参加者に進む。インターバルは停止せず、startedAt をリセットして継続する。
   * 最後の参加者の場合は stop() に委譲してタイマーを終了する。
   */
  function next() {
    if (!isRunning.value) return;
    if (participants.value.length <= 1) {
      stop();
      return;
    }
    totalElapsed.value += currentElapsed.value;
    moveFirstToDone(currentElapsed.value);
    startedAt = Date.now();
    currentElapsed.value = 0;
  }

  function reset() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    isRunning.value = false;
    currentElapsed.value = 0;
    totalElapsed.value = 0;
    startedAt = null;
    resetAll();
  }

  return {
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
  };
}
