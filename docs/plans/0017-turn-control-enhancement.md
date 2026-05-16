# 計画: 0017 — ターン交代制御の強化とロジック調整

## 動機

スクラム運用中に発生する以下のニーズに応える:

1. **発表順を巻き戻したい** — 早送り（次へ）はあるが、間違って次へを押した、あるいは前の発表者に補足を求めたいケースで戻せない
2. **発表時間を即興で調整したい** — 「あと30秒だけ延長したい」「もう少し短くしたい」のような微調整ができない
3. **「ストップ」と「リセット」の意味が曖昧** — 「ストップ」は実質「最後の参加者をスキップして集計」、「リセット」は全クリア。タイマーを一時的に止めて続きから再開する機能がない

### 既存実装の制約

- `useTimer.stop()` は「現在の発表者を完了に移動 + タイマー終了」という複合操作で、純粋な一時停止ではない
- `individualMaxTime` は `globalMaxTime / 残り人数` で computed なので、個別調整は `startedAt` シフトで対応する必要がある
- `TimerView.vue` のボタン操作はすべて `useRoom().sendAction()` 経由でルーム同期されているため、追加アクションも同じルートに乗せる必要がある

---

## 設計

### 1. 前の発表者に戻る (prev)

**仕様**: 動作中・一時停止中・停止中いずれでも実行可能。`doneParticipants` が空のときは無効化。

**動作（要件確認済み: 現発表者を done に保留 → 前を再開）**:

```
状態:
  done       = [A, B, C]
  current    = D (発表中, currentElapsed=15s)
  waiting    = [E, F]

prev() 実行後:
  done       = [A, B]
  current    = C (再開, currentElapsed=0, startedAt=now)
  waiting    = [D, E, F]    // D が次へ復帰 (D.time は保留)
  totalElapsed -= (Cの時間 + Dの15s)  // Cの記録時間をロールバック、Dの未確定時間も控除
```

**実装**:

```ts
function prev() {
  if (doneParticipants.value.length === 0) return;

  // 動作中・一時停止中: 現発表者を done の末尾ではなく participants の先頭直後に保留
  //   - 「次へ」を押すと再度 D が回ってくる順序にする
  // 停止中: 現発表者は存在しない（既に done に入っている）

  if (isRunning.value || isPaused.value) {
    // 現発表者の経過分を totalElapsed から戻す
    totalElapsed.value = Math.max(0, totalElapsed.value); // 元々加算前なので何もしない
    // 前の発表者を取り出す
    const prevPerson = doneParticipants.value.pop()!;
    totalElapsed.value = Math.max(0, totalElapsed.value - prevPerson.time);
    // 現発表者を participants の 2 番目に挿入（前の人を先頭にしたいので）
    const current = participants.value.shift()!;
    participants.value.unshift(prevPerson, current);
  } else {
    // 停止中: 単純に done の最後を participants の先頭に戻す
    const prevPerson = doneParticipants.value.pop()!;
    totalElapsed.value = Math.max(0, totalElapsed.value - prevPerson.time);
    participants.value.unshift(prevPerson);
  }

  // タイマーを 0 から再カウント開始
  if (isRunning.value) {
    startedAt = Date.now();
    currentElapsed.value = 0;
    resetAudioFlags();
  }
}
```

**注意**: 「totalElapsed に現発表者の経過分は未加算」が現行仕様（`stop()` / `next()` で初めて加算される）なので、現発表者の経過分を戻す処理は不要。前の発表者の time のみ控除する。

---

### 2. 残り時間の調整 (adjustTime)

**仕様**: ±30秒 / ±1分 の4ボタン。動作中・一時停止中のみ有効。

**実装**: `startedAt` をシフトすることで `currentElapsed = (Date.now() - startedAt) / 1000` の結果を相対的に変化させる。

```ts
function adjustTime(deltaSeconds: number) {
  if (!isRunning.value && !isPaused.value) return;
  if (startedAt === null && pausedElapsed === null) return;

  // 残り時間を「増やす」=「経過秒を減らす」= startedAt を未来にずらす
  // delta>0 で残り増、delta<0 で残り減
  const shift = deltaSeconds * 1000;

  if (isPaused.value) {
    pausedElapsed = Math.max(0, pausedElapsed! - deltaSeconds);
    currentElapsed.value = pausedElapsed;
  } else {
    startedAt = startedAt! + shift;
    // 即座に再計算（次の tick を待たない）
    currentElapsed.value = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  }

  // 時間を増やした場合、超過アラートを再発火可能にする
  if (deltaSeconds > 0) resetAudioFlags();
}
```

**音声フラグの扱い**:
- 残り時間を増やしたとき: `wrapUpPlayed` / `timeupPlayed` / `overtime10Played` / `overtime30Played` を**残り時間に応じて再評価**する。シンプルに「+の場合は全部 false に戻す」で良い（既に再生済みなら次の閾値到達で再発火）
- 残り時間を減らしたとき: フラグはそのまま。閾値を一気に飛び越えたら…までは厳密に対応しない（シンプル優先）

---

### 3. 一時停止 / 再開 (pause / resume)

**仕様**: 動作中に「一時停止」→ ボタンが「再開」に変わる。`currentElapsed` と `totalElapsed` は保持。

**新状態フラグ**: `isPaused: Ref<boolean>` を追加。`isRunning` と排他。
- `isRunning=true, isPaused=false`: 動作中
- `isRunning=false, isPaused=true`: 一時停止中（現発表者保持）
- `isRunning=false, isPaused=false`: 停止中（待機 or 完走）

**実装**:

```ts
const isPaused = ref(false);
let pausedElapsed: number | null = null;

function pause() {
  if (!isRunning.value) return;
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  pausedElapsed = currentElapsed.value; // 経過秒を保存
  startedAt = null;
  isRunning.value = false;
  isPaused.value = true;
  // 音声フラグは保持（同じ発表者なので二重再生防止）
}

function resume() {
  if (!isPaused.value) return;
  if (pausedElapsed === null) return;
  startedAt = Date.now() - pausedElapsed * 1000;
  currentElapsed.value = pausedElapsed;
  pausedElapsed = null;
  isRunning.value = true;
  isPaused.value = false;
  intervalId = setInterval(tick, 1000);
}
```

**applyTimerState の拡張**: ルーム同期で一時停止状態を伝えるため、`SyncState` に `isPaused: boolean` と `pausedElapsed: number | null` を追加。

---

### 4. 会の終了 (end)

**仕様**:
- 既存の「リセット」ボタンを「会の終了」に改称
- クリック時に確認ダイアログを出す（「会を終了するのだ？参加者の発表履歴はクリアされるのだ」）
- OK → 既存 `reset()` 相当（全リセット）

**注意**:
- 既存の「ストップ」ボタンは廃止する（要件: 2つに整理）
- 動作中に「会の終了」を押した場合も、確認後にリセットする

**確認ダイアログの実装**: `<dialog>` 要素 or 既存パターン（プロジェクト内に確認ダイアログコンポーネントがあれば再利用）。なければ `window.confirm()` でも MVP として可。

→ **アクセシビリティ向上のため、HTML `<dialog>` ベースで自前コンポーネント `ConfirmDialog.vue` を新規作成する**（プロジェクトの 0012 アクセシビリティ計画と整合）。

---

### 5. UI レイアウト

**ボタン構成（動作中）**:
```
[⏭ 次へ]  [⏸ 一時停止]  [⏮ 前へ]  [-1分][-30秒][+30秒][+1分]  [🔀 シャッフル]  [🏁 会の終了]
```

**ボタン構成（一時停止中）**:
```
[▶ 再開]  [⏭ 次へ]  [⏮ 前へ]  [-1分][-30秒][+30秒][+1分]  [🔀 シャッフル]  [🏁 会の終了]
```

**ボタン構成（停止中・待機中）**:
```
[▶ スタート]  [⏮ 前へ]  [🔀 シャッフル]  [🏁 会の終了]
```

時間調整ボタン群は別の `<div>` で論理グループ化し、視覚的にまとめる。

---

### 6. ルーム同期（TimerAction 拡張）

```ts
export type TimerAction =
  | { kind: "start" }
  | { kind: "stop" }      // 内部で使用継続（既存テスト互換性）
  | { kind: "next" }
  | { kind: "prev" }                                  // ★新規
  | { kind: "pause" }                                 // ★新規
  | { kind: "resume" }                                // ★新規
  | { kind: "adjustTime"; deltaSeconds: number }      // ★新規
  | { kind: "end" }                                   // ★新規 (旧 reset と同義)
  | { kind: "reset" }                                 // 内部で使用継続
  | { kind: "markAbsent"; participantId: string }
  | { kind: "markPresent"; participantId: string }
  | { kind: "shuffle" }
  | { kind: "addParticipant"; name: string }
  | { kind: "removeParticipant"; participantId: string };
```

**SyncState 拡張**:
```ts
export type SyncState = {
  participants: Participant[];
  doneParticipants: Participant[];
  absentParticipants: Participant[];
  isRunning: boolean;
  isPaused: boolean;           // ★追加
  startedAt: number | null;
  pausedElapsed: number | null; // ★追加
  totalElapsed: number;
};
```

`useRoom.executeAction()` に prev / pause / resume / adjustTime / end のディスパッチを追加。`broadcastState()` で isPaused/pausedElapsed を含める。`applyTimerState()` で受信した一時停止状態を反映。

---

## チェックリスト

### Phase 1: タイマーロジック拡張

- [ ] 1.1 `src/composables/useTimer.ts` — `isPaused`, `pausedElapsed` を追加。`pause()`, `resume()`, `prev()`, `adjustTime()`, `end()` を実装
- [ ] 1.2 `src/composables/useTimer.ts` — `applyTimerState()` を isPaused/pausedElapsed 対応に拡張
- [ ] 1.3 `src/composables/useTimer.ts` — `resetAudioFlags()` をプライベートヘルパーに切り出し（重複コード削減）
- [ ] 1.4 `src/composables/useTimer.test.ts` — pause / resume / prev / adjustTime のユニットテスト追加

### Phase 2: 型・ルーム同期

- [ ] 2.1 `src/types/room.ts` — `TimerAction` に prev / pause / resume / adjustTime / end を追加。`SyncState` に isPaused / pausedElapsed を追加
- [ ] 2.2 `src/composables/useRoom.ts` — `executeAction()` に新規 5 種のディスパッチ追加
- [ ] 2.3 `src/composables/useRoom.ts` — `broadcastState()` に isPaused / pausedElapsed を含める
- [ ] 2.4 `src/composables/useRoom.test.ts` — sync メッセージに新フィールドが含まれることを検証

### Phase 3: UI

- [ ] 3.1 `src/components/ConfirmDialog.vue` — 新規。HTML `<dialog>` ベースの確認ダイアログ（タイトル・本文・OK/キャンセル）
- [ ] 3.2 `src/components/ConfirmDialog.test.ts` — ダイアログのレンダリング・イベントテスト
- [ ] 3.3 `src/components/TimerView.vue` — 既存「ストップ」ボタン削除、「リセット」を「会の終了」に改称し ConfirmDialog を組み込む
- [ ] 3.4 `src/components/TimerView.vue` — 「一時停止/再開」ボタン追加（isRunning/isPaused で表示切替）
- [ ] 3.5 `src/components/TimerView.vue` — 「前へ戻る」ボタン追加（doneParticipants.length === 0 で disabled）
- [ ] 3.6 `src/components/TimerView.vue` — 時間調整ボタン群（-1m/-30s/+30s/+1m）追加。`isRunning || isPaused` のとき有効
- [ ] 3.7 `src/components/TimerView.vue` — ハンドラ関数追加（handlePause, handleResume, handlePrev, handleAdjustTime, handleEnd）。ルームモード時は sendAction 経由

### Phase 4: E2E テスト

- [ ] 4.1 `e2e/timer-controls.spec.ts` — 新規。スタンドアロンモードで以下を検証:
  - 前へ戻る: 2人発表後に prev で 2人目に戻る → 元の done が空に近づく
  - 時間調整: +30秒で残り時間表示が増加、-1分で減少
  - 一時停止/再開: pause で経過時間が固定、resume で続きから増加
  - 会の終了: 確認ダイアログでキャンセル → 状態保持。OK → 全リセット
- [ ] 4.2 `e2e/room-sync.spec.ts` — 既存テストに pause / prev / adjustTime / end の同期シナリオを追加

### Phase 5: 検証

- [ ] 5.1 `vp build` — 型チェック + ビルド通過
- [ ] 5.2 `vp check src/` — Lint / format 通過
- [ ] 5.3 `vp test run` — ユニットテスト全通過
- [ ] 5.4 `pnpm run test:e2e` — E2E テスト全通過
- [ ] 5.5 Playwright MCP で手動動作確認（スタンドアロン + ルームモード 2タブ）

---

## 対象ファイル

| ファイル | 変更種別 |
|---|---|
| `src/composables/useTimer.ts` | 拡張: isPaused / pausedElapsed / pause / resume / prev / adjustTime / end / resetAudioFlags |
| `src/composables/useTimer.test.ts` | 拡張: 新規 API のテスト追加 |
| `src/composables/useRoom.ts` | 拡張: 新規 TimerAction のディスパッチ |
| `src/composables/useRoom.test.ts` | 拡張: sync メッセージ検証 |
| `src/types/room.ts` | 拡張: TimerAction / SyncState 拡張 |
| `src/components/TimerView.vue` | UI 改修: ボタン構成変更、確認ダイアログ統合 |
| `src/components/ConfirmDialog.vue` | 新規: 確認ダイアログコンポーネント |
| `src/components/ConfirmDialog.test.ts` | 新規: ダイアログユニットテスト |
| `e2e/timer-controls.spec.ts` | 新規: 新機能の E2E |
| `e2e/room-sync.spec.ts` | 拡張: 新アクションの同期検証 |

---

## 注意事項

- **既存テストの後方互換性**: `TimerAction` の `stop` / `reset` は内部実装で残す（テストファイルが参照している可能性）。UI からの直接呼び出しは廃止
- **音声フラグの再評価**: `adjustTime` で残り時間を増やしたら、既に再生済みのアラートを再発火可能にする（シンプル優先で全 false 戻し）
- **prev の境界**: `doneParticipants.length === 0` のときボタン disabled。動作中も含めて押せるようにする（要件確認済み）
- **アクセシビリティ**: 確認ダイアログは `<dialog>` ベースで native focus trap を活用、ESC でキャンセル、`role="dialog" aria-modal="true"` を付与
- **ルーム同期のレース条件**: 一時停止状態は startedAt とは独立した「経過秒」で同期する必要がある。pausedElapsed フィールドを SyncState に明示的に持たせる
- **タイマー超過中の prev**: 超過時間で動作している人を done に戻すと負の totalElapsed が発生しうる → `Math.max(0, ...)` でクランプ
