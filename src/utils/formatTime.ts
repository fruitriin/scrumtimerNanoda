/**
 * 秒数を MM:SS 形式の文字列に変換する
 * オリジナル ScrumTimer の SecsPipe 相当
 */
export function formatTime(totalSeconds: number): string {
  const absSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(absSeconds / 60);
  const seconds = absSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
