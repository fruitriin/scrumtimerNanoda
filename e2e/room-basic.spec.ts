import { test, expect } from "@playwright/test";
import { createRoom, waitForSync } from "./helpers";

test.describe("ルーム基本動作", () => {
  test("ルーム作成で URL が生成される", async ({ page }) => {
    await page.goto("/#/room");
    await page.getByRole("button", { name: "ルームを作成" }).click();
    await page.getByText("接続済み").waitFor({ timeout: 15000 });

    // URL にルーム ID が含まれる
    expect(page.url()).toMatch(/#\/room\/[a-zA-Z0-9_-]+$/);

    // ルーム ID がパネルに表示される
    const roomIdDisplay = page.locator("span.font-mono");
    const roomId = await roomIdDisplay.textContent();
    expect(roomId).toBeTruthy();
    expect(roomId!.trim().length).toBe(8);
  });

  test("退出でホームに戻る", async ({ page }) => {
    await createRoom(page);
    await page.getByRole("button", { name: "退出" }).click();

    // ルートに戻る
    await expect(page).toHaveURL(/\/#\/$/);
  });

  test("存在しないルーム ID でエラー表示", async ({ page }) => {
    await page.goto("/#/room/nonexistent");

    // エラーメッセージが表示される（接続タイムアウト）
    await expect(page.getByText(/ルームが見つからない|接続エラー/)).toBeVisible({
      timeout: 15000,
    });
  });
});
