import { test, expect } from "@playwright/test";

test.describe("設定画面", () => {
  test("グローバル最大時間を変更できる", async ({ page }) => {
    await page.goto("/#/settings");

    // グローバル最大時間の入力欄を探す
    const timeInput = page.locator('input[type="number"]').first();
    await timeInput.fill("600");

    // 値が反映される
    await expect(timeInput).toHaveValue("600");
  });

  test("設定がリロード後も保持される", async ({ page }) => {
    await page.goto("/#/settings");

    // 最大時間を変更
    const timeInput = page.locator('input[type="number"]').first();
    await timeInput.fill("300");

    // リロード
    await page.reload();
    await page.goto("/#/settings");

    // 値が保持されている
    await expect(page.locator('input[type="number"]').first()).toHaveValue("300");
  });
});
