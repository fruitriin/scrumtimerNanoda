# 計画: VoiceVox 音源タイムキープ

## 動機

VoiceVox の音声合成で残り時間を読み上げることで、画面を見ていなくても時間を把握できる。
「残り1分なのだ！」「時間切れなのだ！」のように、キャラクター性のある通知を実現する。

## 設計

### VoiceVox Engine との連携

VoiceVox Engine は REST API を提供するローカルサーバー（デフォルト: `http://localhost:50021`）。
ブラウザから直接 HTTP リクエストで音声合成データを取得し、Web Audio API で再生する。

**音声合成フロー:**
```
1. POST /audio_query?text=...&speaker=... → クエリ JSON 取得
2. POST /synthesis?speaker=... (body: クエリ JSON) → WAV バイナリ取得
3. AudioContext で WAV を再生
```

### useVoiceVox Composable

```typescript
- engineUrl: Ref<string>             // デフォルト: http://localhost:50021
- speakerId: Ref<number>             // VoiceVox のキャラクター ID
- isAvailable: Ref<boolean>          // Engine に接続可能か
- isSpeaking: Ref<boolean>           // 現在読み上げ中か
- enabled: Ref<boolean>              // 音声通知 ON/OFF

- checkConnection()                   // Engine の生存確認
- speak(text: string)                 // テキストを読み上げ
- speakTimekeep(seconds: number)      // 残り時間に応じた読み上げ
```

### タイムキープ読み上げルール

| 条件 | 読み上げテキスト |
|---|---|
| 残り 60 秒 | 「残り1分なのだ」 |
| 残り 30 秒 | 「残り30秒なのだ」 |
| 残り 10 秒 | 「10、9、8…」（カウントダウン） |
| 時間切れ | 「時間切れなのだ！」 |
| 次の人へ | 「次は○○さんなのだ」 |
| 全員完了 | 「お疲れ様なのだ！」 |

- 読み上げタイミングは設定でカスタマイズ可能にする
- 音声が重ならないようキューイングする

### 音声プリフェッチ

定型フレーズ（「残り1分なのだ」等）はタイマー開始時にプリフェッチし、
再生時のレイテンシを最小化する。参加者名を含むフレーズは動的に生成。

### 設定 UI 追加

SettingsView に以下を追加:

- VoiceVox Engine URL（デフォルト: `http://localhost:50021`）
- キャラクター選択（Engine から取得した話者リスト）
- 音声通知 ON/OFF
- 接続テストボタン（「テストなのだ」を再生）
- 読み上げタイミングの設定

### CORS 考慮

VoiceVox Engine はローカルで動作するため、ブラウザの CORS ポリシーに注意。
VoiceVox Engine はデフォルトで `Access-Control-Allow-Origin: *` を返すため、
GitHub Pages からのリクエストも問題なく通る。

### WebRTC ルームとの連携

- 音声の読み上げは**各クライアントのローカルで実行**する
- ホストがタイムキープイベントをブロードキャストし、各クライアントが自分の VoiceVox で再生
- VoiceVox Engine がないクライアントは音声なしでタイマー表示のみ

## 影響範囲

- `src/composables/useVoiceVox.ts`（新規）
- `src/composables/useTimer.ts`（タイムキープイベント発火を追加）
- `src/components/SettingsView.vue`（VoiceVox 設定 UI 追加）
