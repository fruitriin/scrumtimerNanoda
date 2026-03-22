---
name: voicevox
description: VoiceVox Engine API で音声ファイル(WAV)を生成する。「音声を作って」「VoiceVoxで読み上げ」「WAVファイルを生成」「ずんだもんの声で」など音声合成が必要なときに使う。VoiceVox Engine が localhost:50021 で起動している必要がある。
---

# VoiceVox 音声生成

VoiceVox Engine API を使ってテキストから WAV ファイルを生成する。

## 前提条件

- VoiceVox Engine が `localhost:50021` で起動していること
- 起動していない場合はユーザーに起動を依頼する

## 使い方

### 話者一覧の確認

```bash
python3 scripts/generate_voice.py list
```

### 音声生成

```bash
python3 scripts/generate_voice.py generate --text "読み上げテキスト" --speaker <話者ID> --output <出力パス>
```

- `--speaker`: 話者ID（デフォルト: 3 = ずんだもんノーマル）
- `--output`: 出力 WAV ファイルパス
- `--base-url`: VoiceVox Engine URL（デフォルト: `http://localhost:50021`）

### 主要な話者ID

| 話者 | スタイル | ID |
|---|---|---|
| ずんだもん | ノーマル | 3 |
| ずんだもん | あまあま | 1 |
| ずんだもん | ツンツン | 7 |
| 四国めたん | ノーマル | 2 |
| 春日部つむぎ | ノーマル | 8 |

話者が指定されない場合はずんだもんノーマル(ID=3)を使用する。全話者を確認するには `list` コマンドを実行する。

## デフォルトの出力先

- 生成した WAV ファイルは `public/` ディレクトリに書き出す
- `--output` で明示的にパスが指定されない場合は `public/<テキストから推測したファイル名>.wav` とする

## 注意点

- `curl` で直接 API を叩くと日本語テキストの URL エンコーディングで失敗する場合がある。必ず同梱の Python スクリプトを使用する
- 生成される WAV は 24kHz 16bit mono
