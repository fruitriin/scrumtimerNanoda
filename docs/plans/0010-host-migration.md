# 計画: 0010 — ホストマイグレーション（ホスト切断時の自動引き継ぎ）

## コンテキスト

ルームモードで 3人以上が接続中にホストがブラウザを閉じると、全ゲストが「ローカルモードで継続」にフォールバックし、同期が完全に途切れる。スクラムの途中でホストが離脱しても、残りのメンバーで同期を継続できるようにしたい。

## 設計

### 方針: 決定論的リーダー継承

分散合意アルゴリズムは不要。ホストがゲストの Peer ID リストをブロードキャストし、ホスト切断時に全ゲストが同じルールで次のホストを決定する。

```
ホスト切断検知（conn.close）
  ↓
各ゲストが peerList を保持済み
  ↓
peerList[0] が自分 → 新ホストに昇格
peerList[0] が自分でない → 新ホストへ再接続
  ↓
新ホスト: scrum-nanoda-{roomId}-g{generation} で Peer 登録
他ゲスト: 2秒待機後、新ホストの Peer ID に接続
  ↓
新ホストがローカルの状態をブロードキャスト → 同期再開
```

### Peer ID スキーム

| 世代 | Peer ID |
|---|---|
| 0（初代ホスト） | `scrum-nanoda-{roomId}` |
| 1（1回目の移行） | `scrum-nanoda-{roomId}-g1` |
| 2（2回目の移行） | `scrum-nanoda-{roomId}-g2` |
| N（上限 MAX_GENERATION=3） | `scrum-nanoda-{roomId}-g3` |

上限を超えたらローカルモードにフォールバック（現行動作と同じ）。

### 途中参加者（Late Joiner）の対応

URL `/#/room/{roomId}` から参加する人は現在の世代を知らない。接続時に世代 0 → 1 → 2 → 3 と順にプローブし、`peer-unavailable` エラーで次の世代を試行する。

### UI 遷移

```
接続済み（緑） → ホスト移行中...（オレンジ pulse） → 接続済み（緑）
                                                    → 移行失敗 → ローカルモード
```

---

## 実装ステップ

### Phase 1: 型定義の拡張

- [ ] 1.1 `src/types/room.ts` — `ConnectionStatus` に `"migrating"` を追加
- [ ] 1.2 `src/types/room.ts` — `RoomMessage` の `sync` バリアントに `peerList: string[]` と `generation: number` を追加

### Phase 2: useRoom.ts のホストマイグレーション実装

- [ ] 2.1 モジュールスコープに新しい状態を追加
  - `generation: number = 0`
  - `peerList: string[] = []`（ゲスト側で保持）
  - `myPeerId: string | null = null`
  - `lastSyncState: SyncState | null = null`
  - 定数: `MIGRATION_DELAY = 2000`, `MAX_GENERATION = 3`

- [ ] 2.2 `broadcastState()` を拡張 — `peerList`（connections から peer ID を抽出、join 順）と `generation` を含める

- [ ] 2.3 `handleHostMessage()` を拡張 — sync メッセージから `peerList`, `generation`, 状態スナップショットを保存

- [ ] 2.4 `joinRoom()` を拡張 — `peer.on("open")` で `myPeerId` を記録

- [ ] 2.5 `connectToHost()` のホスト切断ハンドラを変更 — `conn.on("close")` で即ローカルモードにせず `attemptHostMigration()` を呼ぶ

- [ ] 2.6 新関数 `attemptHostMigration()`:
  ```
  if peerList が空 or generation >= MAX_GENERATION → ローカルモードにフォールバック
  if peerList[0] === myPeerId → becomeHost(generation + 1)
  else → reconnectToNewHost(generation + 1)
  ```

- [ ] 2.7 新関数 `becomeHost(newGeneration)`:
  - 古い peer を destroy
  - `isHost = true`, `generation = newGeneration`
  - 新しい Peer を `scrum-nanoda-{roomId}-g{newGeneration}` で作成
  - `peer.on("connection")` でゲスト接続を受付
  - ローカル状態（`lastSyncState` or 現在の composable 状態）をブロードキャスト

- [ ] 2.8 新関数 `reconnectToNewHost(newGeneration)`:
  - `connectionStatus = "migrating"`
  - `MIGRATION_DELAY` ms 待機（新ホストの登録を待つ）
  - `connectToHost(roomId, newGeneration)` で接続試行
  - 失敗時: ローカルモードにフォールバック

- [ ] 2.9 `connectToHost()` にジェネレーション対応を追加:
  - 引数 `generation?: number` を追加
  - Peer ID を `scrum-nanoda-{roomId}` + (generation > 0 なら `-g{generation}`)
  - 途中参加プローブ: `peer-unavailable` で generation を +1 して再試行（MAX_GENERATION まで）

- [ ] 2.10 `cleanup()` でマイグレーション関連状態もリセット

### Phase 3: UI 更新

- [ ] 3.1 `src/components/RoomPanel.vue` — `statusLabel` に `"migrating"` → `"ホスト移行中..."` を追加
- [ ] 3.2 `src/components/RoomPanel.vue` — `statusColor` に `"migrating"` → `"bg-orange-500 animate-pulse"` を追加

### Phase 4: テスト

- [ ] 4.1 `src/composables/useRoom.test.ts` — ユニットテスト追加:
  - sync メッセージに peerList/generation が含まれる
  - peerList[0] が新ホストに選出される
  - MAX_GENERATION 超えでフォールバック

- [ ] 4.2 `e2e/room-migration.spec.ts` — E2E テスト:
  - 3人接続 → ホスト切断 → ゲスト1が新ホストに昇格 → ゲスト2が再接続 → 同期継続
  - 新ホストからの操作が他ゲストに同期される
  - 途中参加者がマイグレーション後のルームに参加できる

### Phase 5: 検証

- [ ] 5.1 `npx vue-tsc --noEmit` — 型チェック
- [ ] 5.2 `npx vp build` — ビルド確認
- [ ] 5.3 `npx vp test run` — ユニットテスト通過
- [ ] 5.4 `pnpm run test:e2e` — 全 E2E テスト通過（既存 + 新規）
- [ ] 5.5 Playwright MCP で 3タブ手動検証

---

## 対象ファイル

| ファイル | 変更種別 |
|---|---|
| `src/types/room.ts` | 拡張: migrating ステータス、peerList/generation 追加 |
| `src/composables/useRoom.ts` | 主要変更: マイグレーションロジック全体 |
| `src/components/RoomPanel.vue` | UI: migrating ステータス表示 |
| `src/composables/useRoom.test.ts` | テスト追加 |
| `e2e/room-migration.spec.ts` | 新規: マイグレーション E2E テスト |
| `e2e/helpers.ts` | ヘルパー追加（3人セットアップ等） |

## 注意事項

- **PeerJS Cloud のID残留**: 古いホストの Peer ID がしばらく残る。だから世代サフィックスで回避する
- **タイミング**: 新ホスト登録（PeerJS Cloud へのシグナリング）に 1-2 秒かかる。他ゲストは `MIGRATION_DELAY=2000ms` 待ってから接続
- **状態ロスなし**: 全ゲストが最新の SyncState を持っているので、マイグレーション中にデータは失われない
- **スター型トポロジー維持**: ゲスト同士の直接接続は不要。中心が入れ替わるだけ
- **既存動作への影響なし**: 2人以下のルームや peerList 未受信時は現行のローカルフォールバック動作を維持
