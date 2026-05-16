# Process Feedback

開発プロセスの振り返りと改善を記録する。

## 記録方法

タスク完了時や問題発生時に、以下のいずれかのセクションに追記する。

## オーナーフィードバック

- **アクセシビリティ方針 (2026-05-16)**: メインターゲットはネイティブブラウザでマウス/タッチ操作するユーザー。何を一級に置くかを以下の2軸で判断する:

  **軸 A: キーボード操作性は全員に価値のある快適さ要件**
  - Tab で巡回・Enter/Space で実行・Esc で閉じる、フォーカスリングが見える、はマウス/タッチ操作者にも便益がある
  - キーボード操作を阻害する実装（`outline-none` 単体など）は除去または `focus-visible:ring-*` で復元する
  - 確認ダイアログは `window.confirm()` or ネイティブ `<dialog>` で、フォーカス管理・Esc キャンセルを自動取得する
  - キーボードショートカット（Space=スタート/一時停止 等）を積極的に提供してよい

  **軸 B: 情報伝達経路は「ユーザーが気づくか」で判定する**
  - `title` 属性ツールチップは表示まで約 2 秒の遅延があり、存在に気づかれない = 無いのと同じ
  - アイコンのみボタンを `title` だけで意味伝達するのはネイティブ体験の致命的な損失。視覚テキスト併記やアイコン+短文化で代替する
  - aria-label は読み上げ補助としては残置可能だが、視覚的意味伝達の主役にはしない
  - 装飾的な aria-* / role（progressbar の valuenow 等）は害がない範囲で残置

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
