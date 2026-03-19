# 進捗表: 0002-core-timer-and-participants

完了日: 2026-03-19

## タスク

### 1. データモデル・型定義の更新
- [x] types/index.ts — Participant 型（id, init, name, time）、AppSettings 型
- [x] models/Participant.ts — createParticipant ファクトリ更新

### 2. Composables 実装
- [x] useSettings — globalMaxTime, useGlobalMaxTime, localStorage 永続化, シングルトン
- [x] useParticipants — CRUD, shuffle, sort, markAbsent/Present, import/export, localStorage 永続化, シングルトン
- [x] useTimer — start/stop/next/reset, Date.now() ベース, setInterval UI 更新, シングルトン

### 3. UI コンポーネント実装
- [x] TimerView.vue — プログレスバー（色変化）、ボタン群、参加者リスト、3つの質問
- [x] ParticipantList.vue — 追加フォーム、一覧、JSON import/export、全削除
- [x] SettingsView.vue — グローバル最大時間 ON/OFF・分入力（v-model computed setter 統一）

### 4. テスト作成
- [x] useTimer.test.ts（6ケース）
- [x] useParticipants.test.ts（9ケース）
- [x] useSettings.test.ts（3ケース）

### 5. Stage 1 品質ゲート
- [x] typecheck + build + check + test 全パス（25/25テスト）

### 6. Stage 2 品質ゲート
- [x] addf-code-review-agent（Warning 4件、Suggestion 5件 → 全対応）
- [x] addf-contribution-agent（コントリビューション候補なし、分離パターン違反なし）

### 7. 完了処理
- [x] Plan 完了反映、TODO 更新、Progress アーカイブ、コミット
