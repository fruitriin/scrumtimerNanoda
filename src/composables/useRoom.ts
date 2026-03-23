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
 *
 * 同期タイミング: 開始・ターン交代・全員終了・途中参加の fetch のみ。
 * currentElapsed は startedAt から各クライアントが冪等に計算する。
 */
export function useRoom() {
  const { participants, doneParticipants, absentParticipants, markAbsent, markPresent, shuffle } =
    useParticipants();
  const {
    isRunning,
    totalElapsed,
    start,
    stop,
    next,
    reset,
    getStartedAt,
    applyTimerState,
  } = useTimer();

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
    broadcast({ type: "sync", state: getStateSnapshot() });
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
        shuffle();
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
      // 途中参加: 現在の全状態を送信
      void conn.send({ type: "sync", state: getStateSnapshot() } satisfies RoomMessage);
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

  /** ルームを作成する（ホスト） */
  function createRoom(): string {
    cleanup();
    idRetryCount = 0;
    const id = nanoid(8);
    roomId.value = id;
    isHost.value = true;
    connectionStatus.value = "connecting";
    errorMessage.value = null;

    peer = new Peer(PEER_ID_PREFIX + id);

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

    peer.on("open", () => {
      connectToHost(targetRoomId);
    });

    peer.on("error", (err) => {
      console.error("PeerJS エラーなのだ:", err);
      errorMessage.value = `接続エラー: ${err.type}`;
      if (err.type === "peer-unavailable") {
        errorMessage.value = "ルームが見つからないのだ";
        connectionStatus.value = "disconnected";
      }
    });

    peer.on("disconnected", () => {
      connectionStatus.value = "disconnected";
      attemptReconnect(targetRoomId);
    });
  }

  /** ホストに接続（ゲスト） */
  function connectToHost(targetRoomId: string) {
    if (!peer) return;
    const conn = peer.connect(PEER_ID_PREFIX + targetRoomId, { reliable: true });
    hostConnection = conn;

    conn.on("open", () => {
      connectionStatus.value = "connected";
      reconnectAttempts = 0;
    });

    conn.on("data", (data) => {
      handleHostMessage(data);
    });

    conn.on("close", () => {
      connectionStatus.value = "disconnected";
      hostConnection = null;
      errorMessage.value = "ホストが切断されたのだ。ローカルモードで継続するのだ。";
    });

    conn.on("error", (err) => {
      console.error("ホスト接続エラーなのだ:", err);
      errorMessage.value = `ホスト接続エラー: ${err.type}`;
    });
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
        connectToHost(targetRoomId);
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
  }

  /** ルームから退出 */
  function leaveRoom() {
    cleanup();
    roomId.value = null;
    isHost.value = false;
    connectionStatus.value = "disconnected";
    errorMessage.value = null;
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
