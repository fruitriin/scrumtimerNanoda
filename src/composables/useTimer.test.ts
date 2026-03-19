import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("useTimer", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function setup() {
    const participantsModule = await import("./useParticipants");
    const { participants, add } = participantsModule.useParticipants();
    // テスト前にクリーンな状態にする
    participants.value = [];
    add("A", "Alice");
    add("B", "Bob");
    add("C", "Charlie");

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
    const firstInit = currentParticipant.value?.init;
    vi.advanceTimersByTime(3000);
    next();
    expect(currentParticipant.value?.init).not.toBe(firstInit);
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
});
