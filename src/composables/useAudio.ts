import { watch } from "vue";
import { useSettings } from "./useSettings";

/** 音声トラック定義: ファイル名（拡張子なし） */
const TRACK_NAMES = [
  "start",
  "wrap-up",
  "timeup",
  "overtime-10",
  "overtime-30",
  "complete",
] as const;

type TrackName = (typeof TRACK_NAMES)[number];

const base = import.meta.env.BASE_URL;

/** トラック名 → HTMLAudioElement のマップ */
const tracks: Record<TrackName, HTMLAudioElement> = Object.fromEntries(
  TRACK_NAMES.map((name) => {
    const audio = new Audio(`${base}${name}.wav`);
    audio.preload = "auto";
    return [name, audio];
  }),
) as Record<TrackName, HTMLAudioElement>;

const { settings } = useSettings();

// 設定の音量・ミュートを全トラックに同期
function syncAudio() {
  for (const audio of Object.values(tracks)) {
    audio.volume = settings.value.volume;
    audio.muted = settings.value.muted;
  }
}
syncAudio();
watch(() => [settings.value.volume, settings.value.muted], syncAudio);

function play(name: TrackName) {
  const audio = tracks[name];
  audio.currentTime = 0;
  // play() は Promise を返すが、jsdom 等では undefined を返す場合がある
  audio.play()?.catch(() => {
    // ユーザー操作なしでは再生がブロックされる場合がある
  });
}

/**
 * 音声再生 composable
 */
export function useAudio() {
  return {
    playStart: () => play("start"),
    playWrapUp: () => play("wrap-up"),
    playTimeup: () => play("timeup"),
    playOvertime10: () => play("overtime-10"),
    playOvertime30: () => play("overtime-30"),
    playComplete: () => play("complete"),
  };
}
