# Plan 0011: Lint エラー全解消

## 目的

`vp check src/` で報告されるすべての lint / type エラーをゼロにし、CI やローカル品質ゲートをクリーンに保つ。

## 現状

`vp check src/` の出力:

| 種別 | ファイル | 内容 |
|---|---|---|
| error (TS6133) | `src/composables/useRoom.ts:33` | `lastSyncState` が宣言されているが読み取られていない |
| warning (no-unused-vars) | 同上 | 同変数が未使用 |

## 対応方針

1. `lastSyncState` の用途を確認する
   - ホストマイグレーション時に前回の同期状態を保持する意図で導入されたが、現在は `becomeHost()` 内で参照されていない
   - **選択肢 A**: マイグレーション時に `lastSyncState` を活用するコードを追加する（本来の意図を復元）
   - **選択肢 B**: 不要なら変数自体を削除する
2. `vp check src/` でエラー・警告ゼロを確認する
3. `vp build && vp test run` で回帰がないことを確認する

## 完了条件

- `vp check src/` がエラー 0・警告 0 で通過する
- ビルド・テストが通過する

## 実装結果

- **選択肢 B（削除）** を採用: `lastSyncState` は宣言・代入のみで読み取りが一切なく、`becomeHost()` 時に状態は `applyState()` 経由で既に UI に反映済みのため不要
- 4箇所を削除・修正し、`vp check src/` エラー 0・警告 0 を達成
- 完了日: 2026-03-28
