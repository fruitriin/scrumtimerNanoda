import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("useTimer", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.useFakeTimers();
    // useAudio 内の Audio コンストラクタをモック（jsdom の play() 未実装対策）
    HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
    vi.stubGlobal(
      "Audio",
      class {
        play = vi.fn(() => Promise.resolve());
        preload = "";
        currentTime = 0;
        volume = 1;
        muted = false;
        src = "";
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function setup() {
    const participantsModule = await import("./useParticipants");
    const { participants, add } = participantsModule.useParticipants();
    // テスト前にクリーンな状態にする
    participants.value = [];
    add("Alice");
    add("Bob");
    add("Charlie");

    const timerModule = await import("./useTimer");
    return { ...timerModule.useTimer(), participants };
  }

  it("参加者がいないとスタートできないのだ", async () => {
    const participantsModule = await import("./useParticipants");
    const { participants } = participantsModule.useParticipants();
    participants.value = [];

    const timerModule = await import("./useTimer");
    const { isRunning, start } = timerModule.useTimer();
    start();
    expect(isRunning.value).toBe(false);
  });

  it("スタートでタイマーが動くのだ", async () => {
    const { isRunning, start, currentParticipant } = await setup();
    expect(currentParticipant.value).not.toBeNull();
    start();
    expect(isRunning.value).toBe(true);
  });

  it("ストップで現在の参加者が完了リストに移動するのだ", async () => {
    const participantsModule = await import("./useParticipants");
    const { doneParticipants } = participantsModule.useParticipants();

    const { start, stop, participants } = await setup();
    const initialLen = participants.value.length;
    start();
    vi.advanceTimersByTime(5000);
    stop();
    expect(participants.value.length).toBe(initialLen - 1);
    expect(doneParticipants.value.length).toBe(1);
  });

  it("次へで次の参加者に進むのだ", async () => {
    const { start, next, currentParticipant } = await setup();
    start();
    const firstName = currentParticipant.value?.name;
    vi.advanceTimersByTime(3000);
    next();
    expect(currentParticipant.value?.name).not.toBe(firstName);
  });

  it("リセットで全員待機に戻るのだ", async () => {
    const { start, next, reset, participants } = await setup();
    start();
    vi.advanceTimersByTime(2000);
    next();
    vi.advanceTimersByTime(2000);
    reset();
    expect(participants.value.length).toBe(3);
  });

  it("individualMaxTime がグローバル設定に基づくのだ", async () => {
    const settingsModule = await import("./useSettings");
    const { updateSettings } = settingsModule.useSettings();
    updateSettings({ useGlobalMaxTime: true, globalMaxTime: 300 });

    const { individualMaxTime } = await setup();
    // 3 人で 300 秒 → 100 秒/人
    expect(individualMaxTime.value).toBe(100);
  });

  describe("applyTimerState", () => {
    it("isRunning: true で startedAt を渡すと currentElapsed が計算されるのだ", async () => {
      const { applyTimerState, isRunning, currentElapsed, totalElapsed } = await setup();
      const now = Date.now();
      vi.setSystemTime(now);

      applyTimerState({
        isRunning: true,
        startedAt: now - 5000, // 5秒前に開始
        totalElapsed: 30,
      });

      expect(isRunning.value).toBe(true);
      expect(currentElapsed.value).toBe(5);
      expect(totalElapsed.value).toBe(30);
    });

    it("isRunning: false のとき interval が開始されないのだ", async () => {
      const { applyTimerState, isRunning, currentElapsed } = await setup();

      applyTimerState({
        isRunning: false,
        startedAt: null,
        totalElapsed: 0,
      });

      expect(isRunning.value).toBe(false);
      expect(currentElapsed.value).toBe(0);

      // 時間が進んでも currentElapsed は変わらない
      vi.advanceTimersByTime(3000);
      expect(currentElapsed.value).toBe(0);
    });

    it("既存の interval を停止して新しい状態を適用するのだ", async () => {
      const { start, applyTimerState, isRunning, currentElapsed } = await setup();
      const now = Date.now();
      vi.setSystemTime(now);

      // まずスタートして interval を動かす
      start();
      vi.advanceTimersByTime(3000);
      vi.setSystemTime(now + 3000);

      // applyTimerState で新しい状態に上書き
      applyTimerState({
        isRunning: false,
        startedAt: null,
        totalElapsed: 10,
      });

      expect(isRunning.value).toBe(false);
      expect(currentElapsed.value).toBe(0);

      // interval が停止しているので進まない
      vi.advanceTimersByTime(5000);
      expect(currentElapsed.value).toBe(0);
    });
  });
});
