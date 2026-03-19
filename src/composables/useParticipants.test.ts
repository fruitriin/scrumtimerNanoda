import { describe, it, expect, beforeEach, vi } from "vitest";

describe("useParticipants", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  async function loadUseParticipants() {
    const mod = await import("./useParticipants");
    return mod.useParticipants();
  }

  it("参加者を追加できるのだ", async () => {
    const { participants, add } = await loadUseParticipants();
    add("ZD", "ずんだもん");
    expect(participants.value).toHaveLength(1);
    expect(participants.value[0].name).toBe("ずんだもん");
    expect(participants.value[0].init).toBe("ZD");
  });

  it("参加者を削除できるのだ", async () => {
    const { participants, add, remove } = await loadUseParticipants();
    add("ZD", "ずんだもん");
    add("TK", "つむぎ");
    const id = participants.value[0].id;
    remove(id);
    expect(participants.value).toHaveLength(1);
    expect(participants.value[0].name).toBe("ずんだもん");
  });

  it("シャッフルしても要素数は変わらないのだ", async () => {
    const { participants, add, shuffle } = await loadUseParticipants();
    add("A", "Alice");
    add("B", "Bob");
    add("C", "Charlie");
    shuffle();
    expect(participants.value).toHaveLength(3);
  });

  it("ソートで名前順になるのだ", async () => {
    const { participants, add, sort } = await loadUseParticipants();
    add("C", "Charlie");
    add("A", "Alice");
    add("B", "Bob");
    sort();
    expect(participants.value.map((p) => p.name)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("不在にできるのだ（最低2人は残す）", async () => {
    const { participants, absentParticipants, add, markAbsent } = await loadUseParticipants();
    add("A", "Alice");
    add("B", "Bob");
    add("C", "Charlie");
    const id = participants.value[0].id;
    const result = markAbsent(id);
    expect(result).toBe(true);
    expect(participants.value).toHaveLength(2);
    expect(absentParticipants.value).toHaveLength(1);
  });

  it("2人以下のとき不在にできないのだ", async () => {
    const { participants, add, markAbsent } = await loadUseParticipants();
    add("A", "Alice");
    add("B", "Bob");
    const result = markAbsent(participants.value[0].id);
    expect(result).toBe(false);
    expect(participants.value).toHaveLength(2);
  });

  it("出席に戻せるのだ", async () => {
    const { participants, absentParticipants, add, markAbsent, markPresent } =
      await loadUseParticipants();
    add("A", "Alice");
    add("B", "Bob");
    add("C", "Charlie");
    const id = participants.value[0].id;
    markAbsent(id);
    markPresent(id);
    expect(participants.value).toHaveLength(3);
    expect(absentParticipants.value).toHaveLength(0);
  });

  it("JSON エクスポート・インポートできるのだ", async () => {
    const { participants, add, exportToJSON, purge, importFromJSON } = await loadUseParticipants();
    add("ZD", "ずんだもん");
    add("TK", "つむぎ");
    const json = exportToJSON();
    purge();
    expect(participants.value).toHaveLength(0);
    importFromJSON(json);
    expect(participants.value).toHaveLength(2);
  });

  it("完了リストに移動・リセットできるのだ", async () => {
    const { participants, doneParticipants, add, moveFirstToDone, resetAll } =
      await loadUseParticipants();
    add("A", "Alice");
    add("B", "Bob");
    moveFirstToDone(45);
    expect(participants.value).toHaveLength(1);
    expect(doneParticipants.value).toHaveLength(1);
    expect(doneParticipants.value[0].time).toBe(45);
    resetAll();
    expect(participants.value).toHaveLength(2);
    expect(doneParticipants.value).toHaveLength(0);
  });
});
