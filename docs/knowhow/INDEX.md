# Knowhow Index

> 自動生成。`/addf-knowhow-index reindex` で再生成できる。

## TypeScript・コーディング規約

| ファイル | 要約 | キーワード |
|---|---|---|
| [type-vs-interface.md](type-vs-interface.md) | TypeScript で type を優先する方針とその理由。一貫性・Vue Composable 相性・宣言マージ回避 | type, interface, TypeScript, 型宣言, Vue, Composable, ユニオン型, 交差型 |

## 音声・メディア

| ファイル | 要約 | キーワード |
|---|---|---|
| [audio-playback-pattern.md](audio-playback-pattern.md) | jsdom の play() 未実装対策、トラック定義の宣言的パターン、音量一括同期 | Audio, jsdom, play(), VoiceVox, WAV, useAudio, オプショナルチェーン |

## WebRTC・リアルタイム同期

| ファイル | 要約 | キーワード |
|---|---|---|
| [webrtc-room-sync.md](webrtc-room-sync.md) | startedAt 共有による冪等な同期設計、毎秒 broadcast 廃止、localStorage マスターデータ分離 | WebRTC, PeerJS, startedAt, 冪等, broadcast, localStorage, masterParticipants, SyncState |

## ビルドツール・開発環境

| ファイル | 要約 | キーワード |
|---|---|---|
| [vite-plus-setup.md](vite-plus-setup.md) | Vite+ の統合ツールチェーン思想、composables シングルトンテストパターン、jsdom Audio モック（class構文必須）、Vue watch の nextTick テスト | Vite+, vp, Oxlint, Oxfmt, tsgolint, vite.config.ts一元化, composable, シングルトン, jsdom, Audio, モック, HTMLMediaElement, nextTick, watch, localStorage |

## Claude Code 設定・運用

| ファイル | 要約 | キーワード |
|---|---|---|
| [ADDF/claude-md-at-mention.md](ADDF/claude-md-at-mention.md) | CLAUDE.md の @FileName メンション展開の仕組みと使い分け | @展開, メンション, クオート, ネスト展開, CLAUDE.md, インライン展開, ファイル参照, ブートシーケンス |
| [ADDF/ignore-file-strategy.md](ADDF/ignore-file-strategy.md) | .gitignore / .claudeignore / .git/info/exclude の役割分けと運用戦略 | .gitignore, .claudeignore, .git/info/exclude, respectGitignore, settings.json, settings.local.json, Glob, Grep, ファイル除外 |
