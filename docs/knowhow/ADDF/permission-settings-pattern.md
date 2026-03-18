# 権限要求パターンと settings ファイルの使い分け

## 発見した知見

### 3つの権限パターン

| パターン | 内容 | 例 |
|---|---|---|
| **アップストリーム** | ADDF フレームワーク開発・メンテナンスに必要な権限 | `sed`（大規模リネーム）、`find`（.gitignore 外探索）、`swiftc`（ツールビルド） |
| **ダウンストリーム** | プロジェクト固有の開発に必要な権限 | プロジェクトのビルドコマンド、テストランナー、デプロイツール |
| **汎用** | どのプロジェクトでも共通して必要な権限 | `git` 操作、ファイル操作（`cp`, `mv`, `rm`, `mkdir`, `ls`）、`chmod` |

### 2つのプロジェクト種別 × 配置先

#### ADDF 開発プロジェクト（このリポジトリ = フレームワーク本体）

| パターン | 配置先 | 理由 |
|---|---|---|
| アップストリーム | `settings.local.json` | ADDF 開発固有の権限。ダウンストリームに持ち込ませない |
| ダウンストリーム | `settings.json` | テンプレートとしてダウンストリームに配布される |
| 汎用 | `settings.json` | 全プロジェクトで共通、コミット対象 |

**ポイント**: このリポジトリの `settings.json` はダウンストリームの初期テンプレートになる。ADDF 開発でしか使わない `sed`, `find`, `swiftc` 等は `settings.local.json` に入れるべき。

#### ADDF 利用プロジェクト（ダウンストリーム）

| パターン | 配置先 | 理由 |
|---|---|---|
| アップストリーム | `settings.json` | ADDF フレームワーク機能（スキル・エージェント・フック）の実行に必要。全開発者で共有 |
| ダウンストリーム | `settings.json` | プロジェクト固有のビルド・テスト権限。全開発者で共有 |
| マシンローカル | `settings.local.json` | 個人の開発環境固有の権限（IDE 連携、個人ツール等） |

## プロジェクトへの適用

### 現在の settings.json の問題点

現在の `settings.json` にはアップストリーム権限（`sed`, `find`, `swiftc`, `git rev-parse`）が混在している。ダウンストリームプロジェクトがこのテンプレートをクローンすると、不要な権限が含まれてしまう。

### あるべき姿

**settings.json**（コミット対象、ダウンストリームのテンプレート）:
```json
{
  "permissions": {
    "allow": [
      "Read", "Edit", "Write", "Glob", "Grep",
      "Agent", "Skill", "LSP", "ToolSearch",
      "TaskCreate", "TaskGet", "TaskList", "TaskOutput", "TaskStop", "TaskUpdate",
      "TeamCreate", "TeamDelete", "SendMessage",
      "Bash(cp:*)", "Bash(mkdir:*)", "Bash(ls:*)", "Bash(tail:*)", "Bash(cd:*)",
      "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)",
      "Bash(git add:*)", "Bash(git commit:*)", "Bash(git rm:*)",
      "Bash(git ls-files:*)", "Bash(git branch:*)", "Bash(git worktree:*)",
      "Bash(git checkout:*)", "Bash(git show:*)", "Bash(git merge:*)", "Bash(git stash:*)",
      "Bash(bash .claude/tests/run-all.sh:*)",
      "Bash(uv run --python 3.11 .claude/addfTools/lint:*)"
    ],
    "ask": [
      "Bash(git push:*)",
      "Bash(git reset --hard:*)",
      "Bash(git clean:*)"
    ]
  }
}
```

**settings.local.json**（ADDF 開発プロジェクトのみ、gitignore 対象）:
```json
{
  "permissions": {
    "allow": [
      "Bash(sed:*)",
      "Bash(find:*)",
      "Bash(git rev-parse:*)",
      "Bash(bash .claude/addfTools/build.sh:*)",
      "Bash(swiftc:*)"
    ]
  }
}
```

## 権限フォーマットの技術仕様

### 組み込みツールの許可

組み込みツールはツール名だけで許可できる:
```json
"allow": ["Read", "Edit", "Write", "Glob", "Grep", "Agent", "Skill", "LSP", "ToolSearch"]
```

タスク管理・チーム管理系も同様: `TaskCreate`, `TaskUpdate`, `TeamCreate`, `SendMessage` 等。

### Bash コマンドの許可形式

`Bash(prefix:*)` でプレフィックスマッチ:
- `Bash(git status:*)` → `git status`、`git status --short` 等にマッチ
- `Bash(bash .claude/tests/:*)` → `.claude/tests/` 以下のスクリプト実行にマッチ

### スキルと権限のスコープ

**スキルは権限をネストしない**。`Skill(addf-lint)` を allow に入れてもスキル起動の許可のみ。スキル内部で呼ばれる `Bash(uv run ...)` 等の各ツール呼び出しは個別に権限チェックされる。

### コマンド許可の限定テクニック

`python3` を全面許可すると権限が強すぎる場合、実行スクリプトをディレクトリに集約して限定できる:
```json
"Bash(uv run --python 3.11 .claude/addfTools/lint:*)"
```
これにより `.claude/addfTools/lint-*.py` のみ許可され、任意の python3 実行は防げる。

## 注意点・制約

- `settings.local.json` は `.gitignore` 対象なのでコミットされない
- 権限は `settings.local.json` > `settings.json` の優先順位で解決される
- 新しい権限を追加するときは「これはどのパターンか？」を判断してから配置先を決める
- `ask` に入れるべき破壊的操作（push, reset --hard, clean）はどちらのプロジェクト種別でも共通
- セッション中にユーザーが deny した権限は、settings.json の allow で上書きできない可能性がある（要検証）

## 参照

- `.claude/settings.json` — プロジェクト共有設定
- `.claude/settings.local.json` — ローカル設定
- `docs/knowhow/ADDF/upstream-downstream-separation.md` — 分離パターンの全体像
