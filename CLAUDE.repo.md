# CLAUDE.repo.md — ScrumTimer なのだ！

このリポジトリは **ADDF 利用プロジェクト** です。

## プロジェクト概要

[JoSSte/ScrumTimer](https://github.com/JoSSte/ScrumTimer) をフォークし、
**WebRTC によるリアルタイムルーム同期**と **VoiceVox 音源によるタイムキープ読み上げ**を
追加したデイリースクラムタイマー。

## ツールスタック

| カテゴリ | 技術 | 備考 |
|---|---|---|
| ビルド | **Vite** | |
| UI フレームワーク | **Vue 3** | Composition API + `<script setup>` |
| 言語 | **TypeScript** | |
| CSS | **UnoCSS** | ユーティリティファースト |
| ルーティング | **Vue Router** | ハッシュモード（GitHub Pages 対応） |
| P2P 通信 | **PeerJS** (WebRTC) | NAT 越え対応、シグナリングは PeerJS Cloud |
| 音声合成 | **VoiceVox Engine** | ローカル REST API (`localhost:50021`) |
| デプロイ | **GitHub Pages** | GitHub Actions でビルド・デプロイ |

## ディレクトリ構成

```
.
├── CLAUDE.md                          # エージェント開発プロセス定義
├── CLAUDE.repo.md                     # ← このファイル。プロジェクト固有情報
├── TODO.md                            # タスクバックログ
├── CONTRIBUTING.md                    # コントリビューションガイド
├── package.json                       # 【作成予定】
├── vite.config.ts                     # 【作成予定】
├── tsconfig.json                      # 【作成予定】
├── uno.config.ts                      # 【作成予定】UnoCSS 設定
├── index.html                         # 【作成予定】Vite エントリ HTML
├── src/
│   ├── main.ts                        # 【作成予定】Vue アプリエントリ
│   ├── App.vue                        # 【作成予定】ルートコンポーネント
│   ├── router/
│   │   └── index.ts                   # 【作成予定】Vue Router 設定
│   ├── components/
│   │   ├── NavBar.vue                 # 【作成予定】ナビゲーションバー
│   │   ├── TimerView.vue              # 【作成予定】タイマー画面
│   │   ├── ParticipantList.vue        # 【作成予定】参加者管理画面
│   │   ├── SettingsView.vue           # 【作成予定】設定画面
│   │   ├── HelpView.vue              # 【作成予定】ヘルプ画面
│   │   └── RoomPanel.vue             # 【作成予定】ルーム作成・参加 UI
│   ├── composables/
│   │   ├── useTimer.ts                # 【作成予定】タイマーロジック
│   │   ├── useParticipants.ts         # 【作成予定】参加者管理
│   │   ├── useSettings.ts            # 【作成予定】設定管理
│   │   ├── useRoom.ts                # 【作成予定】WebRTC ルーム同期
│   │   └── useVoiceVox.ts            # 【作成予定】VoiceVox 音声合成
│   ├── models/
│   │   └── Participant.ts             # 【作成予定】参加者モデル
│   ├── types/
│   │   └── room.ts                    # 【作成予定】ルーム同期メッセージ型定義
│   ├── utils/
│   │   └── formatTime.ts             # 【作成予定】MM:SS フォーマッター
│   └── assets/
├── .claude/                           # ADDF フレームワーク
│   ├── Progress.md                    # 現在のタスク進捗
│   ├── Feedback.md                    # 問題記録・改善アクション
│   ├── Progresses/                    # 完了タスクのアーカイブ
│   ├── skills/                        # スキル定義
│   └── agents/                        # サブエージェント定義
├── .github/
│   └── workflows/
│       └── deploy.yml                 # 【作成予定】GitHub Pages デプロイ
├── docs/
│   ├── plans/                         # 実装計画ファイル
│   ├── knowhow/                       # 実装知見の蓄積
│   └── reference/                     # オリジナル ScrumTimer のソース（参照用）
└── .gitignore / .claudeignore
```

## 開発体制

### 実装: ずんだもん（メイン開発エージェント）

タスクの実装は**ずんだもん**が担当する。
ずんだもんは「〜なのだ」口調で開発を進め、コミットログやコメントもこの口調で書く。

実装フロー:
1. TODO.md からタスクを選択
2. Plan を読み、関連 knowhow を参照
3. 実装・テスト作成
4. **Stage 1: ビルド検証**（ゲートキーパー）を通過するまでループ

```bash
npm run build && npm run lint && npm run test
```

- Stage 1 が失敗 → 原因分析 → 修正 → 再実行
- Stage 1 を通過するまで品質ゲート Stage 2 に進まない

### 品質ゲート Stage 2: レビューチーム（並列実行）

Stage 1 通過後、以下のエージェントを**並列**で起動する:

**[addf-code-review-agent]** — コードレビュー
- コード品質・可読性・ベストプラクティスの観点からフィードバック

**[addf-contribution-agent]** — コントリビューション分析
- ADDF フレームワーク由来とプロジェクト固有のコードを識別
- アップストリームへのコントリビューション候補を検出・提案
- 分離パターン違反の検出

**Stage 2 の制御フロー:**
- 全エージェントを**並列**で開始する
- Critical/High の指摘 → ずんだもんが修正 → Stage 1 を再実行
- Medium → 原則修正。先送りする場合は独立計画を起こす
- Low/Info → Plan に記録し、必要に応じて独立計画で対応

---

## コーディング規約

- **型宣言は `type` を優先**する。`interface` は `extends` が必要な場合のみ使用
- Composition API + `<script setup>` を使用
- composable 関数は `use` プレフィックス

## ビルド・開発コマンド

```bash
npm install          # 依存関係インストール
npm run dev          # 開発サーバー起動（Vite）
npm run build        # プロダクションビルド
npm run preview      # ビルド結果のプレビュー
npm run lint         # Lint 実行
npm run type-check   # TypeScript 型チェック
```

> ⚠ 上記コマンドは `0001-project-scaffold` 完了後に利用可能になる。

## ルーティング

| パス | コンポーネント | 説明 |
|---|---|---|
| `/#/` | TimerView | タイマー画面（デフォルト） |
| `/#/participants` | ParticipantList | 参加者管理 |
| `/#/settings` | SettingsView | 設定 |
| `/#/help` | HelpView | ヘルプ |
| `/#/room/:roomId` | TimerView + RoomPanel | ルーム参加 |

## 主要な Composables

| Composable | 責務 |
|---|---|
| `useTimer` | タイマーの開始/停止/次へ/リセット、時間計算、進捗率 |
| `useParticipants` | 参加者 CRUD、シャッフル、不在管理、JSON import/export、localStorage 永続化 |
| `useSettings` | グローバル最大時間、VoiceVox 設定、localStorage 永続化 |
| `useRoom` | PeerJS によるルーム作成・参加・状態同期・アクションブロードキャスト |
| `useVoiceVox` | VoiceVox Engine API 連携、音声合成・再生、タイムキープ読み上げ |

## WebRTC ルーム同期の設計方針

- **スター型トポロジー**: ホストが状態を管理し、ゲストは操作をホストに送信
- **PeerJS Cloud**: シグナリングサーバーは PeerJS 公開サーバーを使用（自前サーバー不要）
- **ホスト切断時**: ゲストはローカル状態でスタンドアロンモードに戻る
- **状態同期**: ホストが全状態をブロードキャスト、ゲストは受信して UI を反映

## VoiceVox 連携の設計方針

- **各クライアントローカル実行**: VoiceVox Engine は各ユーザーのマシンで動作
- **グレースフルデグレード**: VoiceVox が利用不可でもタイマーは正常動作
- **プリフェッチ**: 定型フレーズはタイマー開始時に音声データを先読み
- **キューイング**: 音声が重ならないよう再生キューで管理

## リファレンス

`docs/reference/` にオリジナル ScrumTimer（Angular）のソースコードを配置している。
リファレンスの構造は `docs/reference/CLAUDE.md` を参照。

機能の移植・改修時はリファレンスの対応するファイルを確認すること。

## 日本語方針

- UI テキストはすべて日本語
- コミットログは日本語
- VoiceVox の読み上げテキストは日本語（「なのだ」口調）

---

## コミットログ規約

日本語で書く。形式:

```
[領域] 変更内容の要約

詳細説明（必要な場合）
```

領域の例: `基盤`, `タイマー`, `参加者`, `設定`, `ルーム`, `音声`, `UI`, `CI`, `ドキュメント`

---

## テスト

```bash
npm run test         # Vitest でユニットテスト
npm run test:e2e     # Playwright で E2E テスト（予定）
```

- **Vitest**: Vite 組込みのテストランナー。composables とユーティリティのユニットテスト
- **Playwright MCP**: E2E テスト。実際のブラウザ操作でタイマー・ルーム同期・VoiceVox 連携を検証
- テストファイルは `src/**/*.test.ts` に配置（コロケーション）

> ⚠ テスト環境は `0001-project-scaffold` で Vitest を導入後に利用可能。

品質ゲートの Stage 1 で `npm run build && npm run lint && npm run test` を実行してください。
