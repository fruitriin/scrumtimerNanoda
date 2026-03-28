import { ref, watch } from "vue";
import type { DailyMemo, PublicMemoPayload } from "../types";

const STORAGE_KEY = "scrumtimer-memos";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

type StoredMemos = Record<
  string,
  {
    publicContent: string;
    privateContent: string;
  }
>;

function loadAllMemos(): StoredMemos {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") return parsed as StoredMemos;
    }
  } catch {
    // localStorage が壊れていても安全にフォールバック
  }
  return {};
}

function loadTodayMemo(): DailyMemo {
  const all = loadAllMemos();
  const today = all[todayKey()];
  return {
    publicContent: today?.publicContent ?? "",
    privateContent: today?.privateContent ?? "",
    updatedAt: Date.now(),
  };
}

/** モジュールスコープでシングルトン化 */
const myMemo = ref<DailyMemo>(loadTodayMemo());
const publicMemos = ref<Map<string, PublicMemoPayload>>(new Map());
// localStorage に自動永続化（myMemo 変更時）
watch(
  myMemo,
  (val) => {
    const all = loadAllMemos();
    all[todayKey()] = {
      publicContent: val.publicContent,
      privateContent: val.privateContent,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },
  { deep: true },
);

/**
 * デイリースクラムメモ composable
 */
export function useMemo() {
  function updatePublicMemo(content: string) {
    myMemo.value = {
      ...myMemo.value,
      publicContent: content,
      updatedAt: Date.now(),
    };
  }

  function updatePrivateMemo(content: string) {
    myMemo.value = {
      ...myMemo.value,
      privateContent: content,
      updatedAt: Date.now(),
    };
  }

  function clearMemo() {
    myMemo.value = {
      publicContent: "",
      privateContent: "",
      updatedAt: Date.now(),
    };
  }

  /** 他の参加者の公開メモを受信して更新（Map 参照を更新してリアクティビティを確保） */
  function applyPublicMemo(memo: PublicMemoPayload) {
    const next = new Map(publicMemos.value);
    next.set(memo.participantId, memo);
    publicMemos.value = next;
  }

  /** ルーム参加時に一括で公開メモを適用 */
  function applyAllPublicMemos(memos: PublicMemoPayload[]) {
    const next = new Map(publicMemos.value);
    for (const memo of memos) {
      next.set(memo.participantId, memo);
    }
    publicMemos.value = next;
  }

  /** 過去の日付のメモを読み込む */
  function loadMemoForDate(date: string): DailyMemo {
    const all = loadAllMemos();
    const entry = all[date];
    return {
      publicContent: entry?.publicContent ?? "",
      privateContent: entry?.privateContent ?? "",
      updatedAt: 0,
    };
  }

  /** 保存されている日付の一覧を取得 */
  function getSavedDates(): string[] {
    return Object.keys(loadAllMemos()).sort().reverse();
  }

  /** 公開メモのペイロードを取得（WebRTC送信用） */
  function getPublicMemoPayload(participantId: string, participantName: string): PublicMemoPayload {
    return {
      participantId,
      participantName,
      content: myMemo.value.publicContent,
      updatedAt: myMemo.value.updatedAt,
    };
  }

  return {
    myMemo,
    publicMemos,
    updatePublicMemo,
    updatePrivateMemo,
    clearMemo,
    applyPublicMemo,
    applyAllPublicMemos,
    loadMemoForDate,
    getSavedDates,
    getPublicMemoPayload,
  };
}
