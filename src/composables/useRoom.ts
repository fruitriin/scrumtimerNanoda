import { ref } from "vue";
import Peer from "peerjs";
import type { DataConnection } from "peerjs";
import { nanoid } from "nanoid";
import { useParticipants } from "./useParticipants";
import { useTimer } from "./useTimer";
import type { ConnectionStatus, RoomMessage, SyncState, TimerAction } from "../types/room";

const PEER_ID_PREFIX = "scrum-nanoda-";
const RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY = 1000;
const MAX_ID_RETRY = 3;
const MIGRATION_DELAY = 2000;
const MAX_GENERATION = 3;

/** モジュールスコープでシングルトン化 */
const roomId = ref<string | null>(null);
const isHost = ref(false);
const connectedPeers = ref(0);
const connectionStatus = ref<ConnectionStatus>("disconnected");
const errorMessage = ref<string | null>(null);

let peer: Peer | null = null;
let connections: DataConnection[] = [];
let hostConnection: DataConnection | null = null;
let reconnectAttempts = 0;
let idRetryCount = 0;

/** ホストマイグレーション用状態 */
let generation = 0;
let peerList: string[] = [];
let myPeerId: string | null = null;
let lastSyncState: SyncState | null = null;

/** 世代に対応する Peer ID を生成 */
function hostPeerId(id: string, gen: number): string {
  return gen === 0 ? PEER_ID_PREFIX + id : `${PEER_ID_PREFIX}${id}-g${gen}`;
}

/** 受信データが RoomMessage かどうかを検証する型ガード */
function isRoomMessage(data: unknown): data is RoomMessage {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.type === "string" &&
    ["sync", "action", "peer-joined", "peer-left", "timekeep"].includes(d.type)
  );
}

/**
 * WebRTC ルーム同期 composable（モジュールスコープでシングルトン化）
 *
 * スター型トポロジー: ホストが状態を管理し、ゲストは操作をホストに送信。
 * ホスト切断時はゲストの中から決定論的に新ホストを選出し、自動で引き継ぐ。
 *
 * 同期タイミング: 開始・ターン交代・全員終了・途中参加の fetch のみ。
 * currentElapsed は startedAt から各クライアントが冪等に計算する。
 */
export function useRoom() {
  const {
    participants,
    doneParticipants,
    absentParticipants,
    markAbsent,
    markPresent,
    shuffle,
    addTemporary,
    removeTemporary,
  } = useParticipants();
  const { isRunning, totalElapsed, start, stop, next, reset, getStartedAt, applyTimerState } =
    useTimer();

  /** 現在の状態をスナップショットとして取得 */
  function getStateSnapshot(): SyncState {
    return {
      participants: participants.value,
      doneParticipants: doneParticipants.value,
      absentParticipants: absentParticipants.value,
      isRunning: isRunning.value,
      startedAt: getStartedAt(),
      totalElapsed: totalElapsed.value,
    };
  }

  /** ホストから受信した状態を適用（ゲスト側） */
  function applyState(state: SyncState) {
    participants.value = state.participants;
    doneParticipants.value = state.doneParticipants;
    absentParticipants.value = state.absentParticipants;
    applyTimerState({
      isRunning: state.isRunning,
      startedAt: state.startedAt,
      totalElapsed: state.totalElapsed,
    });
  }

  /** 全接続にメッセージをブロードキャスト（ホスト） */
  function broadcast(message: RoomMessage) {
    for (const conn of connections) {
      if (conn.open) {
        void conn.send(message);
      }
    }
  }

  /** 状態をブロードキャスト（ホスト） */
  function broadcastState() {
    const currentPeerList = connections.filter((c) => c.open).map((c) => c.peer);
    broadcast({
      type: "sync",
      state: getStateSnapshot(),
      peerList: currentPeerList,
      generation,
    });
  }

  /** アクションを実行（ホスト側で実際の操作を行う） */
  function executeAction(action: TimerAction) {
    switch (action.kind) {
      case "start":
        start();
        break;
      case "stop":
        stop();
        break;
      case "next":
        next();
        break;
      case "reset":
        reset();
        break;
      case "markAbsent":
        markAbsent(action.participantId);
        break;
      case "markPresent":
        markPresent(action.participantId);
        break;
      case "shuffle":
        shuffle(isRunning.value);
        break;
      case "addParticipant":
        addTemporary(action.name);
        break;
      case "removeParticipant":
        removeTemporary(action.participantId);
        break;
    }
    broadcastState();
  }

  /** ゲストからのメッセージを処理（ホスト） */
  function handleGuestMessage(data: unknown) {
    if (!isRoomMessage(data)) {
      console.warn("不明なメッセージ形式なのだ:", data);
      return;
    }
    if (data.type === "action") {
      executeAction(data.action);
    }
  }

  /** ホストからのメッセージを処理（ゲスト） */
  function handleHostMessage(data: unknown) {
    if (!isRoomMessage(data)) {
      console.warn("不明なメッセージ形式なのだ:", data);
      return;
    }
    switch (data.type) {
      case "sync":
        applyState(data.state);
        lastSyncState = data.state;
        peerList = data.peerList;
        generation = data.generation;
        break;
      case "peer-joined":
      case "peer-left":
        connectedPeers.value = data.count;
        break;
    }
  }

  /** ホストとして新しい接続を処理 */
  function handleNewConnection(conn: DataConnection) {
    connections.push(conn);

    conn.on("open", () => {
      connectedPeers.value = connections.filter((c) => c.open).length;
      // 途中参加: 現在の全状態を送信（peerList/generation 込み）
      const currentPeerList = connections.filter((c) => c.open).map((c) => c.peer);
      void conn.send({
        type: "sync",
        state: getStateSnapshot(),
        peerList: currentPeerList,
        generation,
      } satisfies RoomMessage);
      broadcast({ type: "peer-joined", count: connectedPeers.value });
    });

    conn.on("data", (data) => {
      handleGuestMessage(data);
    });

    conn.on("close", () => {
      connections = connections.filter((c) => c !== conn);
      connectedPeers.value = connections.filter((c) => c.open).length;
      broadcast({ type: "peer-left", count: connectedPeers.value });
    });

    conn.on("error", (err) => {
      console.error("ゲスト接続エラーなのだ:", err);
      connections = connections.filter((c) => c !== conn);
      connectedPeers.value = connections.filter((c) => c.open).length;
    });
  }

  /** ホストのイベントハンドラーを登録する共通処理 */
  function setupHostPeerEvents() {
    if (!peer) return;

    peer.on("open", () => {
      connectionStatus.value = "connected";
    });

    peer.on("connection", (conn) => {
      handleNewConnection(conn);
    });

    peer.on("error", (err) => {
      console.error("PeerJS エラーなのだ:", err);
      errorMessage.value = `接続エラー: ${err.type}`;
      if (err.type === "unavailable-id" && idRetryCount < MAX_ID_RETRY) {
        idRetryCount++;
        cleanup();
        createRoom();
      }
    });

    peer.on("disconnected", () => {
      connectionStatus.value = "disconnected";
      errorMessage.value = "シグナリングサーバーから切断されたのだ";
    });
  }

  /** ルームを作成する（ホスト） */
  function createRoom(): string {
    cleanup();
    idRetryCount = 0;
    generation = 0;
    const id = nanoid(8);
    roomId.value = id;
    isHost.value = true;
    connectionStatus.value = "connecting";
    errorMessage.value = null;

    peer = new Peer(hostPeerId(id, 0));
    setupHostPeerEvents();

    return id;
  }

  /** ルームに参加する（ゲスト） */
  function joinRoom(targetRoomId: string) {
    cleanup();
    roomId.value = targetRoomId;
    isHost.value = false;
    connectionStatus.value = "connecting";
    errorMessage.value = null;
    reconnectAttempts = 0;

    peer = new Peer();

    peer.on("open", (id) => {
      myPeerId = id;
      connectToHost(targetRoomId, 0);
    });

    peer.on("error", (err) => {
      console.error("PeerJS エラーなのだ:", err);
      if (err.type === "peer-unavailable") {
        // 途中参加プローブ: 次の世代を試行
        const nextGen = (probeGeneration ?? 0) + 1;
        if (nextGen <= MAX_GENERATION) {
          connectToHost(targetRoomId, nextGen);
        } else {
          errorMessage.value = "ルームが見つからないのだ";
          connectionStatus.value = "disconnected";
        }
      } else {
        errorMessage.value = `接続エラー: ${err.type}`;
      }
    });

    peer.on("disconnected", () => {
      connectionStatus.value = "disconnected";
      attemptReconnect(targetRoomId);
    });
  }

  /** 現在プローブ中の世代（途中参加プローブ用） */
  let probeGeneration: number | null = null;

  /** ホストに接続（ゲスト） */
  function connectToHost(targetRoomId: string, gen = 0) {
    if (!peer) return;
    probeGeneration = gen;
    const targetPeerId = hostPeerId(targetRoomId, gen);
    const conn = peer.connect(targetPeerId, { reliable: true });
    hostConnection = conn;

    conn.on("open", () => {
      connectionStatus.value = "connected";
      reconnectAttempts = 0;
      probeGeneration = null;
    });

    conn.on("data", (data) => {
      handleHostMessage(data);
    });

    conn.on("close", () => {
      hostConnection = null;
      attemptHostMigration();
    });

    conn.on("error", (err) => {
      console.error("ホスト接続エラーなのだ:", err);
      errorMessage.value = `ホスト接続エラー: ${err.type}`;
    });
  }

  /** ホストマイグレーションを試行（ゲスト） */
  function attemptHostMigration() {
    if (peerList.length === 0 || generation >= MAX_GENERATION) {
      // マイグレーション不可: ローカルモードにフォールバック
      connectionStatus.value = "disconnected";
      errorMessage.value = "ホストが切断されたのだ。ローカルモードで継続するのだ。";
      return;
    }

    connectionStatus.value = "migrating";
    errorMessage.value = null;
    const newGeneration = generation + 1;

    if (peerList[0] === myPeerId) {
      // 自分が新ホスト
      becomeHost(newGeneration);
    } else {
      // 別のゲストが新ホスト → 待機してから再接続
      reconnectToNewHost(newGeneration);
    }
  }

  /** ゲストから新ホストに昇格する */
  function becomeHost(newGeneration: number) {
    // 古い peer を破棄
    if (peer) {
      peer.destroy();
      peer = null;
    }
    hostConnection = null;

    isHost.value = true;
    generation = newGeneration;
    connections = [];
    connectedPeers.value = 0;

    const id = roomId.value;
    if (!id) return;

    peer = new Peer(hostPeerId(id, newGeneration));

    peer.on("open", () => {
      connectionStatus.value = "connected";
      // 状態はローカルに保持済み（lastSyncState 経由で適用済み）
    });

    peer.on("connection", (conn) => {
      handleNewConnection(conn);
    });

    peer.on("error", (err) => {
      console.error("ホスト昇格エラーなのだ:", err);
      errorMessage.value = `ホスト昇格エラー: ${err.type}`;
      connectionStatus.value = "disconnected";
    });

    peer.on("disconnected", () => {
      connectionStatus.value = "disconnected";
      errorMessage.value = "シグナリングサーバーから切断されたのだ";
    });
  }

  /** 新ホストへの再接続を待機・試行する（ゲスト） */
  function reconnectToNewHost(newGeneration: number) {
    const id = roomId.value;
    if (!id) return;

    setTimeout(() => {
      if (connectionStatus.value !== "migrating") return;
      generation = newGeneration;
      connectToHost(id, newGeneration);
    }, MIGRATION_DELAY);
  }

  /** 再接続を試行（ゲスト） */
  function attemptReconnect(targetRoomId: string) {
    if (reconnectAttempts >= RECONNECT_ATTEMPTS) {
      errorMessage.value = "再接続に失敗したのだ。ローカルモードで継続するのだ。";
      return;
    }
    reconnectAttempts++;
    const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts - 1);
    setTimeout(() => {
      if (connectionStatus.value === "disconnected" && roomId.value) {
        connectionStatus.value = "connecting";
        connectToHost(targetRoomId, generation);
      }
    }, delay);
  }

  /** アクションを送信（ゲストはホストに送信、ホストは直接実行） */
  function sendAction(action: TimerAction) {
    if (isHost.value) {
      executeAction(action);
    } else if (hostConnection?.open) {
      void hostConnection.send({ type: "action", action } satisfies RoomMessage);
    }
  }

  /** 接続をクリーンアップ */
  function cleanup() {
    if (hostConnection) {
      hostConnection.close();
      hostConnection = null;
    }
    for (const conn of connections) {
      conn.close();
    }
    connections = [];
    if (peer) {
      peer.destroy();
      peer = null;
    }
    connectedPeers.value = 0;
    generation = 0;
    peerList = [];
    myPeerId = null;
    lastSyncState = null;
    probeGeneration = null;
  }

  /** ルームから退出 */
  function leaveRoom() {
    cleanup();
    roomId.value = null;
    isHost.value = false;
    connectionStatus.value = "disconnected";
    errorMessage.value = null;
  }

  // テスト用: ホスト切断をシミュレートするためのグローバル公開
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__useRoom_cleanup__ = cleanup;
  }

  return {
    roomId,
    isHost,
    connectedPeers,
    connectionStatus,
    errorMessage,
    createRoom,
    joinRoom,
    leaveRoom,
    sendAction,
  };
}
