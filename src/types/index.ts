/** 参加者の状態 */
export type ParticipantStatus = "waiting" | "speaking" | "done";

/** 参加者 */
export type Participant = {
  id: string;
  name: string;
  /** 割り当て時間（秒） — 0 ならグローバル設定を使用 */
  maxTime: number;
  /** 不在フラグ */
  absent: boolean;
  /** 表示順 */
  order: number;
};

/** タイマーの状態 */
export type TimerState = {
  /** 現在の参加者インデックス */
  currentIndex: number;
  /** 経過時間（秒） */
  elapsed: number;
  /** タイマー実行中フラグ */
  isRunning: boolean;
};

/** アプリケーション設定 */
export type AppSettings = {
  /** グローバル最大発言時間（秒） */
  maxTime: number;
  /** VoiceVox 有効化 */
  voicevoxEnabled: boolean;
  /** VoiceVox エンドポイント */
  voicevoxEndpoint: string;
  /** VoiceVox スピーカー ID */
  voicevoxSpeakerId: number;
};
