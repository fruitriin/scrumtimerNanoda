# 計画: 0021 — フェーズモード（フェーズベース時間配分タイマー）

## 動機

現状のタイマーは **ロールコールモード**（参加者ごとに均等な持ち時間で順番に発表）に最適化されている。
デイリースクラムには最適だが、一般的な会議には合わない。

一般的な 1 時間会議では、以下のような **フェーズベース傾斜配分** が良いとされる:

| フェーズ | 持ち時間 |
|---|---|
| 発散 | 20 分 |
| 深掘り | 20 分 |
| まとめと決定 | 10 分 |
| 持ち帰りと次回への申し送り | 10 分 |

これを **「フェーズモード」** プリセットとして実現する。
発表者という概念は無くなり、フェーズの進行が主軸となる（参加者は全員、共通の進行を見る）。

### 関連 Plan

- **Plan 0019**: プリセット基盤。`Preset.type = "phase"` と `segments?: Segment[]` を本計画で活用する
- **Plan 0020**: ミーティング画面の一時調整。フェーズ時間の override も同じ機構に乗せる

---

## 設計

### 1. データモデル（Plan 0019 で先行定義済み）

```ts
export type Preset = {
  // ... 既存
  type: "rollcall" | "phase";
  segments?: Segment[]; // type="phase" のとき必須
};

export type Segment = {
  id: string;
  name: string;     // 例: "発散"
  minutes: number;  // 持ち時間（分）
};
```

サンプルプリセット:

```ts
const meetingPreset: Preset = {
  id: "...",
  name: "週次会議 (1時間)",
  type: "phase",
  participants: [], // フェーズモードでは未使用 or 参考表示のみ
  globalMaxTime: 3600,
  useGlobalMaxTime: true,
  segments: [
    { id: "...", name: "発散", minutes: 20 },
    { id: "...", name: "深掘り", minutes: 20 },
    { id: "...", name: "まとめと決定", minutes: 10 },
    { id: "...", name: "持ち帰りと次回への申し送り", minutes: 10 },
  ],
  alerts: { ... },
  volume: 0.5,
  muted: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
```

### 2. useTimer のフェーズモード対応

既存の useTimer をモード対応にする:

```ts
export function useTimer() {
  const { activePreset } = usePresets();
  const isPhaseMode = computed(() => activePreset.value.type === "phase");

  // ロールコールモード（既存）
  const currentParticipant = computed(() => ... );

  // フェーズモード（新規）
  const currentSegmentIndex = ref(0);
  const currentSegment = computed(() => {
    if (!isPhaseMode.value) return null;
    return activePreset.value.segments?.[currentSegmentIndex.value] ?? null;
  });

  // 個別最大時間: モードで分岐
  const individualMaxTime = computed(() => {
    if (isPhaseMode.value) {
      return (currentSegment.value?.minutes ?? 0) * 60;
    }
    // 既存のロールコールロジック
    return ... ;
  });

  function next() {
    if (isPhaseMode.value) {
      // 次のフェーズへ
      if (currentSegmentIndex.value < segments.length - 1) {
        currentSegmentIndex.value++;
        startedAt = Date.now();
        currentElapsed.value = 0;
        resetAudioFlags();
      } else {
        stop(); // 最終フェーズ完了
      }
    } else {
      // 既存のロールコールロジック
    }
  }

  // prev / pause / resume / reset も同様にモード分岐
}
```

### 3. TimerView のフェーズモード表示

`isPhaseMode` で UI を切り替え:

**ロールコールモード（既存）**:
- 現発表者名表示
- 参加者リスト（done/waiting/absent）
- 「次へ」「一時停止」「前へ」「シャッフル」「会の終了」

**フェーズモード（新規）**:
- 現フェーズ名表示（大きく）
- フェーズ一覧（完了 / 進行中 / 待機）
- 「次のフェーズへ」「一時停止」「前のフェーズへ」「会の終了」
- シャッフル / D&D は無し（フェーズ順は固定）
- 全体時間 + 全体進捗バー（既存）+ フェーズ別進捗バー（新規）

実装方針: `TimerView.vue` を維持しつつ、内部で `<RollcallTimerPanel />` / `<PhaseTimerPanel />` をモードで切り替える。

### 4. プリセット編集画面でのフェーズ編集

`PresetEditView.vue` に「タイプ」選択ラジオ追加:
- ロールコール（参加者ベース）
- フェーズ（時間配分ベース）

「フェーズ」選択時のみ表示:
- フェーズ一覧（D&D で順序変更）
- 各フェーズ: 名前 + 分数
- 「フェーズを追加」ボタン

### 5. 比率変換ボタン（余談機能）

「フェーズ編集画面で globalMaxTime を変えると、比率を維持して各 segment.minutes を再計算する」ボタン:

```
[ 現在: 発散20分 + 深掘り20分 + まとめ10分 + 持ち帰り10分 = 60分 ]
全体時間: [ 90 ] 分  [ 比率を維持して再配分 ]
                      ↓ クリック
[ 新: 発散30分 + 深掘り30分 + まとめ15分 + 持ち帰り15分 = 90分 ]
```

実装:

```ts
function redistributeByRatio(newTotalMinutes: number) {
  const currentTotal = segments.reduce((sum, s) => sum + s.minutes, 0);
  if (currentTotal === 0) return;
  segments.forEach((s) => {
    s.minutes = Math.round((s.minutes / currentTotal) * newTotalMinutes);
  });
}
```

注: 整数化の誤差で合計が ±1 分ズレる可能性があるので、最後のフェーズで補正する。

### 6. ルーム同期

`SyncState` の拡張は Plan 0020 で済んでいる前提（`presetId` を含む）。
本計画では `currentSegmentIndex` を追加:

```ts
export type SyncState = {
  // ... 既存 (Plan 0020 後)
  currentSegmentIndex?: number; // フェーズモード時のみ
};
```

`TimerAction` の `next` / `prev` はモードによってホスト側で振る舞いが分岐する（型は同じ）。

---

## チェックリスト

### Phase 1: useTimer 拡張

- [ ] 1.1 `src/composables/useTimer.ts` — `isPhaseMode` / `currentSegment` / `currentSegmentIndex` 追加
- [ ] 1.2 `src/composables/useTimer.ts` — `individualMaxTime` のモード分岐
- [ ] 1.3 `src/composables/useTimer.ts` — `next()` / `prev()` のモード分岐（フェーズ進行）
- [ ] 1.4 `src/composables/useTimer.test.ts` — フェーズモードのユニットテスト

### Phase 2: TimerView 分割

- [ ] 2.1 `src/components/RollcallTimerPanel.vue` — 既存 TimerView の本体（ロールコールモード用）を分離
- [ ] 2.2 `src/components/PhaseTimerPanel.vue` — フェーズモード UI を新規実装
- [ ] 2.3 `src/components/TimerView.vue` — モードによって 2 パネルを切り替えるコンテナ化

### Phase 3: プリセット編集画面のフェーズ対応

- [ ] 3.1 `src/components/PresetEditView.vue` — type 選択ラジオ追加
- [ ] 3.2 `src/components/PresetEditView.vue` — フェーズ一覧の編集 UI（追加 / 削除 / 並び替え / 名前 + 分数）
- [ ] 3.3 `src/components/PresetEditView.vue` — 比率変換ボタン実装（余談機能）

### Phase 4: ルーム同期

- [ ] 4.1 `src/types/room.ts` — `SyncState.currentSegmentIndex` 追加
- [ ] 4.2 `src/composables/useRoom.ts` — `broadcastState` / `applyTimerState` でフェーズ状態を扱う

### Phase 5: テスト

- [ ] 5.1 `src/components/PhaseTimerPanel.test.ts` — レンダリング + フェーズ進行のテスト
- [ ] 5.2 `e2e/phase-mode.spec.ts` — フェーズプリセット作成 → タイマー実行 → フェーズ遷移を検証

### Phase 6: 検証

- [ ] 6.1 `vp build` / `vp check src/` / `vp test run` / `pnpm run test:e2e` 全通過
- [ ] 6.2 Playwright MCP で目視確認: フェーズ遷移 / 比率変換 / ロールコールとの併存

---

## 対象ファイル

| ファイル | 変更種別 |
|---|---|
| `src/composables/useTimer.ts` | 拡張: フェーズモード分岐 |
| `src/composables/useTimer.test.ts` | 拡張 |
| `src/components/TimerView.vue` | 改修: 2 パネルへの分割コンテナ化 |
| `src/components/RollcallTimerPanel.vue` | 新規: 既存ロジックの抽出 |
| `src/components/PhaseTimerPanel.vue` | 新規: フェーズモード UI |
| `src/components/PhaseTimerPanel.test.ts` | 新規 |
| `src/components/PresetEditView.vue` | 拡張: フェーズ編集 + 比率変換ボタン |
| `src/types/room.ts` | 拡張: currentSegmentIndex |
| `src/composables/useRoom.ts` | 拡張: フェーズ状態同期 |
| `e2e/phase-mode.spec.ts` | 新規 |

---

## 注意事項

- **Plan 0019 / 0020 完了が前提**: プリセット基盤 + ミーティングセッション機構が動いていること
- **モード切替の制約**: アクティブプリセットの type を実行中に変えるのは禁止（タイマー停止中のみ可）
- **フェーズモードのシャッフル/D&D**: フェーズ順は意味的な順序があるので、シャッフルは無効、編集画面の D&D のみ
- **音声アラート**: フェーズモードでもアラート（残り 30 秒、超過 10/30 秒）は同じロジックで動作。閾値は秒固定なので短いフェーズ（5 分等）でも違和感ない
- **比率変換の丸め誤差**: `Math.round` の累積で合計がズレる。最後のフェーズで差分を吸収するか、`Math.floor` + 余りを順番に +1 する
- **「参加者」の扱い**: フェーズモードでも `participants` を保持する（プリセット切替時に参加者リストを引き継げる + 表示が必要なら使える）
- **拡張余地**: 将来「フェーズごとに発表者ロールコールを行う」ハイブリッドモードもあり得るが、本計画では実装しない
- **GUI 操作体験 (CLAUDE.repo.md 参照)**: フェーズ名は大きく見やすく表示。残り時間 + フェーズ名 + 全体進捗 が一目で分かるレイアウトを優先
- **比率変換ボタン UX**: クリック前に「変更前 → 変更後」のプレビューを表示してから確定する流れにすると、意図しない再分配を防げる
