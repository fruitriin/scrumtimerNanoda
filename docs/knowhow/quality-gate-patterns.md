# 品質ゲートエージェントの運用パターン

## 発見した知見

### Stage 2 の並列起動が効果的

`addf-code-review-agent` と `addf-contribution-agent` を `run_in_background: true` で同時起動すると、
待ち時間を大幅に短縮できる。両者は独立したタスクのため依存関係がない。

```
// 推奨パターン
Agent(code-review, run_in_background: true)
Agent(contribution, run_in_background: true)
// → 完了通知を待ってから修正・完了処理
```

### addf-code-review-agent の検出力

以下のような実質的な問題を検出する能力が高い:

| 検出カテゴリ | 具体例 |
|---|---|
| **XSS 脆弱性** | `v-html` で WebRTC 経由の未サニタイズ HTML を表示 |
| **リアクティビティバグ** | `ref<Map>` の `.set()` が Vue の変更検知を発火しない |
| **テストノイズ** | useTimer テストで Audio モック未設定 → コンソールエラー |
| **型安全性** | Tiptap 3.x の `setContent(content, false)` → 型エラー |
| **UX 設計** | `defineAsyncComponent` のフォールバック未指定 |

**Critical/Warning は必ず修正してからコミットする。** Suggestion は Plan に記録して先送り可。

### addf-contribution-agent の ADDF 本体での限界

このリポジトリ自体が ADDF フレームワーク本体のため、アップストリームコントリビューション候補の検出は限定的。
ただし以下の価値はある:

- 分離パターン違反の検出（`.claude/` への意図しない変更）
- ノウハウ記録の推奨（コードではなく知見としての貢献）

### Warning 修正後の Stage 1 再実行

Warning 修正後は必ず `vp build && vp check src/ && vp test run` を再実行する。
修正が新しいエラーを引き起こすケースがある（フォーマット崩れ、型エラー等）。

## プロジェクトへの適用

- `.claude/Progress.md` の運用ルールに Stage 2 並列起動パターンを記載済み
- 各 Plan の「レビュー記録」セクションに Suggestion を記録

## 注意点・制約

- バックグラウンドエージェントの完了通知が遅延する場合がある（70-80秒程度）
- レビュー結果が JSON 形式の長大な出力ファイルに入る場合、最終メッセージの text を抽出する必要がある
- `addf-security-review-agent` は今回未使用。セキュリティ関連の変更時には追加起動を検討する

## 参照

- `.claude/agents/` — エージェント定義
- `.claude/Progress.md` — 運用ルール（Stage 2 セクション）
