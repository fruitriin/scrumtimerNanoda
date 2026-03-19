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
});
