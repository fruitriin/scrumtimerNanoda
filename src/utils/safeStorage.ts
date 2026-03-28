import { ref } from "vue";

/** ストレージエラーの通知用（UIで表示） */
export const storageError = ref<string | null>(null);

/** storageError を閉じる */
export function dismissStorageError() {
  storageError.value = null;
}

/** localStorage に安全に書き込む。quota exceeded 時にエラーを通知する */
export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    // 既にエラー表示中なら上書きしない
    if (storageError.value) return;
    const isQuota =
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED");
    if (isQuota) {
      storageError.value = "ストレージ容量が不足しているのだ。古いデータを削除してほしいのだ。";
      console.warn(`localStorage quota exceeded for key: ${key}`);
    } else {
      storageError.value = "データの保存に失敗したのだ。";
      console.warn(`localStorage write failed for key: ${key}`, err);
    }
  }
}
