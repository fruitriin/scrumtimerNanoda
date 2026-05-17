# 計画: 0019 — プリセット基盤の導入

## 動機

現状、メンバーリスト (`useParticipants`) と設定 (`useSettings`) は単一のグローバル状態として localStorage に保存される。
同じメンバーで異なる用途（デイリースクラム 15 分 / 週次振り返り 1 時間 / 週次会議 1 時間 等）を使い分けたいとき、
毎回手動で `globalMaxTime` を変更する必要がある。

これを **「プリセット」** として名前付きで保存し、用途別に切り替えられるようにする。

### スコープ

- メンバーリスト + 全体時間設定 + VoiceVox アラート設定 をひとまとめにした「プリセット」概念
- 複数プリセットの CRUD + 一覧画面 + 編集画面
- 既存データを「デフォルト」プリセットとして自動移行
- 既存の `useParticipants` / `useSettings` を「アクティブなプリセット」のラッパーに置き換え

### 関連 Plan (将来)

- **Plan 0020**: ミーティング画面でプリセットを起動した後の「この回限定の調整」（シャッフル整理 + D&D 並び替えを含む）
- **Plan 0021**: プリセットに `segments` を持たせるフェーズモード（発散→深掘り→まとめ→持ち帰り 等）

データモデルだけは Plan 0020 / 0021 を見越して **本計画で先に設計**する（後から型を増やすコストを避ける）。

---

## 設計

### 1. Preset 型

```ts
// src/types/preset.ts
export type Preset = {
  id: string;              // UUID
  name: string;            // 例: "デイリースクラム", "週次振り返り"
  type: "rollcall" | "phase"; // Plan 0021 で "phase" が活きる。本計画では "rollcall" 固定で運用
  participants: Participant[]; // メンバーマスター
  // 全体時間
  globalMaxTime: number;
  useGlobalMaxTime: boolean;
  // VoiceVox アラート設定（シーン別に使い分けたいのでプリセット側）
  alerts: AlertSettings;
  voiceSpeaker?: number;   // VoiceVox スピーカーID
  volume: number;          // 0.0 - 1.0
  muted: boolean;
  // フェーズモード時のみ使用 (Plan 0021)
  segments?: Segment[];
  // 作成/更新時刻
  createdAt: number;
  updatedAt: number;
};

export type Segment = {
  id: string;
  name: string;  // 例: "発散", "深掘り", "まとめ", "持ち帰り"
  minutes: number;
};

export type AlertSettings = {
  wrapUp: boolean;
  timeup: boolean;
  overtime10: boolean;
  overtime30: boolean;
};
```

**プリセットに含めない** (ユーザーグローバル設定として残す):
- VoiceVox Engine の URL（環境依存、`localhost:50021` 等）
- UI 言語・テーマ等の純粋な UI 設定

これらは `useUserPreferences` 等の別 composable で扱う（必要なら本計画で新設）。

### 2. usePresets composable

```ts
// src/composables/usePresets.ts
export function usePresets() {
  // すべてのプリセット
  const presets: Ref<Preset[]>;
  // アクティブなプリセット ID
  const activePresetId: Ref<string>;
  const activePreset: ComputedRef<Preset>;

  function createPreset(name: string, basedOn?: string): Preset; // basedOn 指定で既存複製
  function updatePreset(id: string, patch: Partial<Preset>): void;
  function deletePreset(id: string): void; // 最後の1つは削除不可
  function selectPreset(id: string): void;

  return { presets, activePresetId, activePreset, createPreset, updatePreset, deletePreset, selectPreset };
}
```

**永続化**: localStorage `scrumtimer-presets-v2` に全プリセット + activePresetId を JSON 保存。

### 3. 既存 composables の置き換え

`useParticipants` / `useSettings` は、内部で `usePresets().activePreset` を参照するラッパーに変更:

```ts
// useParticipants() の例
export function useParticipants() {
  const { activePreset, updatePreset } = usePresets();
  const masterParticipants = computed(() => activePreset.value.participants);

  function add(name: string) {
    updatePreset(activePreset.value.id, {
      participants: [...activePreset.value.participants, createParticipant(name)],
    });
  }
  // ...
}
```

**互換維持**: 既存の呼び出し側（`TimerView`, `ParticipantList`, etc.）はそのまま動くようにラッパーを設計する。
ただし、`participants`（タイマーセッション一時状態）と `doneParticipants` / `absentParticipants` の扱いは
**Plan 0020 で `useMeetingSession` に移す予定**。本計画では既存通り `useParticipants` 内に残す。

### 4. データ移行

初回起動時に既存の localStorage キーを読んで「デフォルト」プリセットを生成:

```ts
function migrate(): Preset[] {
  const oldParticipants = loadOldKey("scrumtimer-participants");
  const oldSettings = loadOldKey("scrumtimer-settings");
  if (!oldParticipants && !oldSettings) {
    // 完全新規ユーザー: サンプルプリセットを1つだけ作る
    return [createDefaultPreset()];
  }
  return [{
    id: "default",
    name: "デフォルト",
    type: "rollcall",
    participants: oldParticipants?.participants ?? [],
    globalMaxTime: oldSettings?.globalMaxTime ?? 900,
    useGlobalMaxTime: oldSettings?.useGlobalMaxTime ?? true,
    alerts: oldSettings?.alerts ?? defaultAlerts,
    voiceSpeaker: oldSettings?.voiceSpeaker,
    volume: oldSettings?.volume ?? 0.5,
    muted: oldSettings?.muted ?? false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }];
}
```

旧キーは削除せず残す（ロールバック可能 + Plan 0019 で問題が出たときの保険）。

### 5. UI

**新規画面 `PresetView.vue` (`/#/presets`)**:
- プリセット一覧（カード形式）
  - 名前、メンバー人数、全体時間、アクティブマーク
  - アクションボタン: 「編集」「複製」「削除」「このプリセットでミーティング開始」
- 「新規作成」ボタン

**新規画面 `PresetEditView.vue` (`/#/presets/:id/edit`)**:
- 名前変更
- メンバーリスト編集（既存 `ParticipantList.vue` のロジックを流用、対象プリセットを切り替え）
- 全体時間 (`globalMaxTime`) 設定
- VoiceVox アラート設定
- 「保存」「キャンセル」

**既存画面の整理**:
- `/#/participants` → アクティブプリセットのメンバー編集にリダイレクト（互換維持）
- `/#/settings` → アクティブプリセットの設定編集にリダイレクト（互換維持）
- もしくは `/#/presets` を新たな起点として、参加者・設定は「現在のプリセットを編集」のショートカットとして残置

**NavBar 改修**: 「タイマー」「プリセット」「ヘルプ」の 3 つに集約（参加者・設定はプリセット編集画面に集約）。
ルーム関連 (`/#/room`) は別系統で維持。

### 6. プリセットの初期サンプル

完全新規ユーザー向けに以下の 2 つを用意:

| プリセット名 | メンバー | 全体時間 | type |
|---|---|---|---|
| デイリースクラム | 空（自分で追加） | 15分 (900秒) | rollcall |
| 週次振り返り | 同上 | 60分 (3600秒) | rollcall |

---

## チェックリスト

### Phase 1: 型定義 + 移行ロジック

- [ ] 1.1 `src/types/preset.ts` — `Preset`, `Segment`, `AlertSettings` を定義
- [ ] 1.2 `src/utils/presetMigration.ts` — 旧 localStorage キーから Preset への変換ロジック + テスト
- [ ] 1.3 `src/utils/presetMigration.test.ts` — 移行のユニットテスト（既存ユーザー / 新規ユーザー / 部分データのみ）

### Phase 2: usePresets composable

- [ ] 2.1 `src/composables/usePresets.ts` — CRUD + アクティブプリセット管理 + localStorage 永続化
- [ ] 2.2 `src/composables/usePresets.test.ts` — CRUD のユニットテスト + 永続化テスト

### Phase 3: 既存 composables のラッパー化

- [ ] 3.1 `src/composables/useParticipants.ts` — `usePresets().activePreset` を参照するように改修。`participants`/`done`/`absent`（セッション状態）は既存通り残す
- [ ] 3.2 `src/composables/useSettings.ts` — 同上。`updateSettings()` を `usePresets().updatePreset()` 経由に
- [ ] 3.3 既存テスト (`useParticipants.test.ts` / `useSettings.test.ts`) の前提を更新

### Phase 4: UI 画面

- [ ] 4.1 `src/components/PresetView.vue` — 一覧画面（カード + アクション）
- [ ] 4.2 `src/components/PresetEditView.vue` — 編集画面（名前 / メンバー / 時間 / アラート）
- [ ] 4.3 `src/router/index.ts` — `/presets` / `/presets/:id/edit` ルート追加
- [ ] 4.4 `src/components/NavBar.vue` — 「プリセット」項目追加（「参加者」「設定」を整理）
- [ ] 4.5 既存 `/participants` / `/settings` の互換維持（リダイレクト or アクティブプリセットの該当タブを開く）

### Phase 5: テスト

- [ ] 5.1 `src/components/PresetView.test.ts` — 一覧表示、アクションのテスト
- [ ] 5.2 `src/components/PresetEditView.test.ts` — フォーム入力 / 保存 / キャンセルのテスト
- [ ] 5.3 `e2e/preset-management.spec.ts` — プリセット作成 → 編集 → 切替 → タイマー画面で反映を確認

### Phase 6: 検証

- [ ] 6.1 `vp build` — ビルド通過
- [ ] 6.2 `vp check src/` — Lint / format 通過
- [ ] 6.3 `vp test run` — ユニットテスト全通過
- [ ] 6.4 `pnpm run test:e2e` — E2E 全通過
- [ ] 6.5 Playwright MCP で手動確認: 既存ユーザーの移行 / 新規ユーザーの初回起動 / プリセット切替

---

## 対象ファイル

| ファイル | 変更種別 |
|---|---|
| `src/types/preset.ts` | 新規: Preset / Segment / AlertSettings |
| `src/utils/presetMigration.ts` | 新規: 旧キーから Preset への移行 |
| `src/utils/presetMigration.test.ts` | 新規: 移行テスト |
| `src/composables/usePresets.ts` | 新規: プリセット CRUD |
| `src/composables/usePresets.test.ts` | 新規: CRUD テスト |
| `src/composables/useParticipants.ts` | 改修: activePreset 参照に変更 |
| `src/composables/useSettings.ts` | 改修: activePreset 参照に変更 |
| `src/components/PresetView.vue` | 新規: 一覧画面 |
| `src/components/PresetEditView.vue` | 新規: 編集画面 |
| `src/components/NavBar.vue` | 改修: プリセット項目追加 |
| `src/router/index.ts` | 改修: プリセットルート追加 |
| `e2e/preset-management.spec.ts` | 新規: プリセット管理 E2E |

---

## 注意事項

- **後方互換性**: 既存 localStorage キー (`scrumtimer-participants`, `scrumtimer-settings`) は削除しない。移行は読み取りのみ。新規データは `scrumtimer-presets-v2` キーに保存
- **ルーム同期との関係**: ルームモードではホストのプリセットが共有される。`SyncState` にプリセット情報を含めるかは Plan 0020 で検討（本計画では既存通り participants/settings ベースで動かす）
- **既存テストの互換性**: 既存テストは「グローバル参加者リスト」前提なので、`usePresets` 初期化を含むセットアップヘルパーが必要
- **GUI 操作体験 (CLAUDE.repo.md 参照)**: プリセット切替は頻繁に行う操作なので、NavBar のセレクタで即座に切り替えられる UI が望ましい。タイマー画面トップにアクティブプリセット名を常時表示
- **削除時のフォールバック**: 最後のプリセットは削除不可。削除時にアクティブプリセットを失わないよう、削除後は別のプリセットを自動選択
- **Plan 0017 との関係**: Plan 0017 (ターン交代制御) は本計画より先にスタート。`TimerView.vue` を両方が触るため、0017 完了後に本計画を着手する
