# Vue 3 コーディングパターン集

## 発見した知見

### defineAsyncComponent によるバンドル分割

重い依存（Tiptap、DOMPurify 等）を含むコンポーネントは `defineAsyncComponent` で遅延ロードする。
初回表示に不要なチャンクを分離し、メインバンドルを軽量に保つ。

```typescript
import { defineAsyncComponent } from "vue";

const HeavyEditor = defineAsyncComponent({
  loader: () => import("./HeavyEditor.vue"),
  loadingComponent: { template: '<p class="text-sm text-gray-400">読み込み中…</p>' },
  errorComponent: { template: '<p class="text-sm text-red-500">読み込みに失敗</p>' },
  delay: 200,      // ローディング表示までの待機時間
  timeout: 10000,  // タイムアウト → エラーコンポーネントに切り替え
});
```

**必ず loadingComponent / errorComponent を指定する。** 未指定だとチャンク取得失敗時にコンポーネントが無言で消える。

**効果例:** Tiptap を分離してメインチャンク 560KB → 152KB（72%削減）。

### ref<Map> のリアクティビティ

Vue 3 の `ref<Map>` は `.set()` による値変更をリアクティブに検知しない場合がある。
テンプレートで `.size` を参照する場合など、Map の参照自体を更新する必要がある。

```typescript
// ❌ .set() だけでは再描画されない場合がある
publicMemos.value.set(id, memo);

// ✅ 新しい Map を作って参照を更新
const next = new Map(publicMemos.value);
next.set(id, memo);
publicMemos.value = next;
```

### Tiptap エディタの外部同期

`useEditor` の `content` は初期化時の値のみ。外部から状態が更新されてもエディタに反映されない。
`watch` で変更を検知して `setContent` を呼ぶ。

```typescript
watch(
  () => myMemo.value.publicContent,
  (newContent) => {
    if (editor.value && editor.value.getHTML() !== newContent) {
      editor.value.commands.setContent(newContent, { emitUpdate: false });
    }
  },
);
```

**注意:** Tiptap 3.x では `setContent(content, false)` は型エラー。`{ emitUpdate: false }` を使う。

### WebRTC 経由 HTML の XSS 対策

`v-html` で WebRTC 経由のコンテンツを表示する場合、DOMPurify でサニタイズが必須。
Tiptap の `getHTML()` は `<script>` や `javascript:` を除去しない。

```typescript
import DOMPurify from "dompurify";

const sanitizedContent = computed(() => DOMPurify.sanitize(rawHtml));
```

### アクセシビリティ実装方針（オーナーフィードバック 2026-05-16 改訂）

**何を一級に置くか**: ネイティブブラウザでマウス/タッチ操作するユーザー体験を一級とする。
判断は以下の2軸で行う。

#### 軸 A: キーボード操作性は全員の快適さ要件

ネイティブブラウザの操作性を向上させるキーボード関連実装は、マウス/タッチ操作者にも便益がある。

| 推奨 | 理由 |
|---|---|
| Tab で全要素を巡回できる | 高速操作・補完入力ユーザーに有用 |
| `:focus-visible` で見えるフォーカスリング | 現在位置が分かる |
| ネイティブ `<button>` / `<dialog>` を使う | Enter/Space/Esc を自動取得 |
| キーボードショートカット (Space=スタート 等) | 慣れたユーザーが高速操作可能 |

| 禁止 | 理由 |
|---|---|
| `outline-none` 単体 | フォーカスが見えなくなる |
| ネイティブ要素を `<div>` に置き換え | Enter/Space ハンドラを自前実装する手間と漏れリスク |

#### 軸 B: 情報伝達経路は「気づくか」で判定する

`title` 属性ツールチップは表示まで約 2 秒の遅延があり、存在に気づかれない = 無いのと同じ。
ネイティブ体験の致命的な損失なので、アイコンのみボタンの意味伝達を `title` だけに頼るのは不可。

```html
<!-- NG: 意味が title 待ち、気づかれない -->
<button title="不在にする">⊖</button>

<!-- OK: 視覚テキスト併記 -->
<button>⊖ 不在</button>

<!-- OK: コンテキストで意味が伝わる場合は aria-label のみ残置 -->
<button :aria-label="`${p.name}を不在にする`">⊖</button>
<!-- ↑ ただし周囲のラベルから意味が伝わる UI 設計が前提 -->
```

| 配置パターン | 判定 |
|---|---|
| 視覚テキスト or アイコン+短文 | 推奨（軸 B 合格） |
| aria-label のみ（読み上げ補助） | 残置可（視覚伝達は別途確保） |
| title のみで意味伝達 | NG |

#### 残置 OK / 害なし

- `role="progressbar"` + `aria-valuenow` 系: `<div>` ベースの進捗バーで意味補完、害なし
- `role="alert"` / `role="status"`: 通知の意味づけ、害なし
- `aria-hidden="true"` 装飾要素: 害なし

#### 過去の経緯

Plan 0012 (2026-03-28) で WCAG 2.1 AA を目指し ARIA を網羅的に追加したが、本方針に基づき
Plan 0018 で再評価する。

## プロジェクトへの適用

- `src/components/TimerView.vue` — バンドル分割、プログレスバー aria（Plan 0018 で再評価予定）
- `src/components/MemoEditor.vue` — Tiptap 外部同期
- `src/components/PublicMemoList.vue` — DOMPurify サニタイズ
- `src/composables/useMemo.ts` — Map リアクティビティ

## 参照

- [Vue 3 Async Components](https://vuejs.org/guide/components/async.html)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [WAI-ARIA Progressbar](https://www.w3.org/WAI/ARIA/apd/role/progressbar/)
