import { describe, it, expect, beforeEach, vi } from "vitest";

describe("useAudio", () => {
  type MockAudioInstance = {
    play: ReturnType<typeof vi.fn>;
    preload: string;
    currentTime: number;
    volume: number;
    muted: boolean;
    src: string;
  };

  let mockAudios: MockAudioInstance[];

  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    mockAudios = [];

    // HTMLMediaElement.prototype.play をモック（jsdom の "Not implemented" 対策）
    HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());

    // Audio コンストラクタをモック（class 構文で new 対応）
    const MockAudio = class {
      play = vi.fn(() => Promise.resolve());
      preload = "";
      currentTime = 0;
      volume = 1;
      muted = false;
      src = "";
      constructor() {
        mockAudios.push(this as unknown as MockAudioInstance);
      }
    };
    vi.stubGlobal("Audio", MockAudio);
  });

  async function loadUseAudio() {
    const mod = await import("./useAudio");
    return mod.useAudio();
  }

  it("全トラックが生成されるのだ", async () => {
    await loadUseAudio();
    // start, wrap-up, timeup, overtime-10, overtime-30, complete の6トラック
    expect(mockAudios).toHaveLength(6);
  });

  it("playStart で start トラックが再生されるのだ", async () => {
    const { playStart } = await loadUseAudio();
    playStart();
    // 最初に生成されたトラックが start
    expect(mockAudios[0].play).toHaveBeenCalled();
  });

  it("playTimeup で timeup トラックが再生されるのだ", async () => {
    const { playTimeup } = await loadUseAudio();
    playTimeup();
    // 3番目のトラックが timeup (start=0, wrap-up=1, timeup=2)
    expect(mockAudios[2].play).toHaveBeenCalled();
  });

  it("playComplete で complete トラックが再生されるのだ", async () => {
    const { playComplete } = await loadUseAudio();
    playComplete();
    // 6番目のトラックが complete
    expect(mockAudios[5].play).toHaveBeenCalled();
  });

  it("音量設定が全トラックに反映されるのだ", async () => {
    const settingsMod = await import("./useSettings");
    settingsMod.useSettings().updateSettings({ volume: 0.8 });

    await loadUseAudio();
    for (const audio of mockAudios) {
      expect(audio.volume).toBe(0.8);
    }
  });

  it("ミュート設定が全トラックに反映されるのだ", async () => {
    const settingsMod = await import("./useSettings");
    settingsMod.useSettings().updateSettings({ muted: true });

    await loadUseAudio();
    for (const audio of mockAudios) {
      expect(audio.muted).toBe(true);
    }
  });
});
