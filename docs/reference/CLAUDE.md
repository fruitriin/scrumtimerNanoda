# リファレンス: オリジナル ScrumTimer

> このディレクトリは [JoSSte/ScrumTimer](https://github.com/JoSSte/ScrumTimer) のソースコードを
> 参照用に配置したものです。編集しないでください。

## ツールスタック

| カテゴリ | 技術 | バージョン |
|---|---|---|
| フレームワーク | **Angular** | 21.x |
| 言語 | **TypeScript** | |
| CSS | **Bootstrap** | 5.x |
| アイコン | **Font Awesome** | 4.x |
| HTTP | **Angular HttpClient** | |
| テスト | **Karma + Jasmine** | |
| ビルド | **Angular CLI** | |
| デプロイ | **angular-cli-ghpages** → GitHub Pages | |

## ディレクトリ構成

```
docs/reference/
├── package.json                         # Angular プロジェクト設定
├── angular.json                         # Angular CLI 設定
├── tsconfig.json
├── karma.conf.js                        # テスト設定
├── eslint.config.js
├── src/
│   ├── index.html                       # エントリ HTML（Bootstrap CDN 読み込み）
│   ├── main.ts                          # Angular ブートストラップ
│   ├── styles.css                       # グローバルスタイル
│   ├── polyfills.ts
│   ├── test.ts
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── assets/
│   │   ├── images/                      # スクリーンショット
│   │   ├── js/                          # Bootstrap/jQuery/Popper/Tether（ローカル）
│   │   └── json/
│   │       └── participants_andeby.json # サンプル参加者データ
│   └── app/
│       ├── app.module.ts                # ★ ルートモジュール（ルーティング定義含む）
│       ├── app.component.ts / .html     # ルートコンポーネント
│       ├── components/
│       │   ├── timer/                   # ★ タイマー（メイン機能）
│       │   │   ├── timer.component.ts   #   タイマーロジック・参加者状態管理
│       │   │   └── timer.component.html #   タイマー UI
│       │   ├── participant-list/        # 参加者管理（追加/削除/import/export）
│       │   │   ├── participant-list.component.ts
│       │   │   └── participant-list.component.html
│       │   ├── settings/               # 設定（最大時間、リモートURL、Jira URL）
│       │   │   ├── settings.component.ts
│       │   │   └── settings.component.html
│       │   ├── navbar/                  # ナビバー（ポップアウト機能含む）
│       │   │   ├── navbar.component.ts
│       │   │   └── navbar.component.html
│       │   └── help/                    # ヘルプ（バージョンチェック含む）
│       │       ├── help.component.ts
│       │       └── help.component.html
│       ├── models/
│       │   ├── Participant.ts           # ★ Participant クラス（init, name, time）
│       │   └── adapter.ts              # JSON → Participant 変換アダプター
│       ├── pipes/
│       │   └── secs.pipe.ts            # ★ 秒 → MM:SS 変換パイプ
│       └── services/
│           ├── participant/
│           │   └── participant.service.ts  # ★ 参加者 CRUD・localStorage 永続化
│           ├── settings/
│           │   └── settings.service.ts     # ★ 設定管理・localStorage 永続化
│           ├── navbar/
│           │   └── navbar.service.ts       # ナビバー表示/非表示管理
│           └── versioncheck/
│               └── version-check.service.ts # GitHub API で最新バージョン取得
```

★ = なのだ！版への移植で特に重要なファイル

## 機能マッピング（リファレンス → なのだ！版）

| リファレンス | なのだ！版 | 備考 |
|---|---|---|
| `timer.component.ts` | `composables/useTimer.ts` + `TimerView.vue` | ロジックと UI を分離 |
| `participant.service.ts` | `composables/useParticipants.ts` | Vue Composable に変換 |
| `participant-list.component.ts` | `ParticipantList.vue` | |
| `settings.service.ts` | `composables/useSettings.ts` | VoiceVox 設定を追加 |
| `settings.component.ts` | `SettingsView.vue` | |
| `navbar.component.ts` | `NavBar.vue` | ポップアウト機能は削除、ルーム UI に置換 |
| `help.component.ts` | `HelpView.vue` | |
| `secs.pipe.ts` | `utils/formatTime.ts` | Angular Pipe → 関数 |
| `Participant.ts` | `models/Participant.ts` | `id` フィールドを追加 |
| `app.module.ts` (routes) | `router/index.ts` | ルーム用ルート追加 |
| なし | `composables/useRoom.ts` | **新規**: WebRTC ルーム同期 |
| なし | `composables/useVoiceVox.ts` | **新規**: VoiceVox 音声合成 |
| なし | `components/RoomPanel.vue` | **新規**: ルーム作成・参加 UI |

## データモデル

### Participant

```typescript
// オリジナル
class Participant {
  constructor(
    public init: string,   // イニシャル（例: "JD"）
    public name: string,   // 名前
    public time = 0        // 費やした時間（秒）
  ) {}
}
```

### localStorage キー

| キー | 内容 | 形式 |
|---|---|---|
| `participants` | 参加者リスト | `[{init, name, time}, ...]` |
| `settings` | 設定値 | `[useGlobalMaxTime, globalMaxTime, remoteParticipantList]` |
| `JiraURL` | Jira URL | 文字列 |
| `lastSync` | リモートリスト最終同期 | ISO 8601 日時文字列 |

### タイマーの時間計算ロジック

```
useGlobalMaxTime が true の場合:
  individualTime = Math.round((globalMaxTime - totalElapsed) / 残り参加者数)

false の場合:
  individualTime = 120（固定 2 分）

進捗色:
  < 75%  → 緑（success）
  < 95%  → 黄（warning）
  >= 95% → 赤（danger）
```

### ルーティング

| パス | コンポーネント |
|---|---|
| `/` | TimerComponent |
| `/timer` | TimerComponent |
| `/popin` | TimerComponent（ナビバー非表示） |
| `/participants` | ParticipantListComponent |
| `/settings` | SettingsComponent |
| `/help` | HelpComponent |

ハッシュベースルーティング（`HashLocationStrategy`）を使用。
