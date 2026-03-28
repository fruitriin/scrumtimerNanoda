import { ref, watch } from "vue";
import type { Participant } from "../types";
import { createParticipant } from "../models/Participant";

const STORAGE_KEY = "scrumtimer-participants";

function sanitizeParticipant(p: Partial<Participant>): Participant {
  return {
    id: p.id ?? crypto.randomUUID(),
    name: p.name ?? "",
    time: typeof p.time === "number" ? p.time : 0,
  };
}

function loadMaster(): Participant[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 新形式: { participants, done, absent } → マスターに統合
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const all = [
          ...(Array.isArray(parsed.participants) ? parsed.participants : []),
          ...(Array.isArray(parsed.done) ? parsed.done : []),
          ...(Array.isArray(parsed.absent) ? parsed.absent : []),
        ];
        return all.map(sanitizeParticipant);
      }
      // 旧形式（配列のみ）
      if (Array.isArray(parsed)) {
        return parsed.map(sanitizeParticipant);
      }
    }
  } catch {
    // localStorage が壊れていても安全にフォールバック
  }
  return [];
}

/** マスターリスト（原本）: localStorage に永続化される唯一のリスト */
const masterParticipants = ref<Participant[]>(loadMaster());

// マスターリストのみ localStorage に自動永続化
watch(
  masterParticipants,
  (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
  },
  { deep: true },
);

/** タイマーセッション用の一時状態（永続化しない） */
function freshCopy(): Participant[] {
  return masterParticipants.value.map((p) => ({ ...p, time: 0 }));
}

const participants = ref<Participant[]>(freshCopy());
const doneParticipants = ref<Participant[]>([]);
const absentParticipants = ref<Participant[]>([]);

/**
 * 参加者管理 composable
 */
export function useParticipants() {
  // --- マスターリスト操作（参加者管理画面用） ---

  function add(name: string) {
    masterParticipants.value.push(createParticipant(name));
    syncFromMaster();
  }

  function remove(id: string) {
    masterParticipants.value = masterParticipants.value.filter((p) => p.id !== id);
    syncFromMaster();
  }

  function moveParticipant(fromIndex: number, toIndex: number) {
    const arr = [...masterParticipants.value];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    masterParticipants.value = arr;
    syncFromMaster();
  }

  function exportToJSON(): string {
    return JSON.stringify(masterParticipants.value);
  }

  function importFromJSON(json: string) {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        masterParticipants.value = parsed.map((p: Partial<Participant>) => ({
          id: p.id ?? crypto.randomUUID(),
          name: p.name ?? "",
          time: 0,
        }));
        syncFromMaster();
      }
    } catch {
      console.error("参加者 JSON のパースに失敗したのだ");
    }
  }

  function purge() {
    masterParticipants.value = [];
    syncFromMaster();
  }

  /** マスター変更時にタイマー状態をリセット */
  function syncFromMaster() {
    participants.value = freshCopy();
    doneParticipants.value = [];
    absentParticipants.value = [];
  }

  // --- タイマーセッション操作（その場限り・masterに影響しない） ---

  /** セッション限りで参加者を追加（masterには保存しない） */
  function addTemporary(name: string) {
    participants.value.push(createParticipant(name));
  }

  /** セッション限りで参加者を削除（masterには影響しない） */
  function removeTemporary(id: string) {
    participants.value = participants.value.filter((p) => p.id !== id);
  }

  /** Fisher-Yates シャッフル（発表中の先頭は固定、残りのみシャッフル） */
  function shuffle(keepFirst = false) {
    const arr = [...participants.value];
    const start = keepFirst ? 1 : 0;
    for (let i = arr.length - 1; i > start; i--) {
      const j = start + Math.floor(Math.random() * (i - start + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    participants.value = arr;
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

  /** 完了リスト → 待機リストに全員戻す（マスターから再コピー） */
  function resetAll() {
    syncFromMaster();
  }

  /** 先頭を完了リストに移動 */
  function moveFirstToDone(elapsed: number) {
    if (participants.value.length === 0) return;
    const [p] = participants.value.splice(0, 1);
    p.time = elapsed;
    doneParticipants.value.push(p);
  }

  return {
    masterParticipants,
    participants,
    doneParticipants,
    absentParticipants,
    add,
    remove,
    shuffle,
    moveParticipant,
    markAbsent,
    markPresent,
    resetAll,
    addTemporary,
    removeTemporary,
    moveFirstToDone,
    exportToJSON,
    importFromJSON,
    purge,
  };
}
