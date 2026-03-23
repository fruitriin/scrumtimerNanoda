import { ref, computed } from "vue";
import { useParticipants } from "./useParticipants";
import { useSettings } from "./useSettings";
import { useAudio } from "./useAudio";

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
/** 同一参加者で音声を多重再生しないためのフラグ */
let wrapUpPlayed = false;
let timeupPlayed = false;
let overtime10Played = false;
let overtime30Played = false;

export function useTimer() {
  const { participants, doneParticipants, moveFirstToDone, resetAll } = useParticipants();
  const { settings } = useSettings();
  const { playTimeup, playStart, playComplete, playWrapUp, playOvertime10, playOvertime30 } =
    useAudio();

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

    const remaining = individualMaxTime.value - currentElapsed.value;
    const overtime = currentElapsed.value - individualMaxTime.value;

    const { alerts } = settings.value;

    // 残り30秒で「まとめには入っているのだ？」
    if (alerts.wrapUp && !wrapUpPlayed && remaining <= 30 && remaining > 0) {
      wrapUpPlayed = true;
      playWrapUp();
    }

    // 時間切れで「時間切れなのだ」音声を再生（1参加者につき1回）
    if (alerts.timeup && !timeupPlayed && overtime >= 0) {
      timeupPlayed = true;
      playTimeup();
    }
    // 超過10秒で「ながいのだ」
    if (alerts.overtime10 && !overtime10Played && overtime >= 10) {
      overtime10Played = true;
      playOvertime10();
    }
    // 超過30秒で「長すぎなのだ」
    if (alerts.overtime30 && !overtime30Played && overtime >= 30) {
      overtime30Played = true;
      playOvertime30();
    }
  }

  function start() {
    if (participants.value.length === 0) return;
    if (isRunning.value) return;
    playStart();
    startedAt = Date.now();
    currentElapsed.value = 0;
    wrapUpPlayed = false;
    timeupPlayed = false;
    overtime10Played = false;
    overtime30Played = false;
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

    // 全員完走したら完走音声を再生
    if (participants.value.length === 0 && doneParticipants.value.length > 0) {
      playComplete();
    }
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
    wrapUpPlayed = false;
    timeupPlayed = false;
    overtime10Played = false;
    overtime30Played = false;
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
    wrapUpPlayed = false;
    timeupPlayed = false;
    overtime10Played = false;
    overtime30Played = false;
    resetAll();
  }

  /** startedAt を取得（ルーム同期用） */
  function getStartedAt(): number | null {
    return startedAt;
  }

  /**
   * ゲスト用: ホストから受信した状態を適用し、自前で tick を開始する。
   * startedAt を共有するので currentElapsed は各自が冪等に計算する。
   */
  function applyTimerState(state: {
    isRunning: boolean;
    startedAt: number | null;
    totalElapsed: number;
  }) {
    // まず既存の interval を停止
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }

    totalElapsed.value = state.totalElapsed;
    startedAt = state.startedAt;
    isRunning.value = state.isRunning;

    // 音声フラグをリセット
    wrapUpPlayed = false;
    timeupPlayed = false;
    overtime10Played = false;
    overtime30Played = false;

    if (state.isRunning && state.startedAt !== null) {
      // startedAt から currentElapsed を即座に計算
      currentElapsed.value = Math.round((Date.now() - state.startedAt) / 1000);
      // 自前の tick を開始
      intervalId = setInterval(tick, 1000);
    } else {
      currentElapsed.value = 0;
    }
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
    getStartedAt,
    applyTimerState,
  };
}
