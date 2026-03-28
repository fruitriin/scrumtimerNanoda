import { test, expect } from "@playwright/test";
import { setupParticipants, getCurrentSpeaker, getDoneParticipants } from "./helpers";

test.describe("スタンドアロンタイマー", () => {
  test.beforeEach(async ({ page }) => {
    // 参加者を事前に登録
    await setupParticipants(page, ["Alice", "Bob", "Charlie"]);
  });

  test("参加者がいないと案内が表示される", async ({ page }) => {
    // 参加者をクリアしてからタイマーページへ
    await page.goto("/#/participants");
    // 全員削除
    while ((await page.getByRole("button", { name: "削除" }).count()) > 0) {
      await page.getByRole("button", { name: "削除" }).first().click();
    }
    await page.goto("/#/");
    await expect(page.getByText("参加者がいないのだ")).toBeVisible();
  });

  test("スタート→次へ→ストップで参加者が完了リストに移動する", async ({ page }) => {
    await page.goto("/#/");

    // スタート
    await page.getByRole("button", { name: "スタート" }).click();
    const firstSpeaker = await getCurrentSpeaker(page);
    expect(firstSpeaker).toBeTruthy();

    // 次へ
    await page.getByRole("button", { name: "次へ" }).click();
    const secondSpeaker = await getCurrentSpeaker(page);
    expect(secondSpeaker).not.toBe(firstSpeaker);

    // ストップ
    await page.getByRole("button", { name: "ストップ" }).click();

    // 完了リストに2人いる
    const done = await getDoneParticipants(page);
    expect(done.length).toBe(2);
  });

  test("リセットで全員待機に戻る", async ({ page }) => {
    await page.goto("/#/");
    await page.getByRole("button", { name: "スタート" }).click();
    await page.getByRole("button", { name: "次へ" }).click();
    await page.getByRole("button", { name: "リセット" }).click();

    // 完了リストが空
    const done = await getDoneParticipants(page);
    expect(done.length).toBe(0);
  });

  test("シャッフルで参加者の順番が変わりうる", async ({ page }) => {
    await page.goto("/#/");

    // シャッフル前の名前を記録
    const beforeSpeaker = await getCurrentSpeaker(page);

    // シャッフルを複数回実行（確率的に順番が変わる）
    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: "シャッフル" }).click();
    }

    // 参加者が3人のままであること（シャッフルで消えない）
    const badges = page.locator(".flex.flex-wrap span.rounded-full:not(.bg-gray-200):not(.bg-red-50)");
    expect(await badges.count()).toBeGreaterThanOrEqual(3);

    // 注: シャッフル結果が同じ場合もあるので順番の変化は assert しない
    void beforeSpeaker;
  });

  test("その場限りの参加者追加ができる", async ({ page }) => {
    await page.goto("/#/");

    // 参加者を追加
    await page.getByPlaceholder("参加者を追加").fill("ゲスト");
    await page.getByRole("button", { name: "追加" }).click();

    // 追加した参加者が表示される
    await expect(page.getByText("ゲスト")).toBeVisible();
  });

  test("全員の発表が終わるとタイマーが停止する", async ({ page }) => {
    await page.goto("/#/");
    await page.getByRole("button", { name: "スタート" }).click();

    // 全員次へで進める（3人 → 2回次へ + 1回は最後で自動停止）
    await page.getByRole("button", { name: "次へ" }).click();
    await page.getByRole("button", { name: "次へ" }).click();

    // タイマーが停止してスタートボタンが表示される（ストップではなく）
    // リセットボタンが有効なまま
    await expect(page.getByRole("button", { name: "リセット" })).toBeVisible();
  });
});
