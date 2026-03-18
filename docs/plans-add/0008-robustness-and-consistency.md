# 計画: 堅牢性と一貫性の向上

## 動機

フレームワークの基本機能は整備されたが、実運用で問題になりやすい箇所がある:
- settings.json と hooks のバリデーション手段がない
- テンプレートとライブファイル（Progress.md 等）の乖離を検出できない
- スキル定義の frontmatter に構文エラーがあっても検出されない

## 設計

### 1. フレームワーク整合性チェックスキル（addf-lint）

`/addf-lint` スキルを新設し、以下を自動チェックする:
- settings.json の JSON 構文チェック
- hooks/ 内のスクリプトの実行権限チェック
- commands/ 内の全スキルの frontmatter YAML パースチェック
- addf-Behavior.toml の構文チェック
- knowhow INDEX と実ファイルの整合性チェック（INDEX に載っているが存在しないファイル、存在するが INDEX にないファイル）

### 2. テンプレート同期チェック

Progress.md の「運用ルール」セクションがテンプレートと一致しているか検証する仕組み:
- `/addf-lint` の一部として実装
- ライブファイルのルールセクションとテンプレートを比較し、乖離があれば警告

### 3. settings.json のパーミッション拡充

現在の allow/ask リストを見直し、テスト実行（`bash .claude/tests/run-all.sh`）を allow に追加する。

## 影響範囲
- `.claude/commands/addf-lint.md`（新規）
- `.claude/settings.json`（軽微）

## 見積もり
AI 実装: 10-15 分
