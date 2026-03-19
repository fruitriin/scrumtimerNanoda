# 計画: コアタイマーと参加者管理

## 動機

オリジナル ScrumTimer のコア機能を Vue 3 で再実装する。
ルーム同期（WebRTC）は後のフェーズで追加するため、まずはローカル完結で動く状態を作る。

## 設計

### Participant モデル

```typescript
type Participant = {
  id: string          // nanoid で一意識別（WebRTC 同期用にも必要）
  init: string        // イニシャル
  name: string        // 名前
  time: number        // 費やした時間（秒）
}
```

### useParticipants Composable

オリジナルの ParticipantService + TimerComponent の参加者管理部分を統合。

- `participants: Ref<Participant[]>` — 待機中リスト
- `doneParticipants: Ref<Participant[]>` — 完了リスト
- `absentParticipants: Ref<Participant[]>` — 不在リスト
- `addParticipant(init, name)` — 追加
- `removeParticipant(id)` — 削除
- `markAbsent(id)` / `markPresent(id)` — 不在切り替え
- `shuffle()` — Fisher-Yates シャッフル
- `sort()` — 名前順ソート
- `importFromJSON(json)` / `exportToJSON()` — インポート/エクスポート
- `reset()` — 完了リストを待機に戻す
- localStorage に自動永続化（`watch` + `JSON.stringify`）

### useTimer Composable

オリジナルの TimerComponent のタイマーロジックを抽出。

- `isRunning: Ref<boolean>` — タイマー稼働中
- `currentParticipant: ComputedRef<Participant | null>` — 現在の発表者
- `currentElapsed: Ref<number>` — 現在の発表者の経過時間
- `totalElapsed: Ref<number>` — セッション全体の経過時間
- `individualMaxTime: ComputedRef<number>` — 個別の持ち時間
- `currentPercent: ComputedRef<number>` — 個別進捗率
- `totalPercent: ComputedRef<number>` — 全体進捗率
- `start()` / `stop()` / `next()` / `reset()`
- タイマー実装は `setInterval` + `Date.now()` ベースの経過時間計算を併用
  - `setInterval(1000)` で UI 更新をトリガー
  - 実際の経過時間は `Date.now() - startedAt` で計算（バックグラウンドタブでのスロットリング対策）

### useSettings Composable

オリジナルの SettingsService を移植。

- `useGlobalMaxTime: Ref<boolean>` — デフォルト: true
- `globalMaxTime: Ref<number>` — デフォルト: 900（15分）
- localStorage 自動永続化

### UI コンポーネント

**TimerView.vue:**
- 現在の発表者表示（イニシャル + 名前）
- タイマー表示（MM:SS）+ プログレスバー
- 開始/停止/次へ/リセットボタン
- 完了リスト（各参加者の所要時間表示）
- 不在リスト
- 日本語の 3 つの質問表示:
  - 昨日やったこと
  - 今日やること
  - 困っていること

**ParticipantList.vue:**
- 参加者の追加フォーム（イニシャル + 名前）
- 参加者一覧（削除ボタン付き）
- JSON インポート/エクスポート

**SettingsView.vue:**
- グローバル最大時間の ON/OFF と秒数入力
- VoiceVox 設定・ルーム設定は後のフェーズで追加（useSettings に設定キーの予約枠だけ用意）

### formatTime ユーティリティ

```typescript
function formatTime(seconds: number): string {
  // 秒を MM:SS 形式に変換（オリジナルの SecsPipe 相当）
}
```

### テスト

- `src/composables/useTimer.test.ts` — start/stop/next/reset、時間計算、進捗率
- `src/composables/useParticipants.test.ts` — CRUD、シャッフル、import/export、localStorage 永続化
- `src/composables/useSettings.test.ts` — 設定の読み書き、localStorage 永続化
- `src/utils/formatTime.test.ts` — MM:SS 変換（正常系・マイナス値・ゼロ）

## 影響範囲

- `src/models/Participant.ts`
- `src/types/index.ts`（Participant 型定義）
- `src/composables/useTimer.ts`, `useParticipants.ts`, `useSettings.ts`
- `src/components/TimerView.vue`, `ParticipantList.vue`, `SettingsView.vue`
- `src/utils/formatTime.ts`

## 実装状況: 完了 (2026-03-19)

### 実装内容
- Participant 型（id, init, name, time）と AppSettings 型（useGlobalMaxTime, globalMaxTime）
- useParticipants: CRUD、Fisher-Yates シャッフル、ソート、不在管理（最低2人制限）、JSON import/export、localStorage 永続化
- useTimer: Date.now() ベース経過時間、setInterval UI 更新、start/stop/next/reset
- useSettings: globalMaxTime、useGlobalMaxTime、localStorage 永続化
- TimerView: プログレスバー（色変化付き）、ボタン群、参加者リスト（待機/完了/不在）、3つの質問
- ParticipantList: 追加フォーム、一覧、JSON export/import、全削除
- SettingsView: グローバル最大時間 ON/OFF・分入力（computed setter 統一）
- テスト: useSettings 3件 + useParticipants 9件 + useTimer 6件 + formatTime 7件 = 25件全パス

### レビュー対応
- Warning: useTimer シングルトン化、stop()/next() の責務コメント追加、onUnmounted 削除、loadParticipants 型検証追加
- Suggestion: handleExport エラーハンドリング、SettingsView の v-model 統一、冗長 :class 除去、マジックナンバー定数化
