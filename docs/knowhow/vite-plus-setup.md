# Vite+ (vp) プロジェクトセットアップ

## 発見した知見

### インストールと基本コマンド

- **インストール**: `curl -fsSL https://vite.plus | bash`（その後 `source ~/.zshenv` が必要）
- **プロジェクト作成**: `vp create vite -- --template vue-ts`
- **依存関係**: `vp install`（pnpm に委譲）
- **ビルド**: `vp build`
- **テスト**: `vp test run`
- **lint/format/type check 一括**: `vp check`（oxlint + biome ベース）
- **パッケージ追加**: `vp add [-D] <package>`

### package.json の構造（Vite+ 方式）

Vite+ は `vite` パッケージを `@voidzero-dev/vite-plus-core` にオーバーライドする:

```json
{
  "devDependencies": {
    "vite": "npm:@voidzero-dev/vite-plus-core@latest",
    "vite-plus": "latest",
    "vitest": "npm:@voidzero-dev/vite-plus-test@^0.1.12"
  },
  "pnpm": {
    "overrides": {
      "vite": "npm:@voidzero-dev/vite-plus-core@latest",
      "vitest": "npm:@voidzero-dev/vite-plus-test@latest"
    }
  }
}
```

`vitest` を devDependencies に明示追加しないと型解決ができない。

### vite.config.ts の import

`vite-plus` から `defineConfig` をインポートする:

```typescript
import { defineConfig } from "vite-plus";
```

### oxlint の制約: baseUrl / paths 非推奨

oxlint (Vite+ 組込みの linter) は TypeScript の `baseUrl` オプションを非推奨としている。
そのため `@/` パスエイリアスを `tsconfig.app.json` の `paths` で設定できない。

**対策**: 相対パスで統一する。`../components/Foo.vue` のように書く。

### vp check のスコープ限定

`vp check` はデフォルトでプロジェクト全体を対象にするため、`docs/` 等の非ソースファイルも
フォーマットチェックされる。

**対策**: `package.json` の lint スクリプトで `vp check src/` とパスを指定する。

### __dirname は使えない

ESM モードでは `__dirname` が未定義。`import.meta.dirname` を使うか、
そもそも resolve alias を使わない設計にする。

### vp create の制約

- `--directory` オプションはビルトインテンプレート（`vite:monorepo` 等）のみ対応
- `vite` テンプレート使用時は別ディレクトリに生成して rsync でコピーする回り道が必要

## プロジェクトへの適用

### CI/CD ワークフロー

CI では `curl | bash` でなく pnpm + setup-node アクションを使う（サプライチェーン対策）:

```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 10
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: pnpm
- run: pnpm install --frozen-lockfile
- run: pnpm run build
```

### Vue ファイルの型宣言

`src/env.d.ts` で `.vue` ファイルの型を宣言する:

```typescript
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<any, any, any>;
  export default component;
}
```

`Record<string, never>` は props を持つコンポーネントでエラーになるので `any` を使う。

### composables のシングルトンパターン

`ref` を composable 関数の外（モジュールスコープ）に配置して状態を共有する:

```typescript
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });

export function useSettings() {
  // settings はモジュールスコープなので全コンポーネントで共有される
  return { settings, updateSettings, resetSettings };
}
```

## 注意点・制約

- Vite+ はアルファ段階（2026-03 時点）。peer dependency 警告が出るが動作には影響なし
- `vp test` のテスト対象は `vite.config.ts` の `test.include` で制御する（`docs/reference/` の Angular テストを除外するため `["src/**/*.test.ts"]` を設定）
- `vp install` / `vp add` はサプライチェーンリスクがあるため ask 権限にする

## 参照

- https://voidzero.dev/posts/announcing-vite-plus-alpha — Vite+ 公式アナウンス
- https://viteplus.dev/guide/ — Vite+ ドキュメント
- `vite.config.ts` — プロジェクトの Vite+ 設定
- `package.json` — 依存関係とオーバーライド設定
