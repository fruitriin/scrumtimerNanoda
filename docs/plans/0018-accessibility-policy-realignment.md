# 計画: 0018 — アクセシビリティ方針の再整理

## 動機

オーナーフィードバック (2026-05-16) により、本プロジェクトのアクセシビリティ方針が更新された。

> メインターゲットは **GUI 操作体験**（マウス/タッチ/キーボードで Web ページを閲覧・操作する、
> 補助技術を介さない利用形態）。アクセシビリティは「必要な人にも機能を提供する」最低限のサポートに留め、
> メインターゲットの体験を犠牲にしない。判断は **軸 A (キーボード操作性)** と
> **軸 B (情報伝達経路の有効性)** の 2 軸で行う。
> （`.claude/Feedback.md` および `CLAUDE.repo.md` のアクセシビリティ方針セクション参照）

Plan 0012 (2026-03-28 完了) では WCAG 2.1 AA を目指して `aria-*` / `role` 属性を網羅的に追加した。
これらは「害がない範囲で残す」が原則だが、現方針に照らして個別に残置・除去を判断する必要がある。

## スコープ

### 対象（再評価する実装）

`src/components/` 配下の `<template>` に存在する以下の属性:
- `role="progressbar"` + `aria-valuenow` / `aria-valuemin` / `aria-valuemax` / `aria-label` / `aria-valuetext`
- アイコンボタンの `aria-label`（`title` 属性で代替可能か検討）
- `role="status"`, `role="alert"`, `aria-hidden`
- `<nav>` の `aria-label`
- `focus:ring` / `focus:outline-none` などフォーカス関連 Tailwind/UnoCSS クラス

各コンポーネントの先頭に `FIXME(plan-0018)` コメントが入っている。

### 対象外

- レスポンシブ実装（Plan 0012 のもう一方の柱）: タッチターゲット拡大・モバイル padding 調整は現方針でも有効、変更不要
- `role="alert"` でのエラー通知: ネイティブな通知パターンとして残置（ユーザー操作に応答する重要情報）

---

## 判断基準（オーナーフィードバック 2026-05-16 で確定）

2 つの軸で残置・除去・補強を決める。

### 軸 A: キーボード操作性

GUI 操作体験のキーボード関連実装は **全員に価値のある快適さ要件**。
マウス/タッチ操作者にも、Tab で巡回・Enter/Space で実行・Esc で閉じる、といった挙動は便利。
キーボード操作を阻害する実装 (`outline-none` のみ等) は **除去または `focus-visible` 系で復元する**。

| 実装 | 判定 |
|---|---|
| `tabindex` でのフォーカス順制御 | キーボード操作改善になるなら追加 |
| `:focus` / `:focus-visible` スタイル | 視認できるフォーカスリングを必ず確保 |
| `Enter` / `Space` / `Esc` ハンドラ | ネイティブ要素 (`<button>`, `<dialog>`) を選ぶことで自動取得を優先 |
| `outline-none` 単体 | **除去** (フォーカスが見えなくなる) |
| `outline-none focus:ring-*` の組み合わせ | スタイリング目的なら残置（フォーカスは見える） |

### 軸 B: 情報伝達経路としての有効性

aria-* やラベル系の実装は「実際にユーザーが気づくか」で判断する。

- **NG パターン**: `<button title="不在にする">⊖</button>` だけで意味を伝える
  - `title` 属性ツールチップは表示まで約 2 秒の遅延があり、存在に気づかれない = 無いのと同じ
  - これは致命的な GUI 操作体験の損失。`title` 単独に頼った設計は不可
  - 代替案: 視覚テキストラベル併記 / アイコン+短文表記 / 常時表示の補助ラベル
- **OK パターン**: aria-label による情報補完
  - スクリーンリーダー利用者への補助情報として残置は害なし
  - ただし「視覚的に意味を伝える」役割は aria-label には期待できない（マウス/タッチ操作者には届かない）

### 個別判断（事前予想）

| 属性 / 実装 | 配置 | 判断 | 理由 |
|---|---|---|---|
| `role="progressbar"` + aria-valuenow/min/max/label | TimerView 進捗バー3つ | **残置** | `<div>` ベース実装、ARIA で意味補完は害なし |
| アイコンのみボタン `⊖ ⊕ ✕` + `title` + `aria-label` | TimerView 参加者リスト | **要補強** | `title` だけでは気づかれないので、視覚ラベル併記 or アイコン+短文化を検討。`aria-label` は残置 |
| `aria-label="閉じる"` ✕ ボタン | TimerView / AudioPanel エラー通知 | **残置** | コンテキスト (エラー通知の右端) で意味が伝わる、害なし |
| `aria-label="音量"` レンジスライダー | AudioPanel | **置換検討** | 視覚ラベル `<label>` 化のほうが全員に伝わる |
| `role="alert"` / `role="status"` | AudioPanel / RoomPanel / TimerView | **残置** | 通知の意味づけ、害なし |
| `aria-hidden="true"` 装飾要素 | RoomPanel ステータスドット | **残置** | 害なし |
| `aria-label="メインナビゲーション"` | NavBar `<nav>` | **除去候補** | 単一ナビゲーションでは冗長 |
| `focus:outline-none focus:ring-2` | RoomPanel 入力欄 | **残置** | フォーカスは `focus:ring-2` で視認可能、軸 A 合格 |
| キーボードショートカット未実装 | 全体 | **追加検討** | Space=スタート/停止、N=次へ、P=前へ 等。軸 A により全員のUX向上 |

最終判断は実装フェーズで行う。

---

## チェックリスト

### Phase 1: 全体監査

- [ ] 1.1 `src/` 配下で `outline-none` が単独で使われている箇所を検出（軸 A 違反候補）
- [ ] 1.2 `src/` 配下で `title` 属性のみでアイコンの意味を伝えている箇所を検出（軸 B 違反候補）
- [ ] 1.3 アイコンのみボタン (絵文字を `<button>` 直下に置く形) を一覧化

### Phase 2: コンポーネント別実装

- [ ] 2.1 `src/components/TimerView.vue`
  - 参加者リストの `⊖` / `✕` / `⊕` ボタンに視覚テキスト併記 or アイコン+短文化（軸 B）
  - `role="progressbar"` 系 aria は残置
  - エラー通知の `aria-label="閉じる"` は残置
- [ ] 2.2 `src/components/AudioPanel.vue`
  - 音量スライダーを `<label>` でラップしてネイティブラベル化（軸 B、aria-label を除去）
  - ミュート/テストボタンは現状の絵文字 + テキスト構成を確認、必要なら補強
- [ ] 2.3 `src/components/RoomPanel.vue`
  - 入力欄の `focus:outline-none focus:ring-2` は軸 A 合格、残置
  - 装飾要素の aria-hidden は残置
- [ ] 2.4 `src/components/NavBar.vue`
  - `aria-label="メインナビゲーション"` を除去
  - リンクが Tab で巡回できることを確認

### Phase 3: キーボードショートカット（軸 A 強化）

- [ ] 3.1 `useKeyboardShortcuts.ts` composable を新規作成
- [ ] 3.2 ショートカット仕様を決定:
  - `Space`: スタート / 一時停止 / 再開（タイマー画面）
  - `N` または `→`: 次へ
  - `P` または `←`: 前へ戻る
  - `Esc`: モーダル/確認ダイアログを閉じる（ネイティブ任せ）
- [ ] 3.3 `TimerView.vue` に統合、`input` / `textarea` フォーカス時は無効化
- [ ] 3.4 ヘルプ画面 (`HelpView.vue`) にショートカット一覧を追加
- [ ] 3.5 `e2e/keyboard-shortcuts.spec.ts` を新規作成

### Phase 4: FIXME 削除

- [ ] 4.1 各コンポーネントの `FIXME(plan-0018)` コメントを削除

### Phase 5: ドキュメント整合

- [ ] 5.1 `docs/plans/0012-accessibility-responsive.md` — 注記を「再評価済み (Plan 0018 で対応)」に更新
- [ ] 5.2 `docs/knowhow/vue-coding-patterns.md` — アクセシビリティ実装方針セクションを最終状態に合わせて調整（キーボード操作の項目を追加）
- [ ] 5.3 `docs/knowhow/INDEX.md` — 要約調整

### Phase 6: 検証

- [ ] 6.1 `vp build` — ビルド通過
- [ ] 6.2 `vp check src/` — Lint / format 通過
- [ ] 6.3 `vp test run` — ユニットテスト全通過（ARIA セレクタを使うテストがあれば調整）
- [ ] 6.4 `pnpm run test:e2e` — E2E 全通過
- [ ] 6.5 Playwright MCP で目視確認:
  - Tab キーで全インタラクティブ要素を巡回できる
  - フォーカスリングがすべての要素で視認できる（軸 A）
  - キーボードショートカットが動作する
  - アイコンボタンの意味が常時可視（title 待ちが発生しない、軸 B）

---

## 対象ファイル

| ファイル | 変更種別 |
|---|---|
| `src/components/TimerView.vue` | アイコンボタンの可視ラベル化、aria-* 整理、ショートカット統合、FIXME 削除 |
| `src/components/AudioPanel.vue` | 音量スライダー `<label>` 化、FIXME 削除 |
| `src/components/RoomPanel.vue` | aria-* 整理、FIXME 削除 |
| `src/components/NavBar.vue` | `aria-label` 除去、FIXME 削除 |
| `src/components/HelpView.vue` | ショートカット一覧追加 |
| `src/composables/useKeyboardShortcuts.ts` | 新規: キーボードショートカット |
| `e2e/keyboard-shortcuts.spec.ts` | 新規: ショートカット E2E |
| `docs/plans/0012-accessibility-responsive.md` | 注記更新 |
| `docs/knowhow/vue-coding-patterns.md` | 方針セクション調整 |
| `docs/knowhow/INDEX.md` | 要約調整 |

---

## 注意事項

- **テスト互換性**: 既存のテストが `aria-label` や `role` でセレクタを使っている可能性がある。除去するときは検索して同時更新する
- **ユニットテスト**: `*.test.ts` に `getByRole` / `getByLabelText` の使用箇所があれば確認
- **E2E テスト**: `e2e/*.spec.ts` で `page.getByRole(...)` / `page.getByLabel(...)` を使っている箇所も確認
- **Plan 0017 との競合**: Plan 0017 は本計画より先にスタートしているが、共通ファイル `TimerView.vue` に触る。0017 完了後に着手するのが安全
- **Plan 0012 の扱い**: 完了 Plan は履歴として保存。本計画で「再評価済み」の注記に切り替える
- **キーボードショートカット衝突**: 入力中 (`<input>` / `<textarea>` / `[contenteditable]` フォーカス時) はショートカットを無効化する。`event.target` の判定でガード
- **メモエディタとの干渉**: `MemoEditor.vue` (Tiptap) はキーボード入力を多用するので、フォーカス中はグローバルショートカットを発火させない