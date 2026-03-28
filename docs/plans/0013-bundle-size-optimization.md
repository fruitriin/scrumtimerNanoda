# 計画: バンドルサイズ最適化

## 動機

Tiptap 追加でメインチャンクが 560KB を超え、Vite のチャンクサイズ警告が出ている。
初回ロード時間に影響するため、コード分割で改善する。

## 対象

### Tiptap の動的インポート

- MemoEditor.vue を `defineAsyncComponent` で遅延ロード
- メモ機能を使わないユーザーは Tiptap をダウンロードしない

### DOMPurify の動的インポート

- PublicMemoList.vue でのみ使用、必要時にロード

## 完了条件

- メインチャンクが 500KB 未満
- チャンクサイズ警告が消える
- 初回表示（タイマー画面）に Tiptap がロードされない

## 影響範囲

- `src/components/TimerView.vue`（動的 import に変更）
- `src/components/MemoEditor.vue`
- `src/components/PublicMemoList.vue`
