# 計画: アクセシビリティ & レスポンシブ改善

## 動機

ARIA 属性がほぼ未実装、タッチターゲットが小さい、モバイル表示の最適化が不足。
WCAG 2.1 AA レベルの基本要件を満たすことで、より多くのユーザーが使えるようにする。

## 対象

### アクセシビリティ

- プログレスバーに `role="progressbar"` + `aria-valuenow` / `aria-valuemin` / `aria-valuemax` / `aria-label`
- ボタンに `aria-label`（アイコンのみのボタン、特に AudioPanel、TimerView の不在/削除ボタン）
- フォームの入力欄に `aria-label`
- RoomPanel のステータス表示に `role="status"` / `role="alert"`
- NavBar のナビゲーションに `role="navigation"` / `aria-label`

### レスポンシブ

- タッチターゲットサイズを最低 44x44px に（`min-w-[44px] min-h-[44px]`）
- モバイル向け padding 調整（`p-2 sm:p-4`）
- NavBar のモバイル表示（ハンバーガーメニュー or スクロール可能）

## 影響範囲

- `src/components/TimerView.vue`
- `src/components/AudioPanel.vue`
- `src/components/RoomPanel.vue`
- `src/components/NavBar.vue`

## 実装結果

- プログレスバー3箇所に role="progressbar" + aria-valuenow/valuemin/valuemax/label/valuetext
- アイコンボタンに動的 aria-label（参加者名入り）
- AudioPanel: ミュート・音量・テストボタンに aria-label、タッチターゲット拡大
- RoomPanel: role="status"、role="alert"、aria-label、aria-hidden
- NavBar: aria-label="メインナビゲーション"、横スクロール＋スクロールバー非表示、min-h-44px
- モバイル padding 調整（p-2 sm:p-4）
- 完了日: 2026-03-28

### レビュー記録（Suggestion）
- S-1: タイマーボタンの絵文字を aria-hidden にする検討
- S-4: タッチターゲット 28px→44px の完全対応（バッジ内レイアウト調整が必要）
