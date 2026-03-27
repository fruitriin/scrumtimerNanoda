# 計画: 0009 — ルーム同期バグ修正 & Playwright E2E テスト

## 動機

ルーム同期（チームモード）でホスト・ゲスト間の状態同期が正しく動作していない。
原因調査により **TimerView.vue がルーム同期層を完全にバイパスしている** ことが判明した。

### 発見されたバグ

**[Critical] TimerView.vue が `sendAction()` を使っていない**
- すべてのボタン（スタート、ストップ、次へ、リセット、シャッフル、不在、出席）が `useTimer()` / `useParticipants()` を直接呼び出し
- `useRoom().sendAction()` を経由しないため:
  - ゲストのクリック → ローカルのみ実行、ホストに届かない
  - ホストのクリック → ローカル実行のみ、`broadcastState()` が呼ばれずゲストに同期されない

**[High] `shuffle()` に `keepFirst` パラメータが渡されていない**
- `useRoom.ts:119` で `shuffle()` が引数なしで呼ばれている
- タイマー動作中に現在の発表者がシャッフルで入れ替わる可能性がある

### 目標

1. ルーム同期バグを修正する
2. Playwright E2E テストで同期動作を検証・回帰防止する
3. Playwright MCP を使って未知のバグも調査する

---

## 設計

### バグ修正方針

**TimerView.vue**: `useRoom()` をインポートし、`roomId` が存在するときは全アクションを `sendAction()` 経由にする。

```typescript
const { roomId, sendAction } = useRoom();

function handleStart() {
  if (roomId.value) sendAction({ kind: 'start' });
  else start();
}
// stop, next, reset, shuffle, markAbsent, markPresent も同パターン
```

テンプレートの `@click="start"` → `@click="handleStart"` に変更。

**useRoom.ts**: `executeAction` 内の `shuffle()` → `shuffle(isRunning.value)` に修正。

### Playwright テスト設計

**方針:**
- テストは `e2e/` ディレクトリに配置
- 2つのブラウザコンテキスト（ホスト / ゲスト）で同期を検証
- PeerJS は実際の WebRTC 接続を使用（モック不要）
- Playwright MCP でインタラクティブ調査も併用可

**テストヘルパー（`e2e/helpers.ts`）:**
- `setupParticipants(page, names[])` — 参加者ページで名前を追加
- `createRoom(page)` — ルーム作成、roomId を返す
- `joinRoom(page, roomId)` — ルーム URL に遷移
- `waitForConnection(page)` — 「接続済み」テキストを待機

**テストシナリオ（`e2e/room-sync.spec.ts`）:**

| # | シナリオ | 検証内容 |
|---|---|---|
| 1 | ルーム作成・参加 | 接続状態、ホスト/ゲスト表示、人数 |
| 2 | ホスト操作 → ゲスト同期 | start/next/stop がゲストに反映 |
| 3 | ゲスト操作 → ホスト同期 | start/next/stop がホストに反映 |
| 4 | シャッフル同期 | 順番が一致、動作中は先頭固定 |
| 5 | 不在/出席同期 | markAbsent/markPresent が両側に反映 |
| 6 | 途中参加 | タイマー進行中にゲスト参加、状態が正しい |
| 7 | リセット同期 | リセットが両側に反映 |

**基本テスト（`e2e/room-basic.spec.ts`）:**
- ルーム作成で URL が生成される
- 退出でホームに戻る
- 無効なルーム ID でエラー表示

---

## 実装ステップ

### Phase 1: バグ修正

- [ ] 1.1 `src/components/TimerView.vue` — `useRoom()` をインポート、7つのアクション（start, stop, next, reset, shuffle, markAbsent, markPresent）にラッパー関数を作成。`roomId.value` の有無で `sendAction` / 直接呼び出しを分岐
- [ ] 1.2 `src/composables/useRoom.ts` — `executeAction` 内の `shuffle()` を `shuffle(isRunning.value)` に修正

### Phase 2: Playwright インフラ

- [ ] 2.1 `@playwright/test` を devDependencies に追加、`test:e2e` スクリプト追加
- [ ] 2.2 `playwright.config.ts` を作成（baseURL: `http://localhost:5173/scrumtimerNanoda/`、webServer: `pnpm run dev`、Chromium のみ）
- [ ] 2.3 `e2e/helpers.ts` — 共通ユーティリティ

### Phase 3: E2E テスト作成

- [ ] 3.1 `e2e/room-sync.spec.ts` — 7つの同期シナリオ
- [ ] 3.2 `e2e/room-basic.spec.ts` — ルーム基本動作テスト

### Phase 4: 検証

- [ ] 4.1 `vp build && vp check src/ && vp test run` — 既存テスト通過確認
- [ ] 4.2 `pnpm run test:e2e` — E2E テスト通過確認
- [ ] 4.3 Playwright MCP で手動確認（2タブで同期動作を目視）

---

## 対象ファイル

| ファイル | 変更種別 |
|---|---|
| `src/components/TimerView.vue` | バグ修正: sendAction 経由に変更 |
| `src/composables/useRoom.ts` | バグ修正: shuffle に keepFirst 追加 |
| `package.json` | @playwright/test 追加、スクリプト追加 |
| `playwright.config.ts` | 新規: Playwright 設定 |
| `e2e/helpers.ts` | 新規: テストヘルパー |
| `e2e/room-sync.spec.ts` | 新規: 同期テスト 7シナリオ |
| `e2e/room-basic.spec.ts` | 新規: ルーム基本テスト |

## 注意事項

- **base パス**: `vite.config.ts` で `/scrumtimerNanoda/` が設定されているため Playwright の baseURL も合わせる
- **ハッシュルーティング**: URL は `/#/room/{id}` 形式
- **WebRTC 接続時間**: 接続確立に数秒かかるため、明示的な待機（`waitFor`）を使用し固定 sleep は避ける
- **状態分離**: テストごとに新しいブラウザコンテキストを使い localStorage / PeerJS 状態を分離する
