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

- `src/utils/safeStorage.ts`（新規）
- `src/composables/useRoom.ts`
- `src/composables/useMemo.ts`
- `src/composables/useParticipants.ts`
- `src/composables/useSettings.ts`
- `src/composables/useAudio.ts`
- `src/components/AudioPanel.vue`
- `src/components/TimerView.vue`

## 実装結果

- safeStorage: localStorage quota exceeded 対応の共通ラッパー（Firefox NS_ERROR_DOM_QUOTA_REACHED 対応含む）
- useRoom: 再接続中の errorMessage クリア
- useMemo/useParticipants/useSettings: safeSetItem で quota 対応
- useAudio: NotAllowedError 検知 + UI 通知 + dismiss 時の autoplayBlocked リセット
- AudioPanel: 音声再生エラー通知（role="alert"）
- TimerView: ストレージエラー通知（role="alert"）
- 完了日: 2026-03-28

### レビュー記録（Suggestion）
- S-6: storageError の表示を App.vue に一元化する検討
- S-5: safeSetItem の戻り値は void に変更済み
