# 計画: プロジェクトスキャフォールド

## 動機

オリジナル ScrumTimer は Angular ベースだが、なのだ！版は Vue 3 + Vite で新規構築する。
まずプロジェクトの土台を作り、開発が回せる状態にする。

## 設計

### 技術スタック

- **Vite** — ビルドツール
- **Vue 3** (Composition API + `<script setup>`) — UI フレームワーク
- **TypeScript** — 型安全
- **UnoCSS** — ユーティリティファースト CSS
- **Vue Router** — ハッシュベースルーティング（GitHub Pages 対応）

### ディレクトリ構成

```
src/
├── App.vue
├── main.ts
├── router/
│   └── index.ts
├── components/
│   ├── NavBar.vue
│   ├── TimerView.vue
│   ├── ParticipantList.vue
│   ├── SettingsView.vue
│   └── HelpView.vue
├── composables/        # Vue Composables（ロジック再利用）
│   ├── useTimer.ts
│   ├── useParticipants.ts
│   └── useSettings.ts
├── models/
│   └── Participant.ts
├── utils/
│   └── formatTime.ts   # MM:SS フォーマッター（オリジナルの SecsPipe 相当）
└── assets/
```

### 作業内容

1. `npm create vite@latest` で Vue + TypeScript プロジェクトを生成
2. UnoCSS をインストール・設定
3. Vue Router をハッシュモードで設定
4. 上記ディレクトリ構成に空コンポーネントを配置
5. GitHub Pages 用のデプロイ設定（`vite.config.ts` の `base` 設定）
6. GitHub Actions でのビルド・デプロイワークフロー

### ルーティング

| パス | コンポーネント | 説明 |
|---|---|---|
| `/` | TimerView | タイマー画面（デフォルト） |
| `/participants` | ParticipantList | 参加者管理 |
| `/settings` | SettingsView | 設定 |
| `/help` | HelpView | ヘルプ |

### UI 方針

- 日本語 UI
- UnoCSS でモバイルファーストのレスポンシブデザイン
- オリジナルの Bootstrap レイアウトを参考にしつつ、よりシンプルに

## 影響範囲

- プロジェクトルート（`package.json`, `vite.config.ts`, `tsconfig.json` 等）
- `src/` 以下すべて（新規作成）
- `.github/workflows/`（デプロイ設定）
