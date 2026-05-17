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
vp build && vp check src/ && vp test run
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
- 全エージェントを `run_in_background: true` で**並列**開始する
- Critical/High の指摘 → ずんだもんが修正 → Stage 1 を再実行
- Medium → 原則修正。先送りする場合は独立計画を起こす
- Low/Info → Plan に記録し、必要に応じて独立計画で対応

### ノウハウ記録（実装中・レビュー後・総括時）

実装サイクル中に得た知見を `docs/knowhow/` に記録する。3つのタイミングで3カテゴリ:

| タイミング | 記録内容 | knowhow ファイル例 |
|---|---|---|
| **実装中** | コーディングパターン、ライブラリの癖 | `vue-coding-patterns.md` |
| **レビュー後** | 品質ゲートの検出パターン、運用の気づき | `quality-gate-patterns.md` |
| **タスク総括** | タスク選択判断、時間配分、プロセス改善 | `task-completion-patterns.md` |

コンパクション（コンテキスト圧縮）前に記録しないと知見が消失するため、フック通知（10/15ターン）時に確実に記録する。

### デプロイ（完了処理の一部）

Stage 2 通過後、コミット・push と合わせて GitHub Pages にデプロイする:

```bash
pnpm run deploy      # vp build → gh-pages ブランチに push
```

- デプロイ先: https://fruitriin.github.io/scrumtimerNanoda/
- 方式: Deploy from Branch（gh-pages ブランチ、/ ルート）
- `vp build` → `dist/` を orphan `gh-pages` ブランチに force push

---

## コーディング規約

- **型宣言は `type` を優先**する。`interface` は `extends` が必要な場合のみ使用
- Composition API + `<script setup>` を使用
- composable 関数は `use` プレフィックス

## アクセシビリティ / クオリティライン

本プロジェクト全体のクオリティラインとして、**GUI 操作体験**（マウス/タッチ/キーボードで Web ページを閲覧・操作する、スクリーンリーダー等の補助技術を介さない利用形態）を一級とする。

アクセシビリティ実装の採否は以下の2軸で判断する。判断軸は新規実装・レビュー・リファクタリング時に常に参照すること。

### 軸 A: キーボード操作性 — 全員に価値のある快適さ要件

GUI 操作体験の中でキーボード関連実装は、マウス/タッチ操作者にも便益があるため積極採用する。

**推奨**:
- Tab で全インタラクティブ要素を巡回できること
- `:focus-visible` で視認できるフォーカスリングを必ず確保すること
- ネイティブ `<button>` / `<dialog>` / `<a>` を選び、Enter/Space/Esc ハンドラを自動取得すること
- HTML `<dialog>` 要素（Baseline 2022）はフォーカス管理・focus trap・Esc キャンセル・`::backdrop` をブラウザに任せられるので、自前モーダル実装より優先する
- 主要操作にキーボードショートカット（Space=スタート/一時停止 等）を提供してよい

**禁止**:
- `outline-none` 単体（フォーカスが見えなくなる）。スタイル目的なら `focus-visible:ring-*` 等で復元する
- ネイティブ要素を `<div>` + onClick で代替すること（Enter/Space ハンドラの自前実装は漏れリスク）
- `window.confirm()` / `window.alert()`（スタイル不可・ブラウザ全体のフォーカスを奪う・抑止チェックが出る）

### 軸 B: 情報伝達経路 — 「ユーザーが気づくか」で判定する

```html
<!-- NG: title は表示まで約 2 秒の遅延があり気づかれない=無に等しい -->
<button title="不在にする">⊖</button>

<!-- OK: 視覚テキスト併記 -->
<button>⊖ 不在</button>

<!-- OK: コンテキストで意味が伝わる場合は aria-label のみ残置可 -->
<button :aria-label="`${p.name}を不在にする`">⊖</button>
```

- アイコンのみボタンを `title` 属性だけで意味伝達するのは GUI 操作体験の致命的な損失
- 視覚テキスト併記またはアイコン+短文化を優先する
- `aria-label` は読み上げ補助としては残置可能だが、視覚的意味伝達の主役にはしない
- 装飾的な aria-* / role（progressbar の valuenow、role="alert" 通知 等）は害がない範囲で残置

### 確認ダイアログ等のモーダル UI

HTML `<dialog>` 要素ベースの薄いラッパーコンポーネントを使う。自前で `role="dialog"` / `aria-modal` / Esc ハンドラ / focus trap は実装しない（ネイティブ任せ）。スタイリングのみ UnoCSS で UI 整合させる。

## ビルド・開発コマンド

```bash
vp install           # 依存関係インストール（pnpm に委譲）
vp dev               # 開発サーバー起動
vp build             # プロダクションビルド
vp preview           # ビルド結果のプレビュー
vp check src/        # format + lint + type check 一括
vp test run          # Vitest ユニットテスト
pnpm run deploy      # ビルド → gh-pages ブランチに push（GitHub Pages デプロイ）
```

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
vp test run          # Vitest でユニットテスト
vp test              # ウォッチモードでテスト
```

- **Vitest**: Vite+ 組込みのテストランナー。composables とユーティリティのユニットテスト
- **Playwright MCP**: E2E テスト。実際のブラウザ操作でタイマー・ルーム同期・VoiceVox 連携を検証
- テストファイルは `src/**/*.test.ts` に配置（コロケーション）
- E2E テストは `e2e/` に配置

品質ゲートの Stage 1 で `vp build && vp check src/ && vp test run` を実行する。

### Playwright MCP の活用方針

- **テストコード作成**: Playwright MCP でブラウザを操作し、E2E テストシナリオの Playwright コード一式（`e2e/`）を作成する
- **バグ調査**: 未知のバグの再現・原因特定に Playwright MCP を使ってインタラクティブにブラウザを操作してよい
- **開発サーバー**: E2E テスト実行前に `vp dev` で開発サーバーを起動すること（デフォルト `http://localhost:5173`）
