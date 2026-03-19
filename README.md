# ScrumTimer なのだ！

> デイリースクラムをもっと楽しく、もっとスムーズにするのだ！

[JoSSte/ScrumTimer](https://github.com/JoSSte/ScrumTimer) をフォークし、**WebRTC（P2P）によるリアルタイムターン交代**と **VoiceVox 音源によるタイムキープ読み上げ**を追加したスクラムタイマーなのだ。

## オリジナルとの違い

| 機能 | オリジナル (ScrumTimer) | なのだ！版 |
|---|---|---|
| ターン交代 | 操作者のブラウザのみ | **WebRTC P2P で全員のブラウザに同期** |
| タイムキープ | 画面表示のみ | **VoiceVox 音源で残り時間を読み上げ** |
| データ管理 | localStorage のみ | localStorage + P2P リアルタイム同期 |
| 参加者管理 | JSON インポート/エクスポート | JSON + ルーム内リアルタイム共有 |
| サーバー | 不要 | **不要**（GitHub Pages + PeerJS Cloud で完結） |

## 特徴

- **誰でもターン交代** — 発表者本人でも、ファシリテーターでも、誰のブラウザからでも「次へ」を押せるのだ。WebRTC で全員の画面が即座に同期される
- **ルーム機能** — ランダム ID でルームを作成し、URL を共有するだけでジョインできるのだ。サーバー不要、GitHub Pages だけで動く
- **VoiceVox タイムキープ** — 残り時間を VoiceVox の音声で通知。「残り1分なのだ！」「時間切れなのだ！」のように音声でお知らせ
- **ローカルファースト** — 接続が切れてもローカルで動き続ける。オリジナルのプライバシー哲学を継承
- **シャッフル** — 毎日ランダムな順番で発表。いつも同じ人が最初にならない

## アーキテクチャ

```
┌─────────────┐                    ┌─────────────┐
│  ブラウザ A   │◄── WebRTC P2P ──►│  ブラウザ B   │
│  (ホスト)     │                    │  (ゲスト)     │
└──────┬──────┘                    └─────────────┘
       │
       │ WebRTC P2P
       ▼
┌─────────────┐       シグナリングのみ       ┌──────────────┐
│  ブラウザ C   │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ►│ PeerJS Cloud │
│  (ゲスト)     │                             │ (接続確立時)  │
└─────────────┘                              └──────────────┘
       │
       ▼
 VoiceVox Engine (各自のローカル)
```

- **データ転送**: ブラウザ間の直接通信（P2P）。サーバーを経由しない
- **シグナリング**: PeerJS Cloud を接続確立時のみ使用。データは通らない
- **NAT 越え**: PeerJS 内蔵の STUN/TURN で対応

## セットアップ

### 前提条件

- Node.js
- [VoiceVox Engine](https://voicevox.hiroshiba.jp/)（音声読み上げを使う場合、任意）

### インストール

```bash
git clone https://github.com/fruitriin/scrumtimerNanoda.git
cd scrumtimerNanoda
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

### VoiceVox Engine

音声読み上げを利用するには、VoiceVox Engine を別途起動しておく必要があるのだ。
VoiceVox が起動していなくてもタイマー自体は普通に使えるのだ。

```bash
# VoiceVox Engine のデフォルトポート: 50021
# 設定画面から VoiceVox の接続先を変更できる
```

## 使い方

1. 参加者リストを設定する（JSON インポート or 手動追加）
2. 「ルームを作成」で URL を発行し、チームメンバーに共有する
3. 「開始」を押すとシャッフルされた順番でタイマーが始まる
4. **どのブラウザからでも**「次へ」を押せば、全員の画面でターンが切り替わる
5. 残り時間は VoiceVox が音声で通知してくれる（VoiceVox がなくても画面表示で確認できる）

## リファレンス

`docs/reference/` にオリジナルの ScrumTimer のソースコードを配置しているのだ。移行・改修の参考にするのだ。

## プライバシー

オリジナルの ScrumTimer の哲学を引き継いでいるのだ。

- Cookie は使わない
- 参加者リストは localStorage に保存
- データは WebRTC で**ブラウザ間を直接通信**（サーバーにデータは保存されない）
- PeerJS Cloud はシグナリング（接続確立の仲介）にのみ使用し、タイマーや参加者のデータは通らない

## クレジット

- オリジナル: [JoSSte/ScrumTimer](https://github.com/JoSSte/ScrumTimer) — Angular ベースのデイリースクラムタイマー
- 音声合成: [VoiceVox](https://voicevox.hiroshiba.jp/) — 無料で使える高品質な音声合成エンジン
- P2P 通信: [PeerJS](https://peerjs.com/) — WebRTC をシンプルに使えるライブラリ
- 開発フレームワーク: [AutomatonDevDrive Framework](https://github.com/fruitriin/AutomatonDevDriveFramework)

## 名前について

「なのだ！」は、このフォークの個性なのだ。

オリジナルの ScrumTimer に WebRTC と VoiceVox を足して、みんなで使いやすくしたもの。VoiceVox のずんだもんが「なのだ！」と時間を教えてくれる——そんなイメージなのだ。
