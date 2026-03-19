import { ref } from "vue";

/**
 * タイマーロジック composable
 * Phase 2 (0002-core-timer-and-participants) で本実装する
 */
export function useTimer() {
  const isRunning = ref(false);
  const elapsed = ref(0);
  const currentIndex = ref(0);

  function start() {
    // TODO: 実装予定
    isRunning.value = true;
  }

  function stop() {
    // TODO: 実装予定
    isRunning.value = false;
  }

  function next() {
    // TODO: 実装予定
    currentIndex.value++;
  }

  function reset() {
    isRunning.value = false;
    elapsed.value = 0;
    currentIndex.value = 0;
  }

  return { isRunning, elapsed, currentIndex, start, stop, next, reset };
}
