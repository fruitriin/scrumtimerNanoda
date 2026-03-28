import { describe, it, expect, beforeEach, vi } from "vitest";
import type { RoomMessage, TimerAction } from "../types/room";

// PeerJS をモック化（コンストラクタとして使うため function で定義）
const mockPeerOn = vi.fn();
const mockPeerDestroy = vi.fn();
const mockConnSend = vi.fn();
const mockConnOn = vi.fn();
const mockConnClose = vi.fn();
const mockPeerConnect = vi.fn(() => ({
  on: mockConnOn,
  send: mockConnSend,
  close: mockConnClose,
  open: true,
}));

vi.mock("peerjs", () => ({
  default: vi.fn(function (this: Record<string, unknown>) {
    this.on = mockPeerOn;
    this.destroy = mockPeerDestroy;
    this.connect = mockPeerConnect;
  }),
}));

describe("useRoom", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function loadUseRoom() {
    const mod = await import("./useRoom");
    return mod.useRoom();
  }

  it("初期状態は未接続なのだ", async () => {
    const { roomId, isHost, connectionStatus, connectedPeers } = await loadUseRoom();
    expect(roomId.value).toBeNull();
    expect(isHost.value).toBe(false);
    expect(connectionStatus.value).toBe("disconnected");
    expect(connectedPeers.value).toBe(0);
  });

  it("ルーム作成で roomId が生成されるのだ", async () => {
    const { createRoom, roomId, isHost } = await loadUseRoom();
    const id = createRoom();
    expect(id).toHaveLength(8);
    expect(roomId.value).toBe(id);
    expect(isHost.value).toBe(true);
  });

  it("ルーム参加で roomId が設定されるのだ", async () => {
    const { joinRoom, roomId, isHost } = await loadUseRoom();
    joinRoom("test1234");
    expect(roomId.value).toBe("test1234");
    expect(isHost.value).toBe(false);
  });

  it("leaveRoom でクリーンアップされるのだ", async () => {
    const { createRoom, leaveRoom, roomId, isHost, connectionStatus } = await loadUseRoom();
    createRoom();
    leaveRoom();
    expect(roomId.value).toBeNull();
    expect(isHost.value).toBe(false);
    expect(connectionStatus.value).toBe("disconnected");
    expect(mockPeerDestroy).toHaveBeenCalled();
  });

  it("sendAction はホストでもゲストでも呼べるのだ", async () => {
    const { sendAction } = await loadUseRoom();
    const action: TimerAction = { kind: "start" };
    expect(() => sendAction(action)).not.toThrow();
  });

  it("RoomMessage 型が正しく定義されているのだ", () => {
    const syncMsg: RoomMessage = {
      type: "sync",
      state: {
        participants: [],
        doneParticipants: [],
        absentParticipants: [],
        isRunning: false,
        startedAt: null,
        totalElapsed: 0,
      },
      peerList: [],
      generation: 0,
    };
    expect(syncMsg.type).toBe("sync");

    const actionMsg: RoomMessage = {
      type: "action",
      action: { kind: "next" },
    };
    expect(actionMsg.type).toBe("action");
  });
});
