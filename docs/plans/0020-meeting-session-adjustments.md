# 計画: 0020 — ミーティング画面の一時調整 + シャッフル位置づけ整理 + D&D 並び替え

## 動機

Plan 0019 でプリセット概念を導入後、ミーティング画面（`TimerView`）で **「この回限定の調整」** を可能にする。

1. **その回限定の参加者足し引き / 時間調整**: プリセットを起動した後、欠席が多いから人を抜きたい、今回だけ 30 分で済ませたい等のケース。プリセット本体には影響を与えない
2. **シャッフルの位置づけ整理**: シャッフルは「タイマー開始前の準備時間に発表順をランダムにする」操作。タイマー中の並び替えは「シャッフル」ではなく意図を持った操作なので、ドラッグ&ドロップで行う
3. **タイマー中の D&D 並び替え**: 現発表者は固定、待機列の中で発表順を変更可能

### 既存実装の課題

- `useParticipants.addTemporary()` / `removeTemporary()` は既にセッション一時操作として実装済みだが、永続化はされない
- `globalMaxTime` の一時 override は機構がない（変更すると即プリセット側へ影響）
- シャッフルボタンはタイマー中も有効になっており、誤押下で発表順が変わる事故が起き得る
- 並び替えの手段がシャッフル（ランダム）のみで、意図的並び替えができない

---

## 設計

### 1. useMeetingSession composable

セッション状態を集約する新規 composable:

```ts
// src/composables/useMeetingSession.ts
export function useMeetingSession() {
  const { activePreset } = usePresets();

  // セッション中の一時 overrides (プリセット非破壊)
  const sessionOverrides: Ref<{
    participants?: Participant[]; // 足し引き後の参加者リスト
    globalMaxTime?: number;       // 全体時間 override
  }>;

  // 進行状態（タイマー中のみ存在）
  const doneParticipants: Ref<Participant[]>;
  const absentParticipants: Ref<Participant[]>;

  // 実効値（override or プリセット値）
  const effectiveParticipants = computed(() => sessionOverrides.value.participants ?? activePreset.value.participants);
  const effectiveGlobalMaxTime = computed(() => sessionOverrides.value.globalMaxTime ?? activePreset.value.globalMaxTime);

  // 操作
  function addTemporary(name: string): void;
  function removeTemporary(id: string): void;
  function overrideGlobalMaxTime(seconds: number): void;
  function clearOverrides(): void; // 「会の終了」時に呼ぶ
  function reorderParticipants(from: number, to: number): void; // D&D 用

  // ...
}
```

### 2. 永続化方針

**sessionStorage** に保存（リロード時保持、タブ閉じたら消失）:
- キー: `scrumtimer-meeting-session`
- 内容: `{ presetId, sessionOverrides, doneParticipants, absentParticipants }`

`activePreset.id` が変わったら（プリセット切替）、セッションをクリアする。

### 3. UI 変更: 参加者足し引き

既存の TimerView 内の参加者リスト UI を流用:
- 「参加者を追加」フォーム（既存）→ `useMeetingSession.addTemporary()` 経由
- 各参加者の「✕ この回から削除」ボタン（既存）→ `useMeetingSession.removeTemporary()` 経由

これらは現状でも UI として存在するので、内部の呼び出し先を `useMeetingSession` に変更するだけ。

### 4. UI 変更: 全体時間の一時 override

タイマー画面トップに **アクティブプリセット名 + 全体時間** を表示し、時間部分をクリックして編集可能にする:

```
[ デイリースクラム ] 全体時間: 15分 ✎  [ override 中: 30分 ⟲リセット ]
```

- クリック → 数値入力（分単位）
- override 中はバッジ表示 + 「⟲ プリセット値に戻す」リンク

### 5. シャッフル位置づけ整理

| 状態 | シャッフルボタン |
|---|---|
| 停止中（タイマー開始前） | 有効（既存通り） |
| 一時停止中 | **無効**（意図的並び替えは D&D で行う） |
| 動作中 | **無効**（既存は有効だった、要件変更） |

ボタンは表示は残し `disabled` 状態にする（操作不能と認知させる）。

### 6. D&D 並び替え

実装ライブラリ: **`@vueuse/integrations` の `useSortable`**（軽量、SortableJS ベース）。
代替案: `vuedraggable` (Vue 3 対応、やや古い)、自前実装（HTML5 Drag and Drop API）。

→ `useSortable` を採用（依存追加が最小、TypeScript 対応）。

```vue
<script setup>
import { useSortable } from "@vueuse/integrations/useSortable";
const listRef = ref<HTMLElement | null>(null);
const { ... } = useSortable(listRef, effectiveParticipants, {
  animation: 150,
  filter: ".drag-disabled", // 現発表者を固定
  onUpdate: (e) => {
    if (isRunning.value && e.oldIndex === 0) return; // 現発表者は移動不可
    reorderParticipants(e.oldIndex, e.newIndex);
  },
});
</script>
```

**ルール**:
- タイマー動作中: 現発表者（先頭）は移動不可。待機列の 2 番目以降のみ並び替え可能
- 一時停止中: 同上
- 停止中: 全員並び替え可能（シャッフルとは別の意図的並び替え）

### 7. ルーム同期との整合

`useMeetingSession` の `sessionOverrides` / `doneParticipants` / `absentParticipants` を `SyncState` に含めるよう拡張:

```ts
// src/types/room.ts (拡張)
export type SyncState = {
  // ... 既存
  presetId: string;
  sessionOverrides: { participants?: Participant[]; globalMaxTime?: number };
  // doneParticipants, absentParticipants は既存
};
```

新規 TimerAction:
- `{ kind: "addTemporary"; name: string }` → 既存 `addParticipant` をリネーム
- `{ kind: "removeTemporary"; participantId: string }` → 既存 `removeParticipant` をリネーム
- `{ kind: "overrideGlobalMaxTime"; seconds: number }`
- `{ kind: "clearOverrides" }`
- `{ kind: "reorderParticipants"; from: number; to: number }`

既存の `addParticipant` / `removeParticipant` は内部互換のため残す（リネームは型定義の見やすさ重視）。

---

## チェックリスト

### Phase 1: useMeetingSession

- [ ] 1.1 `src/composables/useMeetingSession.ts` — overrides + 進行状態管理 + sessionStorage 永続化
- [ ] 1.2 `src/composables/useMeetingSession.test.ts` — 一時操作、プリセット切替時のクリア、永続化のテスト

### Phase 2: TimerView の呼び出し先変更

- [ ] 2.1 `src/components/TimerView.vue` — `addTemporary` / `removeTemporary` の呼び出しを `useMeetingSession` 経由に
- [ ] 2.2 `src/components/TimerView.vue` — タイマー画面トップに「プリセット名 + 全体時間（編集可能）」表示追加
- [ ] 2.3 `src/components/TimerView.vue` — 全体時間 override の数値入力 UI（小さいモーダル or インライン）

### Phase 3: シャッフル整理

- [ ] 3.1 `src/components/TimerView.vue` — シャッフルボタンを `isRunning || isPaused` で disabled にする
- [ ] 3.2 ボタンの `title` から「タイマー中は使えない」相当の説明テキストを併記（軸 B: title 単独に頼らない）

### Phase 4: D&D 並び替え

- [ ] 4.1 `pnpm add @vueuse/integrations sortablejs` — 依存追加
- [ ] 4.2 `src/components/TimerView.vue` — 参加者リストに `useSortable` を組み込み
- [ ] 4.3 `src/components/TimerView.vue` — タイマー動作中の現発表者は移動不可とする CSS / filter 設定
- [ ] 4.4 `src/composables/useMeetingSession.ts` — `reorderParticipants(from, to)` 実装

### Phase 5: ルーム同期

- [ ] 5.1 `src/types/room.ts` — `SyncState` に `presetId` / `sessionOverrides` 追加。`TimerAction` に新規アクション追加
- [ ] 5.2 `src/composables/useRoom.ts` — `executeAction` に新規アクション 3 種（override / clearOverrides / reorder）を追加
- [ ] 5.3 `src/composables/useRoom.test.ts` — 同期テスト追加

### Phase 6: E2E

- [ ] 6.1 `e2e/meeting-session.spec.ts` — プリセット起動 → 一時参加者追加 → 全体時間 override → 会の終了 → プリセット側未変更を確認
- [ ] 6.2 `e2e/dnd-reorder.spec.ts` — D&D 並び替えのテスト（待機列の入れ替え、動作中の現発表者固定）

### Phase 7: 検証

- [ ] 7.1 `vp build` / `vp check src/` / `vp test run` / `pnpm run test:e2e` 全通過
- [ ] 7.2 Playwright MCP で目視確認: シャッフル位置づけ・D&D 動作・override の即時反映

---

## 対象ファイル

| ファイル | 変更種別 |
|---|---|
| `src/composables/useMeetingSession.ts` | 新規 |
| `src/composables/useMeetingSession.test.ts` | 新規 |
| `src/components/TimerView.vue` | 改修: 呼び出し先変更、override UI、シャッフル disable、D&D 統合 |
| `src/types/room.ts` | 拡張: SyncState / TimerAction |
| `src/composables/useRoom.ts` | 拡張: 新規アクション対応 |
| `src/composables/useRoom.test.ts` | 拡張 |
| `package.json` | 依存追加: `@vueuse/integrations`, `sortablejs` |
| `e2e/meeting-session.spec.ts` | 新規 |
| `e2e/dnd-reorder.spec.ts` | 新規 |

---

## 注意事項

- **Plan 0019 完了が前提**: 本計画は `usePresets().activePreset` を参照するため、Plan 0019 のプリセット基盤が必須
- **Plan 0017 との競合**: 0017 で `TimerView.vue` を大きく改修するため、0017 → 0019 → 0020 の順で進める
- **sessionStorage の容量**: 一般的に 5MB 程度なので参加者数が数十人でも問題なし
- **D&D のタッチ対応**: SortableJS はタッチイベント標準対応。モバイル動作確認を E2E に含める
- **GUI 操作体験 (CLAUDE.repo.md 参照)**: D&D 中のフィードバック（カーソル変化・ドロップゾーンのハイライト）は必ず実装。並び替え不可の要素には視覚的に「動かせない」ことを示すスタイル（薄いオーバーレイ等）を付与
- **アクション名の整理**: `addParticipant` / `removeParticipant` は誤解を招く名前（プリセット側の操作と混同しやすい）。`addTemporary` / `removeTemporary` にリネームすると意図が明確になる。後方互換のため旧名は残す
- **「会の終了」との関係**: Plan 0017 で導入する `end` アクションが呼ばれたら、`useMeetingSession.clearOverrides()` も呼んで一時状態を完全リセットする
- **プリセット側の編集と並び替え**: プリセット編集画面 (`PresetEditView`) でのメンバー並び替えも D&D で行えるようにすると UX 統一感が出る。本計画では TimerView のみ対応とし、PresetEditView の D&D は Plan 0019 のスコープに含めるか別途検討
