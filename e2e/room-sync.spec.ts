import { test, expect } from "@playwright/test";
import {
  setupParticipants,
  createRoom,
  joinRoom,
  clickTimerButton,
  getCurrentSpeaker,
  getWaitingParticipants,
  getDoneParticipants,
  getAbsentParticipants,
  waitForSync,
} from "./helpers";

const PARTICIPANTS = ["アリス", "ボブ", "チャーリー"];

test.describe("ルーム同期", () => {
  test("シナリオ1: ルーム作成と参加", async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();
    const host = await hostCtx.newPage();
    const guest = await guestCtx.newPage();

    try {
      // ホストがルームを作成
      const roomId = await createRoom(host);
      expect(roomId).toBeTruthy();
      await expect(host.getByText("ホスト")).toBeVisible();

      // ゲストがルームに参加
      await joinRoom(guest, roomId);
      await expect(guest.getByText("ゲスト")).toBeVisible();

      // 双方で接続人数を確認
      await waitForSync(host);
      await expect(host.getByText("2 人")).toBeVisible();
      await expect(guest.getByText("2 人")).toBeVisible();
    } finally {
      await hostCtx.close();
      await guestCtx.close();
    }
  });

  test("シナリオ2: ホスト操作がゲストに同期される", async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();
    const host = await hostCtx.newPage();
    const guest = await guestCtx.newPage();

    try {
      // ホストに参加者を設定
      await setupParticipants(host, PARTICIPANTS);
      const roomId = await createRoom(host);
      await joinRoom(guest, roomId);
      await waitForSync(guest);

      // ゲスト側にも参加者が同期されていることを確認
      const guestParticipants = await getWaitingParticipants(guest);
      expect(guestParticipants).toEqual(PARTICIPANTS);

      // ホストがスタート
      await clickTimerButton(host, "スタート");
      await waitForSync(guest);

      // ゲスト側でタイマーが動作中
      const guestSpeaker = await getCurrentSpeaker(guest);
      expect(guestSpeaker).toBe("アリス");
      await expect(guest.getByRole("button", { name: "次へ" })).toBeVisible();

      // ホストが次へ
      await clickTimerButton(host, "次へ");
      await waitForSync(guest);

      // ゲスト側で発表者が切り替わっている
      const guestSpeaker2 = await getCurrentSpeaker(guest);
      expect(guestSpeaker2).toBe("ボブ");
      const guestDone = await getDoneParticipants(guest);
      expect(guestDone).toContain("アリス");

      // ホストがストップ
      await clickTimerButton(host, "ストップ");
      await waitForSync(guest);

      // ゲスト側でタイマーが停止
      await expect(guest.getByRole("button", { name: "スタート" })).toBeVisible();
    } finally {
      await hostCtx.close();
      await guestCtx.close();
    }
  });

  test("シナリオ3: ゲスト操作がホストに同期される", async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();
    const host = await hostCtx.newPage();
    const guest = await guestCtx.newPage();

    try {
      await setupParticipants(host, PARTICIPANTS);
      const roomId = await createRoom(host);
      await joinRoom(guest, roomId);
      await waitForSync(guest);

      // ゲストがスタート
      await clickTimerButton(guest, "スタート");
      await waitForSync(host);

      // ホスト側でタイマーが動作中
      const hostSpeaker = await getCurrentSpeaker(host);
      expect(hostSpeaker).toBe("アリス");
      await expect(host.getByRole("button", { name: "次へ" })).toBeVisible();

      // ゲストが次へ
      await clickTimerButton(guest, "次へ");
      await waitForSync(host);

      // ホスト側で発表者が切り替わっている
      const hostSpeaker2 = await getCurrentSpeaker(host);
      expect(hostSpeaker2).toBe("ボブ");

      // ゲストがストップ
      await clickTimerButton(guest, "ストップ");
      await waitForSync(host);

      // ホスト側でタイマーが停止
      await expect(host.getByRole("button", { name: "スタート" })).toBeVisible();
    } finally {
      await hostCtx.close();
      await guestCtx.close();
    }
  });

  test("シナリオ4: シャッフル同期", async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();
    const host = await hostCtx.newPage();
    const guest = await guestCtx.newPage();

    const fiveNames = ["アリス", "ボブ", "チャーリー", "デイブ", "エミリー"];

    try {
      await setupParticipants(host, fiveNames);
      const roomId = await createRoom(host);
      await joinRoom(guest, roomId);
      await waitForSync(guest);

      // ホストがシャッフル
      await clickTimerButton(host, "シャッフル");
      await waitForSync(guest);

      // 両側の参加者順が一致
      const hostOrder = await getWaitingParticipants(host);
      const guestOrder = await getWaitingParticipants(guest);
      expect(guestOrder).toEqual(hostOrder);
    } finally {
      await hostCtx.close();
      await guestCtx.close();
    }
  });

  test("シナリオ5: 不在/出席マーク同期", async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();
    const host = await hostCtx.newPage();
    const guest = await guestCtx.newPage();

    const fourNames = ["アリス", "ボブ", "チャーリー", "デイブ"];

    try {
      await setupParticipants(host, fourNames);
      const roomId = await createRoom(host);
      await joinRoom(guest, roomId);
      await waitForSync(guest);

      // ホストがチャーリーを不在にマーク（3番目の⊖ボタンをクリック）
      const absentButtons = host.locator("button[title='不在にする']");
      await absentButtons.nth(2).click(); // チャーリー (index 2)
      await waitForSync(guest);

      // ゲスト側で不在リストにチャーリーがいる
      const guestAbsent = await getAbsentParticipants(guest);
      expect(guestAbsent).toContain("チャーリー");

      // ゲストがチャーリーを出席に戻す
      const presentButtons = guest.locator("button[title='出席に戻す']");
      await presentButtons.first().click();
      await waitForSync(host);

      // ホスト側で不在リストが空
      const hostAbsent = await getAbsentParticipants(host);
      expect(hostAbsent).not.toContain("チャーリー");
    } finally {
      await hostCtx.close();
      await guestCtx.close();
    }
  });

  test("シナリオ6: 途中参加で状態が同期される", async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();
    const host = await hostCtx.newPage();
    const guest = await guestCtx.newPage();

    try {
      await setupParticipants(host, PARTICIPANTS);
      const roomId = await createRoom(host);

      // ホストがタイマーを開始して1人進める
      await clickTimerButton(host, "スタート");
      await host.waitForTimeout(500);
      await clickTimerButton(host, "次へ");
      await host.waitForTimeout(500);

      // ゲストが途中参加
      await joinRoom(guest, roomId);
      await waitForSync(guest);

      // ゲスト側の状態を確認
      const guestDone = await getDoneParticipants(guest);
      expect(guestDone).toContain("アリス");

      const guestSpeaker = await getCurrentSpeaker(guest);
      expect(guestSpeaker).toBe("ボブ");

      // タイマーが動作中
      await expect(guest.getByRole("button", { name: "次へ" })).toBeVisible();
    } finally {
      await hostCtx.close();
      await guestCtx.close();
    }
  });

  test("シナリオ7: リセット同期", async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();
    const host = await hostCtx.newPage();
    const guest = await guestCtx.newPage();

    try {
      await setupParticipants(host, PARTICIPANTS);
      const roomId = await createRoom(host);
      await joinRoom(guest, roomId);
      await waitForSync(guest);

      // タイマーを開始して1人進める
      await clickTimerButton(host, "スタート");
      await host.waitForTimeout(500);
      await clickTimerButton(host, "次へ");
      await waitForSync(guest);

      // ホストがリセット
      await clickTimerButton(host, "リセット");
      await waitForSync(guest);

      // ゲスト側で全員が待機リストに戻っている
      const guestWaiting = await getWaitingParticipants(guest);
      expect(guestWaiting.length).toBe(3);
      const guestDone = await getDoneParticipants(guest);
      expect(guestDone.length).toBe(0);

      // タイマーが停止状態
      await expect(guest.getByRole("button", { name: "スタート" })).toBeVisible();
    } finally {
      await hostCtx.close();
      await guestCtx.close();
    }
  });
});
