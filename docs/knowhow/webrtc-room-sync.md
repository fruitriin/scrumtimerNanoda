# WebRTC ルーム同期 — 冪等な状態同期設計

## 発見した知見

### 毎秒の state broadcast は非効率

当初はホスト側で `watch` により `currentElapsed` の変化を検知して毎秒全状態を broadcast していた。
これには以下の問題がある:

- 参加者配列を含む全状態を毎秒 JSON シリアライズ → DataChannel 送信は帯域の無駄
- ゲスト側で `applyState` が毎秒呼ばれ、タイマー内部状態（`startedAt`, `intervalId`）と不整合が生じる
- watch の発火タイミングに依存するため、状態の一貫性が保証されない

### startedAt 共有による冪等設計

`currentElapsed` を同期する代わりに `startedAt`（タイマー開始時刻）を共有し、
各クライアントが `Date.now() - startedAt` で冪等に経過時間を計算する。

```typescript
// SyncState に startedAt を含める（currentElapsed は不要）
type SyncState = {
  participants: Participant[];
  doneParticipants: Participant[];
  absentParticipants: Participant[];
  isRunning: boolean;
  startedAt: number | null;  // ← currentElapsed の代わり
  totalElapsed: number;
};
```

### 同期タイミングは4つだけ

| イベント | 説明 |
|---|---|
| 開始 | `start()` → `startedAt` をセット |
| ターン交代 | `next()` → 参加者リスト変更 + `startedAt` リセット |
| 全員終了 | `stop()` → `isRunning: false` |
| 途中参加 | `conn.on("open")` → 現在の全状態を fetch |

watch による自動 broadcast は不要。`executeAction` 後の明示的 `broadcastState()` のみ。

### ゲスト側の tick 自立

ゲストは sync 受信時に `applyTimerState()` で `startedAt` を受け取り、
自前の `setInterval` で `tick()` を開始する。音声通知もゲスト側で独立に動作する。

### localStorage にはマスターデータのみ永続化

タイマーセッションの進行状態（完了・不在リスト）は一時的なもので、永続化すべきではない。
localStorage には参加者のマスターリスト（原本）のみ保存する。
リセット時はマスターからコピーを再作成する。

## プロジェクトへの適用

- `src/composables/useRoom.ts` — watch 廃止、明示的 broadcastState のみ
- `src/composables/useTimer.ts` — `getStartedAt()`, `applyTimerState()` を公開
- `src/composables/useParticipants.ts` — `masterParticipants` と セッション用コピーを分離

## 注意点・制約

- `startedAt` は `Date.now()` ベースなので、ホストとゲストの時計がずれていると経過時間に差が出る（通常のPC同士なら誤差は数秒以内で実用上問題なし）
- ゲスト側で `resetAll()` が走るとマスター（ゲストのローカル）から再コピーされるため、ルーム同期中のゲストでは `syncFromMaster` の呼び出しに注意

## 参照

- `src/composables/useRoom.ts`
- `src/composables/useTimer.ts`
- `src/composables/useParticipants.ts`
- `src/types/room.ts` — SyncState 型定義
