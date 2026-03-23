# 音声再生パターン — useAudio composable

## 発見した知見

### jsdom で HTMLMediaElement.play() が未実装

jsdom（Vitest の jsdom 環境）では `HTMLMediaElement.prototype.play` が実装されていない。
`audio.play()` は `undefined` を返すため、`.catch()` を直接チェーンすると `TypeError` になる。

```typescript
// ❌ jsdom でクラッシュ
audio.play().catch(() => {});

// ✅ オプショナルチェーンで安全に
audio.play()?.catch(() => {});
```

### トラック定義の宣言的パターン

音声トラックが増えるたびに `new Audio` + `preload` + 配列追加 + play 関数作成を繰り返すのは冗長。
トラック名の配列から `Object.fromEntries` で一括生成する:

```typescript
const TRACK_NAMES = ["start", "timeup", "complete"] as const;
type TrackName = (typeof TRACK_NAMES)[number];

const tracks: Record<TrackName, HTMLAudioElement> = Object.fromEntries(
  TRACK_NAMES.map((name) => {
    const audio = new Audio(`${base}${name}.wav`);
    audio.preload = "auto";
    return [name, audio];
  }),
) as Record<TrackName, HTMLAudioElement>;
```

新トラック追加は `TRACK_NAMES` に1行追加 + return に1行追加だけで済む。

### 音量・ミュートの一括同期

`watch` で設定変更を検知し、全トラックに一括適用する:

```typescript
function syncAudio() {
  for (const audio of Object.values(tracks)) {
    audio.volume = settings.value.volume;
    audio.muted = settings.value.muted;
  }
}
watch(() => [settings.value.volume, settings.value.muted], syncAudio);
```

## プロジェクトへの適用

- `src/composables/useAudio.ts` で実装済み
- `public/` ディレクトリに WAV ファイルを配置（VoiceVox で生成）
- 警告音声の ON/OFF は `AppSettings.alerts` で個別制御

## 注意点・制約

- ブラウザのオートプレイポリシーにより、ユーザー操作なしでは再生がブロックされる場合がある
- VoiceVox Engine が起動していないと音声ファイルの再生成ができない
- WAV は 24kHz 16bit mono（VoiceVox デフォルト）

## 参照

- `src/composables/useAudio.ts`
- `.claude/commands/voicevox/SKILL.md` — VoiceVox 音声生成スキル
