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
- `src/components/ParticipantList.vue`
- `src/components/NavBar.vue`
- `src/components/MemoEditor.vue`
