import { ref } from "vue";
import type { Participant } from "../types";

/** モジュールスコープでシングルトン化 — 全コンポーネントで状態を共有する */
const participants = ref<Participant[]>([]);

/**
 * 参加者管理 composable
 * Phase 2 (0002-core-timer-and-participants) で本実装する
 */
export function useParticipants() {
  function add(_name: string) {
    // TODO: 実装予定
  }

  function remove(_id: string) {
    // TODO: 実装予定
  }

  function shuffle() {
    // TODO: 実装予定
  }

  return { participants, add, remove, shuffle };
}
