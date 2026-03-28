/** 参加者 */
export type Participant = {
  id: string;
  /** 名前 */
  name: string;
  /** 費やした時間（秒） */
  time: number;
};

/** デイリースクラムメモ */
export type DailyMemo = {
  /** 公開メモ（Markdown） */
  publicContent: string;
  /** 秘匿メモ（Markdown）— WebRTC で送信しない */
  privateContent: string;
  /** 最終更新タイムスタンプ */
  updatedAt: number;
};

/** WebRTC で送信する公開メモペイロード */
export type PublicMemoPayload = {
  participantId: string;
  participantName: string;
  content: string;
  updatedAt: number;
};

/** アプリケーション設定 */
export type AppSettings = {
  /** グローバル最大時間を使用するか */
  useGlobalMaxTime: boolean;
  /** グローバル最大発言時間（秒） */
  globalMaxTime: number;
  /** 音量 (0.0 〜 1.0) */
  volume: number;
  /** ミュート状態 */
  muted: boolean;
  /** 警告音声の個別有効/無効 */
  alerts: {
    wrapUp: boolean;
    timeup: boolean;
    overtime10: boolean;
    overtime30: boolean;
  };
};
