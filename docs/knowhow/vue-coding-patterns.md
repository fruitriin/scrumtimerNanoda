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

### アクセシビリティの基本パターン

```html
<!-- プログレスバー -->
<div role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100"
     aria-label="全体進捗" :aria-valuetext="formatTime(remaining) + ' 残り'">

<!-- アイコンのみボタン -->
<button :aria-label="participant.name + 'を不在にする'" title="不在にする">⊖</button>

<!-- ステータス表示（自動読み上げ） -->
<span role="status">{{ statusLabel }}</span>

<!-- エラーメッセージ（即時読み上げ） -->
<div role="alert">{{ errorMessage }}</div>

<!-- ナビゲーション -->
<nav aria-label="メインナビゲーション">
```

## プロジェクトへの適用

- `src/components/TimerView.vue` — バンドル分割、プログレスバー aria
- `src/components/MemoEditor.vue` — Tiptap 外部同期
- `src/components/PublicMemoList.vue` — DOMPurify サニタイズ
- `src/composables/useMemo.ts` — Map リアクティビティ

## 参照

- [Vue 3 Async Components](https://vuejs.org/guide/components/async.html)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [WAI-ARIA Progressbar](https://www.w3.org/WAI/ARIA/apd/role/progressbar/)
