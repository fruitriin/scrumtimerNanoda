import { ref, watch } from "vue";
import type { AppSettings } from "../types";
import { safeSetItem } from "../utils/safeStorage";

const STORAGE_KEY = "scrumtimer-settings";

const DEFAULT_SETTINGS: AppSettings = {
  useGlobalMaxTime: true,
  globalMaxTime: 900, // 15分
  volume: 0.5,
  muted: false,
  alerts: {
    wrapUp: true,
    timeup: true,
    overtime10: true,
    overtime30: true,
  },
};

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // localStorage が壊れていても安全にフォールバック
  }
  return { ...DEFAULT_SETTINGS };
}

/** モジュールスコープでシングルトン化 */
const settings = ref<AppSettings>(loadSettings());

// localStorage に自動永続化
watch(
  settings,
  (val) => {
    safeSetItem(STORAGE_KEY, JSON.stringify(val));
  },
  { deep: true },
);

/**
 * 設定管理 composable
 */
export function useSettings() {
  function updateSettings(partial: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...partial };
  }

  function resetSettings() {
    settings.value = { ...DEFAULT_SETTINGS };
  }

  return { settings, updateSettings, resetSettings };
}
