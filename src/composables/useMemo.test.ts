import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick } from "vue";

describe("useMemo", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  async function loadUseMemo() {
    const mod = await import("./useMemo");
    return mod.useMemo();
  }

  it("初期状態で空のメモが読み込まれるのだ", async () => {
    const { myMemo } = await loadUseMemo();
    expect(myMemo.value.publicContent).toBe("");
    expect(myMemo.value.privateContent).toBe("");
  });

  it("公開メモを更新できるのだ", async () => {
    const { myMemo, updatePublicMemo } = await loadUseMemo();
    updatePublicMemo("# 今日やること\n- レビュー対応");
    expect(myMemo.value.publicContent).toBe("# 今日やること\n- レビュー対応");
  });

  it("秘匿メモを更新できるのだ", async () => {
    const { myMemo, updatePrivateMemo } = await loadUseMemo();
    updatePrivateMemo("秘密のメモ");
    expect(myMemo.value.privateContent).toBe("秘密のメモ");
  });

  it("メモをクリアできるのだ", async () => {
    const { myMemo, updatePublicMemo, updatePrivateMemo, clearMemo } = await loadUseMemo();
    updatePublicMemo("公開");
    updatePrivateMemo("秘匿");
    clearMemo();
    expect(myMemo.value.publicContent).toBe("");
    expect(myMemo.value.privateContent).toBe("");
  });

  it("メモが localStorage に永続化されるのだ", async () => {
    const { updatePublicMemo } = await loadUseMemo();
    updatePublicMemo("テストメモ");
    await nextTick();

    const stored = localStorage.getItem("scrumtimer-memos");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    const today = new Date().toISOString().slice(0, 10);
    expect(parsed[today].publicContent).toBe("テストメモ");
  });

  it("秘匿メモも localStorage に保存されるのだ", async () => {
    const { updatePrivateMemo } = await loadUseMemo();
    updatePrivateMemo("秘密");
    await nextTick();

    const stored = localStorage.getItem("scrumtimer-memos");
    const parsed = JSON.parse(stored!);
    const today = new Date().toISOString().slice(0, 10);
    expect(parsed[today].privateContent).toBe("秘密");
  });

  it("他の参加者の公開メモを受信して保持できるのだ", async () => {
    const { publicMemos, applyPublicMemo } = await loadUseMemo();
    applyPublicMemo({
      participantId: "p1",
      participantName: "Alice",
      content: "Aliceのメモ",
      updatedAt: Date.now(),
    });
    expect(publicMemos.value.get("p1")?.content).toBe("Aliceのメモ");
  });

  it("一括で公開メモを適用できるのだ", async () => {
    const { publicMemos, applyAllPublicMemos } = await loadUseMemo();
    applyAllPublicMemos([
      { participantId: "p1", participantName: "Alice", content: "A", updatedAt: Date.now() },
      { participantId: "p2", participantName: "Bob", content: "B", updatedAt: Date.now() },
    ]);
    expect(publicMemos.value.size).toBe(2);
  });

  it("保存された日付一覧を取得できるのだ", async () => {
    const { updatePublicMemo, getSavedDates } = await loadUseMemo();
    updatePublicMemo("今日のメモ");
    await nextTick();

    const dates = getSavedDates();
    expect(dates).toHaveLength(1);
    expect(dates[0]).toBe(new Date().toISOString().slice(0, 10));
  });

  it("公開メモのペイロードを取得できるのだ", async () => {
    const { updatePublicMemo, getPublicMemoPayload } = await loadUseMemo();
    updatePublicMemo("共有メモ");
    const payload = getPublicMemoPayload("myId", "自分");
    expect(payload.participantId).toBe("myId");
    expect(payload.participantName).toBe("自分");
    expect(payload.content).toBe("共有メモ");
  });

  it("localStorage からメモが復元されるのだ", async () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(
      "scrumtimer-memos",
      JSON.stringify({ [today]: { publicContent: "保存済み", privateContent: "秘密" } }),
    );

    const { myMemo } = await loadUseMemo();
    expect(myMemo.value.publicContent).toBe("保存済み");
    expect(myMemo.value.privateContent).toBe("秘密");
  });
});
