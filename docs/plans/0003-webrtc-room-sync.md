# 計画: WebRTC ルーム同期

## 動機

なのだ！版の最大の差別化ポイント。WebSocket ではなく WebRTC DataChannel を使い、
GitHub Pages（静的サイト）のままリアルタイム同期を実現する。
ルームを作成し、URL を共有するだけで誰でもジョインでき、誰のブラウザからでもターン交代できる。

## 設計

### シグナリング戦略

GitHub Pages は静的ホスティングのため、自前の WebSocket サーバーは持たない。
**PeerJS** を採用し、PeerJS Cloud（公開シグナリングサーバー）を利用する。

- PeerJS はシグナリングのみサーバーを使い、データ転送は P2P
- NAT 越えは PeerJS が内蔵する STUN/TURN で対応
- 将来的に自前シグナリングサーバーへの切り替えも可能（PeerJS Server は OSS）

### ルームの仕組み

```
ルーム作成者 → ランダム ID 生成（nanoid, 8文字）→ URL: /#/room/{roomId}
参加者 → URL にアクセス → PeerJS でルーム作成者に接続 → 状態同期
```

**ルーム作成者（ホスト）の役割:**
- PeerJS の Peer ID を `scrum-nanoda-{roomId}` として登録
- 新規接続を受け付け、現在の状態（参加者リスト、タイマー状態）を送信
- 全クライアントの操作を中継（メッシュではなくスター型トポロジー）

**参加者（ゲスト）の役割:**
- ホストの Peer ID に接続
- 状態更新を受信して UI に反映
- 操作（次へ、不在マーク等）をホストに送信

### useRoom Composable

```typescript
// ルーム管理
- roomId: Ref<string | null>
- isHost: Ref<boolean>
- connectedPeers: Ref<number>
- connectionStatus: Ref<'disconnected' | 'connecting' | 'connected'>

// アクション
- createRoom(): string          // ルーム作成、roomId を返す
- joinRoom(roomId: string)      // ルームに参加
- leaveRoom()                   // ルームから退出
- broadcastState(state)         // 状態をブロードキャスト（ホスト）
- sendAction(action)            // アクションをホストに送信（ゲスト）
```

### 同期プロトコル

メッセージ型:

```typescript
type RoomMessage =
  | { type: 'sync'; state: TimerState }           // ホスト → ゲスト: 全状態同期
  | { type: 'action'; action: TimerAction }        // ゲスト → ホスト: 操作リクエスト
  | { type: 'peer-joined'; count: number }         // ホスト → 全員: 接続数更新
  | { type: 'peer-left'; count: number }           // ホスト → 全員: 接続数更新
  | { type: 'timekeep'; event: TimekeepEvent }     // ホスト → 全員: タイムキープ通知（0004 で使用）

type TimerAction =
  | { kind: 'start' }
  | { kind: 'stop' }
  | { kind: 'next' }
  | { kind: 'reset' }
  | { kind: 'markAbsent'; participantId: string }
  | { kind: 'markPresent'; participantId: string }
  | { kind: 'shuffle' }

type TimekeepEvent =
  | { kind: 'remaining'; seconds: number }         // 残り時間通知
  | { kind: 'timeup' }                             // 時間切れ
  | { kind: 'nextPerson'; name: string }           // 次の人
  | { kind: 'allDone' }                            // 全員完了
```

### ルーティング追加

| パス | 説明 |
|---|---|
| `/#/room/:roomId` | ルームに参加（roomId があれば接続、なければ作成） |

### UI 追加要素

- ルーム作成ボタン（トップ画面に配置）
- ルーム URL 共有（コピーボタン）
- 接続状態インジケーター（接続中、接続済み、人数）
- ルーム退出ボタン

### ホスト交代（フォールバック）

ホストが切断した場合の暫定対策:
- ゲストはローカルの最後の状態でスタンドアロンモードに戻る
- 「ルームを再作成」ボタンを表示し、残りのメンバーが新ルームを作れるようにする

### エラーハンドリング

- **PeerJS Cloud 不調**: 接続タイムアウト後、「シグナリングサーバーに接続できません」を表示。ローカルモードで継続利用可能
- **ネットワーク断**: 自動再接続を試行（3回、指数バックオフ）。復旧しなければスタンドアロンモードに戻る
- **ホスト切断**: 上記フォールバック参照

### テスト

- `src/composables/useRoom.test.ts` — PeerJS をモック化し、ルーム作成・参加・メッセージ送受信・切断をテスト

## 影響範囲

- `src/composables/useRoom.ts`（新規）
- `src/types/room.ts`（新規: RoomMessage, TimerAction, TimekeepEvent 型定義）
- `src/router/index.ts`（ルーム用ルート追加）
- `src/components/TimerView.vue`（ルーム UI 追加）
- `src/components/RoomPanel.vue`（新規: ルーム作成・参加 UI）
- `package.json`（peerjs 追加）
