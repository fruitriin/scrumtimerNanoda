import type { Participant } from "./index";

/** ホスト → ゲスト: 同期する状態 */
export type SyncState = {
  participants: Participant[];
  doneParticipants: Participant[];
  absentParticipants: Participant[];
  isRunning: boolean;
  currentElapsed: number;
  totalElapsed: number;
};

/** ゲスト → ホスト: 操作リクエスト */
export type TimerAction =
  | { kind: "start" }
  | { kind: "stop" }
  | { kind: "next" }
  | { kind: "reset" }
  | { kind: "markAbsent"; participantId: string }
  | { kind: "markPresent"; participantId: string }
  | { kind: "shuffle" };

/** タイムキープ通知（0004 VoiceVox で使用予定） */
export type TimekeepEvent =
  | { kind: "remaining"; seconds: number }
  | { kind: "timeup" }
  | { kind: "nextPerson"; name: string }
  | { kind: "allDone" };

/** ルーム内メッセージ */
export type RoomMessage =
  | { type: "sync"; state: SyncState }
  | { type: "action"; action: TimerAction }
  | { type: "peer-joined"; count: number }
  | { type: "peer-left"; count: number }
  | { type: "timekeep"; event: TimekeepEvent };

/** 接続状態 */
export type ConnectionStatus = "disconnected" | "connecting" | "connected";
