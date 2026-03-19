import { ref, watch } from "vue";
import type { Participant } from "../types";
import { createParticipant } from "../models/Participant";

const STORAGE_KEY = "scrumtimer-participants";

function loadParticipants(): Participant[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map((p: Partial<Participant>) => ({
          id: p.id ?? crypto.randomUUID(),
          init: p.init ?? "",
          name: p.name ?? "",
          time: typeof p.time === "number" ? p.time : 0,
        }));
      }
    }
  } catch {
    // localStorage が壊れていても安全にフォールバック
  }
  return [];
}

/** モジュールスコープでシングルトン化 */
const participants = ref<Participant[]>(loadParticipants());
const doneParticipants = ref<Participant[]>([]);
const absentParticipants = ref<Participant[]>([]);

// localStorage に自動永続化（待機リストのみ保存）
watch(
  participants,
  (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
  },
  { deep: true },
);

/**
 * 参加者管理 composable
 */
export function useParticipants() {
  function add(init: string, name: string) {
    participants.value.unshift(createParticipant(init, name));
  }

  function remove(id: string) {
    participants.value = participants.value.filter((p) => p.id !== id);
  }

  /** Fisher-Yates シャッフル */
  function shuffle() {
    const arr = [...participants.value];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    participants.value = arr;
  }

  function sort() {
    participants.value = [...participants.value].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * 不在にする（最低2人は残す）
   */
  function markAbsent(id: string): boolean {
    if (participants.value.length <= 2) return false;
    const idx = participants.value.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    const [p] = participants.value.splice(idx, 1);
    absentParticipants.value.push(p);
    return true;
  }

  function markPresent(id: string) {
    const idx = absentParticipants.value.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const [p] = absentParticipants.value.splice(idx, 1);
    participants.value.push(p);
  }

  /** 完了リスト → 待機リストに全員戻す */
  function resetAll() {
    for (const p of doneParticipants.value) {
      p.time = 0;
      participants.value.push(p);
    }
    doneParticipants.value = [];
  }

  /** 先頭を完了リストに移動 */
  function moveFirstToDone(elapsed: number) {
    if (participants.value.length === 0) return;
    const [p] = participants.value.splice(0, 1);
    p.time = elapsed;
    doneParticipants.value.push(p);
  }

  function exportToJSON(): string {
    return JSON.stringify(participants.value);
  }

  function importFromJSON(json: string) {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        participants.value = parsed.map((p: Partial<Participant>) => ({
          id: p.id ?? crypto.randomUUID(),
          init: p.init ?? "",
          name: p.name ?? "",
          time: 0,
        }));
      }
    } catch {
      console.error("参加者 JSON のパースに失敗したのだ");
    }
  }

  function purge() {
    participants.value = [];
    doneParticipants.value = [];
    absentParticipants.value = [];
  }

  return {
    participants,
    doneParticipants,
    absentParticipants,
    add,
    remove,
    shuffle,
    sort,
    markAbsent,
    markPresent,
    resetAll,
    moveFirstToDone,
    exportToJSON,
    importFromJSON,
    purge,
  };
}
