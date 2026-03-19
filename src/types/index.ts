/** 参加者 */
export type Participant = {
  id: string;
  /** 名前 */
  name: string;
  /** 費やした時間（秒） */
  time: number;
};

/** アプリケーション設定 */
export type AppSettings = {
  /** グローバル最大時間を使用するか */
  useGlobalMaxTime: boolean;
  /** グローバル最大発言時間（秒） */
  globalMaxTime: number;
};
