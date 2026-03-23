# 計画: テストカバレッジ改善

## 動機

音声再生（useAudio）、タイマーのゲスト同期（applyTimerState）、
マスター/セッション分離後の参加者管理など、新機能にテストが追いていない。

## 対象

### 優先度高

#### useAudio テスト新規作成
- HTMLAudioElement をモックし、play() が正しいトラックで呼ばれるか検証
- 音量・ミュート設定変更が全トラックに反映されるか検証
- TRACK_NAMES にないトラック名でエラーにならないか

#### useTimer.applyTimerState テスト追加
- startedAt を渡して isRunning / currentElapsed が正しくセットされるか
- 既存の interval が停止されて新しい interval が開始されるか
- isRunning: false のとき interval が開始されないか

### 優先度中

#### useParticipants マスター分離テスト
- masterParticipants への add/remove が participants（セッション）に反映されるか
- resetAll() がマスターから再コピーされるか
- セッション中の done/absent が localStorage に書き込まれないか

#### useSettings.alerts テスト
- alerts のデフォルト値が全て true か
- updateSettings で個別に ON/OFF できるか

## 影響範囲

- `src/composables/useAudio.test.ts`（新規）
- `src/composables/useTimer.test.ts`（追加）
- `src/composables/useParticipants.test.ts`（追加）
- `src/composables/useSettings.test.ts`（追加）
