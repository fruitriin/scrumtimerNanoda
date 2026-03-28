# 計画: エラーハンドリング強化

## 動機

WebRTC 切断時のエラーメッセージと再接続状態が混在して UX が分かりにくい。
localStorage の容量超過、音声再生失敗など、エラーが無視されるケースがある。

## 対象

### WebRTC 切断時の UX 改善

- 再接続中はエラーメッセージをクリアし「再接続中...」のみ表示
- マイグレーション中も同様に状態を明確化
- 再接続失敗時のローカルモード自動フォールバック通知

### localStorage quota 対応

- useMemo / useParticipants / useSettings で quota exceeded をキャッチ
- ユーザーに「ストレージ容量不足」をトースト通知

### 音声再生エラー通知

- useAudio で再生失敗時にコンソール警告ではなく UI 通知
- オートプレイポリシーでブロックされた場合の案内

## 影響範囲

- `src/composables/useRoom.ts`
- `src/composables/useMemo.ts`
- `src/composables/useAudio.ts`
- `src/components/RoomPanel.vue`
