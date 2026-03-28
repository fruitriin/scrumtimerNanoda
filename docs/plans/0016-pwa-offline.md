# 計画: PWA オフライン対応

## 動機

デイリースクラムタイマーはチームのルーティンツールであり、ネットワーク不安定な環境でも使えるべき。
PWA 化することで、オフラインでもスタンドアロンモードのタイマーが動作し、ホーム画面に追加できる。

## 対象

### Service Worker

- Vite PWA プラグイン (`vite-plugin-pwa`) を導入
- キャッシュ戦略: 静的アセット（JS/CSS/WAV）は CacheFirst、API は NetworkFirst
- オフライン時のフォールバック: スタンドアロンモードで動作（WebRTC はオンライン時のみ）

### Web App Manifest

- `manifest.webmanifest` の作成
- アイコン（192x192, 512x512）
- テーマカラー: emerald-600
- display: standalone

### オフライン UX

- オフライン検知バナー（navigator.onLine）
- WebRTC ルーム機能の無効化表示
- localStorage のメモ・参加者・設定はオフラインでも利用可能

## 完了条件

- Lighthouse PWA スコアが合格
- オフラインでスタンドアロンタイマーが動作する
- ホーム画面に追加できる

## 影響範囲

- `vite.config.ts`（PWA プラグイン追加）
- `public/` に manifest とアイコン追加
- `src/components/` にオフラインバナー追加
