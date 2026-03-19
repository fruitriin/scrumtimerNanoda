# 計画: デイリースクラムメモ欄

## 動機

デイリースクラムでは「昨日やったこと」「今日やること」「困っていること」を話すが、
事前にメモを準備しておくと発表がスムーズになる。
公開メモと秘匿メモを使い分けることで、チーム共有すべき情報と個人的な備忘録を分離できる。

## 設計

### メモの種類

| 種類 | 保存先 | 共有 | 用途 |
|---|---|---|---|
| **公開メモ** | localStorage + WebRTC 同期 | ルーム内全員に表示（誰のメモか名前付き） | 昨日やったこと、今日やること、困っていること |
| **秘匿メモ** | localStorage のみ | 自分のブラウザだけ | 個人的な備忘録、話したくない詳細 |

### メモエディタ

WYSIWYG 系の Markdown エディタを採用する。候補:

- **Milkdown** — プラグインベースの WYSIWYG Markdown エディタ（Vue 対応、軽量）
- **Tiptap** — ProseMirror ベースのリッチテキストエディタ（Vue 対応、Markdown 拡張あり）

選定基準:
- Vue 3 + TypeScript 対応
- Markdown のインポート/エクスポート（内部データは Markdown で保存）
- バンドルサイズが軽量
- 基本的な書式（見出し、リスト、太字、コードブロック）が使えれば十分

### 画面構成

TimerView の画面を3ペイン構成にする:

```
┌─────────────────────────────────────────────┐
│                 タイマー                      │
│            MM:SS ████████░░ 75%              │
├──────────────────┬──────────────────────────┤
│  今喋ってる人      │  自分のメモ               │
│                  │                          │
│  🎤 田中太郎      │  [公開] タブ | [秘匿] タブ  │
│  残り 1:30       │                          │
│                  │  ▪ 昨日: API修正完了       │
│  ── 完了 ──      │  ▪ 今日: レビュー対応      │
│  ✅ 山田花子 1:45 │  ▪ 困り: テスト環境が不安定 │
│  ✅ 佐藤次郎 2:00 │                          │
│                  │                          │
│  ── 待機 ──      │                          │
│  ⏳ 鈴木三郎      │                          │
│  ⏳ 高橋四郎      │                          │
├──────────────────┴──────────────────────────┤
│  📋 みんなの公開メモ（折りたたみ可能）          │
│                                             │
│  田中太郎: API修正完了 / レビュー対応 / ...    │
│  山田花子: ドキュメント更新 / デプロイ / ...    │
└─────────────────────────────────────────────┘
```

- **上部**: タイマー（プログレスバー付き）
- **左**: 今喋ってる人 + 完了/待機リスト
- **右**: 自分のメモ（公開/秘匿タブ切り替え）
- **下部**: みんなの公開メモ（折りたたみ可能、WebRTC で同期）

モバイルではタブ切り替え式のシングルカラムレイアウトにフォールバックする。

### Memo モデル

```typescript
type DailyMemo = {
  participantId: string   // 誰のメモか
  publicContent: string   // 公開メモ（Markdown）
  privateContent: string  // 秘匿メモ（Markdown）— WebRTC で送信しない
  updatedAt: number       // 最終更新タイムスタンプ
}
```

### useMemo Composable

```typescript
// 状態
- myMemo: Ref<DailyMemo>                    // 自分のメモ
- publicMemos: Ref<Map<string, DailyMemo>>  // ルーム内全員の公開メモ（participantId → メモ）

// アクション
- updatePublicMemo(content: string)    // 公開メモ更新 → localStorage + WebRTC ブロードキャスト
- updatePrivateMemo(content: string)   // 秘匿メモ更新 → localStorage のみ
- clearMemo()                          // メモをクリア（新しいデイリー開始時）
```

### WebRTC 同期プロトコル追加

0003 の RoomMessage に以下を追加:

```typescript
type RoomMessage =
  | ... // 既存の型
  | { type: 'memo-update'; memo: PublicMemoPayload }  // メモ更新通知

type PublicMemoPayload = {
  participantId: string
  participantName: string
  content: string       // 公開メモの Markdown テキストのみ（秘匿は含まない）
  updatedAt: number
}
```

- メモの更新は**デバウンス**（500ms）してからブロードキャスト（タイプ中の大量送信を防止）
- ルーム参加時にホストが全員の最新公開メモを一括送信

### localStorage 構造

```typescript
// キー: 'dailyMemo'
type StoredMemo = {
  publicContent: string
  privateContent: string
  date: string           // 'YYYY-MM-DD' — 日付が変わったら自動クリア
}
```

日付が変わったらメモを自動クリアする（前日のメモは残さない）。
ただし、手動で「昨日のメモを見る」オプションは用意する。

### テスト

- `src/composables/useMemo.test.ts` — メモ CRUD、localStorage 永続化、日付切り替えクリア
- E2E（Playwright MCP）: メモ入力 → 公開メモのルーム内表示を確認

## 影響範囲

- `src/composables/useMemo.ts`（新規）
- `src/components/MemoEditor.vue`（新規: WYSIWYG Markdown エディタ）
- `src/components/PublicMemoList.vue`（新規: みんなの公開メモ表示）
- `src/components/TimerView.vue`（3ペインレイアウトに改修）
- `src/types/room.ts`（memo-update メッセージ追加）
- `src/composables/useRoom.ts`（メモ同期のブロードキャスト追加）
- `src/composables/useSettings.ts`（メモ関連設定キー追加）
- `package.json`（Markdown エディタライブラリ追加）
