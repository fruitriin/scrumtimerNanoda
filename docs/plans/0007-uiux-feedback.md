# 計画: UI/UX フィードバック対応

## 動機

オーナーからの UI/UX 改善フィードバック 4 件を対応する。

## フィードバック内容

### 1. イニシャル廃止
- Participant モデルから `init` フィールドを削除
- 参加者追加フォームからイニシャル入力欄を削除
- 表示を名前のみに変更

### 2. 並び順をドラッグ＆ドロップで管理
- イニシャルでのソートを廃止
- 配列の順序がそのまま発表順
- ドラッグ＆ドロップで並び替え可能にする（HTML5 Drag and Drop API）
- シャッフルは残す

### 3. 全体進捗を 1 サイクル早める
- 現在: 1人完了してからプログレスが進む
- 改善: 現在発表中の人も「完了予定」としてカウントする
  - 例: 5人中、2人完了 + 1人発表中 → 3/5 = 60%（現在は 2/5 = 40%）
- これにより「自分の出番が終わったら全体がどこまで進むか」が分かり、
  押し/巻きの判断ができる

### 4. 最後の参加者で「次へ」→ ストップ
- 現在: `next()` で `participants.length <= 1` のとき `stop()` を呼ぶ（実装済み）
- 確認: 既に実装されているが、動作を検証する

## 影響範囲

- `src/types/index.ts` — Participant から `init` 削除
- `src/models/Participant.ts` — createParticipant から `init` 引数削除
- `src/composables/useParticipants.ts` — sort 削除、import/export 調整
- `src/composables/useTimer.ts` — totalPercent 計算変更
- `src/components/TimerView.vue` — init 表示削除、totalPercent 変更反映
- `src/components/ParticipantList.vue` — init 入力欄削除、D&D 追加
- `src/types/room.ts` — SyncState 型は Participant 型に追従
- テスト更新
