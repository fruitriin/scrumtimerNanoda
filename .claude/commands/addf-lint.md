---
name: addf-lint
description: |
  ADDF フレームワークの整合性をチェックする。settings.json 構文・hooks 実行権限・
  スキル frontmatter・Behavior.toml・knowhow INDEX 整合・テンプレート同期を検証する。
  品質ゲート前、CI、設定変更後に使う。
context: fork
user_invocable: true
---

# ADDF Lint — フレームワーク整合性チェック

以下のチェックを順番に実行し、結果をまとめて報告する。
全チェック通過時は `✓ All checks passed` を表示する。
問題がある場合は項目ごとに `✗` と詳細を表示する。

## 1. JSON 構文チェック

以下のファイルが存在すれば JSON として正しいか検証する:
- `.claude/settings.json`
- `.claude/settings.local.json`

Bash で `python3 -m json.tool <file> > /dev/null` を使う。

## 2. Hooks 実行権限チェック

`.claude/hooks/` 内の `*.sh` ファイルが実行権限を持っているか確認する。
実行権限がないファイルがあれば警告する。

## 3. スキル Frontmatter チェック

`.claude/commands/addf-*.md` の全ファイルについて:
- `---` で囲まれた YAML frontmatter が存在するか
- `name`, `description` フィールドが存在するか

Bash で以下のワンライナーを使う:
```bash
python3 -c "
import sys, yaml, glob
errors = []
for f in sorted(glob.glob('.claude/commands/addf-*.md')):
    with open(f) as fh:
        content = fh.read()
    if not content.startswith('---'):
        errors.append(f'{f}: frontmatter なし')
        continue
    parts = content.split('---', 2)
    if len(parts) < 3:
        errors.append(f'{f}: frontmatter 閉じタグなし')
        continue
    try:
        meta = yaml.safe_load(parts[1])
    except Exception as e:
        errors.append(f'{f}: YAML パースエラー: {e}')
        continue
    if not meta or not isinstance(meta, dict):
        errors.append(f'{f}: frontmatter が空または不正')
        continue
    for key in ['name', 'description']:
        if key not in meta:
            errors.append(f'{f}: {key} フィールドなし')
for e in errors:
    print(e)
sys.exit(1 if errors else 0)
"
```

## 4. addf-Behavior.toml 構文チェック

`.claude/addf-Behavior.toml` が存在すれば TOML として正しいか検証する。

```bash
python3 -c "
import tomllib, sys
try:
    with open('.claude/addf-Behavior.toml', 'rb') as f:
        tomllib.load(f)
    print('OK')
except FileNotFoundError:
    print('SKIP: ファイルなし')
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(1)
"
```

## 5. Knowhow INDEX 整合性チェック

`docs/knowhow/INDEX.addf.md`（ADDF 本体の場合）または `docs/knowhow/INDEX.md`（ダウンストリームの場合）を対象に:
- INDEX に記載されているがファイルが存在しないエントリを検出
- `docs/knowhow/` 配下に存在するが INDEX に記載されていない `.md` ファイルを検出
- INDEX ファイル自身（INDEX.md, INDEX.addf.md）は除外する

INDEX ファイルからリンクを抽出するには、テーブル行の `[パス](パス)` パターンをパースする。

## 6. テンプレート同期チェック

`.claude/Progress.md` の「## 運用ルール」から「---」までのセクションと、
`.claude/templates/ProgressTemplate.addf.md` の同じセクションを比較する。

完全一致でなくてよい — Progress.md の運用ルールセクションがテンプレートの内容を**含んでいる**ことを確認する。
テンプレートにあって Progress.md にない行があれば警告する。

```bash
python3 -c "
import sys

def extract_section(path, header='## 運用ルール', end_marker='---'):
    with open(path) as f:
        content = f.read()
    start = content.find(header)
    if start == -1:
        return ''
    end = content.find(end_marker, start + len(header))
    return content[start:end if end != -1 else len(content)]

tmpl = extract_section('.claude/templates/ProgressTemplate.addf.md')
prog = extract_section('.claude/Progress.md')
missing = []
for line in tmpl.splitlines():
    stripped = line.strip()
    if stripped and stripped not in prog:
        missing.append(stripped)
if missing:
    print('テンプレートとの乖離:')
    for m in missing:
        print(f'  MISSING: {m}')
    sys.exit(1)
else:
    print('OK')
"
```

## 結果報告

全チェックの結果を以下の形式でまとめる:

```
╔══════════════════════════════════════╗
║  ADDF Lint Results                   ║
╚══════════════════════════════════════╝

1. JSON 構文          ✓ / ✗
2. Hooks 実行権限     ✓ / ✗
3. Frontmatter        ✓ / ✗
4. Behavior.toml      ✓ / ✗
5. INDEX 整合性       ✓ / ✗
6. テンプレート同期   ✓ / ✗
```
