# ScrumTimer なのだ！

> デイリースクラムをもっと楽しく、もっとスムーズにするのだ！

[JoSSte/ScrumTimer](https://github.com/JoSSte/ScrumTimer) をフォークし、**WebSocket によるリアルタイムターン交代**と **VoiceVox 音源によるタイムキープ読み上げ**を追加したスクラムタイマーなのだ。

## オリジナルとの違い

| 機能 | オリジナル (ScrumTimer) | なのだ！版 |
|---|---|---|
| ターン交代 | 操作者のブラウザのみ | **WebSocket で全員のブラウザに同期** |
| タイムキープ | 画面表示のみ | **VoiceVox 音源で残り時間を読み上げ** |
| データ管理 | localStorage のみ | localStorage + WebSocket 同期 |
| 参加者管理 | JSON インポート/エクスポート | JSON + リアルタイム共有 |

## 特徴

- **誰でもターン交代** — 発表者本人でも、ファシリテーターでも、誰のブラウザからでも「次へ」を押せるのだ。WebSocket で全員の画面が即座に同期される
- **VoiceVox タイムキープ** — 残り時間を VoiceVox の音声で通知。「残り1分なのだ！」「時間切れなのだ！」のように音声でお知らせ
- **ローカルファースト** — サーバーが落ちてもローカルで動き続ける。オリジナルのプライバシー哲学を継承
- **シャッフル** — 毎日ランダムな順番で発表。いつも同じ人が最初にならない

## アーキテクチャ

```
┌─────────────┐     WebSocket      ┌─────────────┐
│  ブラウザ A   │◄──────────────────►│             │
├─────────────┤                    │  WebSocket  │
│  ブラウザ B   │◄──────────────────►│   サーバー    │
├─────────────┤                    │             │
│  ブラウザ C   │◄──────────────────►│             │
└─────────────┘                    └─────────────┘
       │
       ▼
 VoiceVox Engine (ローカル or リモート)
```

## セットアップ

### 前提条件

- Node.js
- [VoiceVox Engine](https://voicevox.hiroshiba.jp/)（音声読み上げを使う場合）

### インストール

```bash
git clone https://github.com/fruitriin/scrumtimerNanoda.git
cd scrumtimerNanoda
npm install
```

### 開発サーバー起動

```bash
npm start
```

### VoiceVox Engine

音声読み上げを利用するには、VoiceVox Engine を別途起動しておく必要があるのだ。

```bash
# VoiceVox Engine のデフォルトポート: 50021
# 設定画面から VoiceVox の接続先を変更できる
```

## 使い方

1. 参加者リストを設定する（JSON インポート or 手動追加）
2. 「開始」を押すとシャッフルされた順番でタイマーが始まる
3. **どのブラウザからでも**「次へ」を押せば、全員の画面でターンが切り替わる
4. 残り時間は VoiceVox が音声で通知してくれる

## リファレンス

`docs/reference/` にオリジナルの ScrumTimer のソースコードを配置しているのだ。移行・改修の参考にするのだ。

## プライバシー

オリジナルの ScrumTimer の哲学を引き継いでいるのだ。

- Cookie は使わない
- 外部サービスにデータを送信しない
- 参加者リストは localStorage に保存
- WebSocket は同じセッションに接続したブラウザ間のみで通信

## クレジット

- オリジナル: [JoSSte/ScrumTimer](https://github.com/JoSSte/ScrumTimer) — Angular ベースのデイリースクラムタイマー
- 音声合成: [VoiceVox](https://voicevox.hiroshiba.jp/) — 無料で使える高品質な音声合成エンジン
- 開発フレームワーク: [AutomatonDevDrive Framework](https://github.com/fruitriin/AutomatonDevDriveFramework)

## 名前について

「なのだ！」は、このフォークの個性なのだ。

オリジナルの ScrumTimer に WebSocket と VoiceVox を足して、みんなで使いやすくしたもの。VoiceVox のキャラクターが「なのだ！」と時間を教えてくれる——そんなイメージなのだ。
