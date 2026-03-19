# Process Feedback

開発プロセスの振り返りと改善を記録する。

## 記録方法

タスク完了時や問題発生時に、以下のいずれかのセクションに追記する。

## オーナーフィードバック

## 問題の記録

- このリポジトリ自体がADDフレームワーク本体のため、`addf-contribution-agent` の検出結果（アップストリームコントリビューション候補）はそのまま自身に適用済み。フレームワーク本体での `addf-contribution-agent` の有用性は限定的
- `doneParticipants` を localStorage に保存していなかったため、タイマー中のリロードで参加者が消失するバグがあった。全リスト（participants, done, absent）をまとめて保存するよう修正済み
- `deploy` スクリプトで `$OLDPWD` が `cd` で上書きされる問題があった。`$PWD` を事前保存して回避
- GitHub Pages の Deploy from Branch は `/docs` か `/` しか選べない。`docs/` には既存ファイルがあるため `gh-pages` orphan ブランチ方式を採用
- `vp check` はプロジェクト全体を対象にする。`docs/` 等の非ソースファイルを含むため、`lint` スクリプトは `vp check src/` でスコープを限定した
- oxlint (Vite+組込み) は `baseUrl` + `paths` を非推奨としており、`@/` パスエイリアスが使えない。相対パスに統一した
- `npm create vite` は `vp create vite -- --template vue-ts` で代替可能だが、既存ディレクトリに直接生成できないため `/tmp` に生成して rsync する回り道が必要だった

## 改善アクション

- ADD フレームワーク開発の計画は `docs/plans-add/`、knowhow index は `INDEX.addf.md` で管理する（`docs/plans/` と `INDEX.md` はダウンストリームプロジェクト用）
- CLAUDE.md はダウンストリームテンプレートとして汎用性を保つこと。ADDF 固有の参照（TODO.addf.md 等）は CLAUDE.repo.md に置く（Plan 0008 で発見・修正済み）
- `/dev-loop` スキルのブートシーケンスが `TODO.md` を参照するが、ADDF 本体では `docs/plans-add/TODO.addf.md` が正。`/addf-dev-loop` 側は CLAUDE.md のブートシーケンスに従うので問題ないが、汎用 `/dev-loop` 使用時は注意

## 完了済み

- ~~Plan 0004 実施時に `add-Behavier.toml` を `addf-Behavior.toml` にリネームする~~ → Plan 0004 で実施済み
