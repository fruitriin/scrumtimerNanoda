import { ref } from "vue";
import type { AppSettings } from "../types";

const DEFAULT_SETTINGS: AppSettings = {
  maxTime: 120,
  voicevoxEnabled: false,
  voicevoxEndpoint: "http://localhost:50021",
  voicevoxSpeakerId: 3,
};

/** モジュールスコープでシングルトン化 — 全コンポーネントで状態を共有する */
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });

/**
 * 設定管理 composable
 * Phase 2 で localStorage 永続化を実装する
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
