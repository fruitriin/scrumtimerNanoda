# 計画: GitHub Pages デプロイ要件の整備

## 動機

GitHub Pages でアプリを公開するための要件を満たす。
最もシンプルな **Deploy from Branch** 方式を採用し、ビルド結果をリポジトリにコミットする。

## 設計判断: Deploy from Branch を選択

| 観点 | Deploy from Branch | GitHub Actions |
|---|---|---|
| シンプルさ | ✅ 設定最小限 | ❌ workflow + Pages 設定 |
| 即座に動く | ✅ push すれば公開 | ❌ 設定手順が多い |
| ビルド忘れ | ⚠️ AI がビルド→コミットするので低リスク | ✅ 自動 |
| リポジトリサイズ | ⚠️ dist/ が履歴に残る | ✅ クリーン |

AI 主導の開発ではビルド忘れリスクが低く、Actions の設定で躓くリスクを排除できるため
Deploy from Branch が合理的。

## 作業内容

### 1. deploy.yml の削除
- GitHub Actions ワークフローは不要になるため削除する

### 2. .gitignore の修正
- `dist` を .gitignore から除外する（ビルド成果物をコミット対象にする）

### 3. ビルド実行
- `vp build` でプロダクションビルドを生成する

### 4. ビルド成果物をコミット
- `dist/` をステージングしてコミットする

### 5. push して GitHub Pages を有効化
- `gh api` で GitHub Pages を Deploy from Branch（main ブランチ、/docs または / ルート）で有効化
- `dist/` が Pages のルートになるよう設定

### 6. 動作確認
- `https://fruitriin.github.io/scrumtimerNanoda/` にアクセスして表示を確認

## 注意点

- `vite.config.ts` の `base: "/scrumtimerNanoda/"` はリポジトリ名と一致 ✅
- ビルド後のコミットは品質ゲート通過後に行う
- 以降のリリース時も `vp build` → `dist/` コミット → push の手順を踏む

## 影響範囲

- `.github/workflows/deploy.yml`（削除）
- `vite.config.ts`（変更なし — base パスは既に正しい）
- `package.json`（deploy スクリプト追加）
- GitHub Pages 設定（gh-pages ブランチ、/ ルート）

## 実装状況: 完了 (2026-03-19)

### 実装内容
- deploy.yml 削除（GitHub Actions 不使用）
- gh-pages orphan ブランチにビルド結果を push
- GitHub Pages を Deploy from Branch（gh-pages, /）で有効化
- `pnpm run deploy` スクリプト追加
- URL: https://fruitriin.github.io/scrumtimerNanoda/

### 設計変更
- 当初 `/docs` パスを検討したが、`docs/` に既存ファイル（plans, knowhow, reference）があるため gh-pages ブランチ方式に変更
