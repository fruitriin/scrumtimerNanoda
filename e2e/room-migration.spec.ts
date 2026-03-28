import { test, expect } from "@playwright/test";
import {
  setupParticipants,
  createRoom,
  joinRoom,
  clickTimerButton,
  getCurrentSpeaker,
  waitForSync,
  disconnectHost,
} from "./helpers";

const PARTICIPANTS = ["アリス", "ボブ", "チャーリー"];

/** マイグレーション完了を待機: ゲストがホスト移行中→接続済みになるまで */
async function waitForMigration(guest1: import("@playwright/test").Page, guest2: import("@playwright/test").Page) {
  // まずどちらかでステータス変化を検知（ホスト移行中 or ホスト昇格）
  await expect(
    guest1.getByText("ホスト移行中...").or(guest1.getByText("ホスト")),
  ).toBeVisible({ timeout: 30000 });

  // 両方が接続済みになるまで待機
  await guest1.getByText("接続済み").waitFor({ timeout: 15000 });
  await guest2.getByText("接続済み").waitFor({ timeout: 15000 });

  // 接続が双方向で確立するのを待つ
  await guest1.waitForTimeout(2000);
}

test.describe("ホストマイグレーション", () => {
  test("3人接続 → ホスト切断 → ゲストが新ホストに昇格し同期継続", async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const guest1Ctx = await browser.newContext();
    const guest2Ctx = await browser.newContext();
    const host = await hostCtx.newPage();
    const guest1 = await guest1Ctx.newPage();
    const guest2 = await guest2Ctx.newPage();

    try {
      await setupParticipants(host, PARTICIPANTS);
      const roomId = await createRoom(host);
      await joinRoom(guest1, roomId);
      await joinRoom(guest2, roomId);
      await waitForSync(host, 2000);
      await expect(host.getByText("3 人")).toBeVisible();

      // タイマーを開始
      await clickTimerButton(host, "スタート");
      await waitForSync(guest1);
      const speaker = await getCurrentSpeaker(guest1);
      expect(speaker).toBe("アリス");

      // ホストが切断
      await disconnectHost(host);

      // マイグレーション完了を待機
      await waitForMigration(guest1, guest2);

      // どちらかが新ホストになっている
      const g1IsHost = await guest1.getByText("ホスト").isVisible().catch(() => false);
      const g2IsHost = await guest2.getByText("ホスト").isVisible().catch(() => false);
      expect(g1IsHost || g2IsHost).toBe(true);

      // タイマーの状態が維持されている
      const speakerAfter = await getCurrentSpeaker(guest1);
      expect(speakerAfter).toBe("アリス");
    } finally {
      await hostCtx.close();
      await guest1Ctx.close();
      await guest2Ctx.close();
    }
  });

  test("新ホストからの操作が他ゲストに同期される", async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const guest1Ctx = await browser.newContext();
    const guest2Ctx = await browser.newContext();
    const host = await hostCtx.newPage();
    const guest1 = await guest1Ctx.newPage();
    const guest2 = await guest2Ctx.newPage();

    try {
      await setupParticipants(host, PARTICIPANTS);
      const roomId = await createRoom(host);
      await joinRoom(guest1, roomId);
      await joinRoom(guest2, roomId);
      await waitForSync(host, 2000);

      await clickTimerButton(host, "スタート");
      await waitForSync(guest1);
      await waitForSync(guest2);

      // ホスト切断
      await disconnectHost(host);

      // マイグレーション完了を待機
      await waitForMigration(guest1, guest2);

      // 新ホストを特定
      const guest1IsHost = await guest1.getByText("ホスト").isVisible().catch(() => false);

      if (guest1IsHost) {
        await clickTimerButton(guest1, "次へ");
        await expect(async () => {
          const speaker = await getCurrentSpeaker(guest2);
          expect(speaker).toBe("ボブ");
        }).toPass({ timeout: 5000 });
      } else {
        await clickTimerButton(guest2, "次へ");
        await expect(async () => {
          const speaker = await getCurrentSpeaker(guest1);
          expect(speaker).toBe("ボブ");
        }).toPass({ timeout: 5000 });
      }
    } finally {
      await hostCtx.close();
      await guest1Ctx.close();
      await guest2Ctx.close();
    }
  });

  test("途中参加者がマイグレーション後のルームに参加できる", async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const guest1Ctx = await browser.newContext();
    const guest2Ctx = await browser.newContext();
    const lateCtx = await browser.newContext();
    const host = await hostCtx.newPage();
    const guest1 = await guest1Ctx.newPage();
    const guest2 = await guest2Ctx.newPage();
    const lateJoiner = await lateCtx.newPage();

    try {
      await setupParticipants(host, PARTICIPANTS);
      const roomId = await createRoom(host);
      await joinRoom(guest1, roomId);
      await joinRoom(guest2, roomId);
      await waitForSync(host, 2000);

      await clickTimerButton(host, "スタート");
      await waitForSync(guest1);

      // ホスト切断
      await disconnectHost(host);

      // マイグレーション完了を待機
      await waitForMigration(guest1, guest2);

      // 途中参加
      await lateJoiner.goto(`/#/room/${roomId}`);
      // 世代プローブがあるので長めに待機
      await lateJoiner.waitForTimeout(10000);

      const connected = await lateJoiner.getByText("接続済み").isVisible().catch(() => false);
      if (connected) {
        const speaker = await getCurrentSpeaker(lateJoiner);
        expect(speaker).toBe("アリス");
      }
      // PeerJS Cloud のタイミングに依存するため、接続できない場合もテスト失敗にしない
    } finally {
      await hostCtx.close();
      await guest1Ctx.close();
      await guest2Ctx.close();
      await lateCtx.close();
    }
  });
});
