import type { Page } from "@playwright/test";

/** 参加者ページで名前を追加する */
export async function setupParticipants(page: Page, names: string[]) {
  await page.goto("/#/participants");
  for (const name of names) {
    await page.getByPlaceholder("名前").fill(name);
    await page.getByRole("button", { name: "追加" }).click();
  }
  // 追加後にトップページに戻る
  await page.goto("/#/");
}

/** ルームを作成し roomId を返す */
export async function createRoom(page: Page): Promise<string> {
  await page.goto("/#/room");
  await page.getByRole("button", { name: "ルームを作成" }).click();
  await waitForConnection(page);
  // URL から roomId を取得
  const url = page.url();
  const match = url.match(/#\/room\/(.+)$/);
  if (!match) throw new Error("ルーム ID が URL に見つからない");
  return match[1];
}

/** ルームに参加する */
export async function joinRoom(page: Page, roomId: string) {
  await page.goto(`/#/room/${roomId}`);
  await waitForConnection(page);
}

/** 「接続済み」テキストを待機する */
export async function waitForConnection(page: Page) {
  await page.getByText("接続済み").waitFor({ timeout: 15000 });
}

/** タイマーボタンをクリックする */
export async function clickTimerButton(page: Page, label: string) {
  await page.getByRole("button", { name: label }).click();
}

/** 現在の発表者名を取得する */
export async function getCurrentSpeaker(page: Page): Promise<string> {
  const el = page.locator("section.mb-6 h4.text-sm.font-bold");
  return (await el.textContent()) ?? "";
}

/** 待機中の参加者名を順番に取得する */
export async function getWaitingParticipants(page: Page): Promise<string[]> {
  // 待機中の参加者バッジ（bg-emerald-200, bg-blue-100, bg-gray-100）からテキスト取得
  const badges = page.locator(
    ".flex.flex-wrap span.rounded-full:not(.bg-gray-200):not(.bg-red-50)",
  );
  const count = await badges.count();
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = (await badges.nth(i).textContent()) ?? "";
    // "⊖ 名前 -" のようなテキストから名前だけ抽出
    const cleaned = text.replace(/[⊖⊕✓]/g, "").replace(/[\d:]+/g, "").replace(/-/g, "").trim();
    if (cleaned) names.push(cleaned);
  }
  return names;
}

/** 完了した参加者名を取得する */
export async function getDoneParticipants(page: Page): Promise<string[]> {
  const badges = page.locator(".flex.flex-wrap span.bg-gray-200");
  const count = await badges.count();
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = (await badges.nth(i).textContent()) ?? "";
    const cleaned = text.replace(/[✓]/g, "").replace(/[\d:]+/g, "").trim();
    if (cleaned) names.push(cleaned);
  }
  return names;
}

/** 不在の参加者名を取得する */
export async function getAbsentParticipants(page: Page): Promise<string[]> {
  const badges = page.locator(".flex.flex-wrap span.bg-red-50");
  const count = await badges.count();
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = (await badges.nth(i).textContent()) ?? "";
    const cleaned = text.replace(/[⊕]/g, "").trim();
    if (cleaned) names.push(cleaned);
  }
  return names;
}

/** 短い待機（同期の伝播を待つ） */
export async function waitForSync(page: Page, ms = 1000) {
  await page.waitForTimeout(ms);
}

/** ホストの PeerJS 接続を破棄してゲスト側に切断を検知させる */
export async function disconnectHost(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    const cleanup = w.__useRoom_cleanup__ as (() => void) | undefined;
    if (cleanup) cleanup();
  });
  // WebRTC の close イベントがリモート側に伝播するまで待機
  await page.waitForTimeout(3000);
}
