import { describe, it, expect, beforeEach, vi } from "vitest";

// localStorage のモックをリセットするためモジュールを動的 import する
describe("useSettings", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  async function loadUseSettings() {
    const mod = await import("./useSettings");
    return mod.useSettings();
  }

  it("デフォルト設定が読み込まれるのだ", async () => {
    const { settings } = await loadUseSettings();
    expect(settings.value.useGlobalMaxTime).toBe(true);
    expect(settings.value.globalMaxTime).toBe(900);
  });

  it("設定を更新できるのだ", async () => {
    const { settings, updateSettings } = await loadUseSettings();
    updateSettings({ globalMaxTime: 600 });
    expect(settings.value.globalMaxTime).toBe(600);
    expect(settings.value.useGlobalMaxTime).toBe(true); // 他のフィールドは保持
  });

  it("設定をリセットできるのだ", async () => {
    const { settings, updateSettings, resetSettings } = await loadUseSettings();
    updateSettings({ globalMaxTime: 300, useGlobalMaxTime: false });
    resetSettings();
    expect(settings.value.globalMaxTime).toBe(900);
    expect(settings.value.useGlobalMaxTime).toBe(true);
  });

  describe("alerts 設定", () => {
    it("デフォルトで全アラートが有効なのだ", async () => {
      const { settings } = await loadUseSettings();
      expect(settings.value.alerts.wrapUp).toBe(true);
      expect(settings.value.alerts.timeup).toBe(true);
      expect(settings.value.alerts.overtime10).toBe(true);
      expect(settings.value.alerts.overtime30).toBe(true);
    });

    it("個別にアラートを OFF にできるのだ", async () => {
      const { settings, updateSettings } = await loadUseSettings();
      updateSettings({ alerts: { ...settings.value.alerts, wrapUp: false } });
      expect(settings.value.alerts.wrapUp).toBe(false);
      // 他のアラートは影響なし
      expect(settings.value.alerts.timeup).toBe(true);
      expect(settings.value.alerts.overtime10).toBe(true);
      expect(settings.value.alerts.overtime30).toBe(true);
    });

    it("個別にアラートを ON に戻せるのだ", async () => {
      const { settings, updateSettings } = await loadUseSettings();
      updateSettings({ alerts: { ...settings.value.alerts, timeup: false } });
      expect(settings.value.alerts.timeup).toBe(false);
      updateSettings({ alerts: { ...settings.value.alerts, timeup: true } });
      expect(settings.value.alerts.timeup).toBe(true);
    });
  });
});
