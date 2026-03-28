<script setup lang="ts">
import { ref, watch } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import { useMemo } from "../composables/useMemo";

const { myMemo, updatePublicMemo, updatePrivateMemo } = useMemo();

const activeTab = ref<"public" | "private">("public");

const publicEditor = useEditor({
  content: myMemo.value.publicContent,
  extensions: [StarterKit],
  onUpdate: ({ editor }) => {
    updatePublicMemo(editor.getHTML());
  },
});

const privateEditor = useEditor({
  content: myMemo.value.privateContent,
  extensions: [StarterKit],
  onUpdate: ({ editor }) => {
    updatePrivateMemo(editor.getHTML());
  },
});

// 外部からメモが更新された場合（ルーム同期など）にエディタを同期
watch(
  () => myMemo.value.publicContent,
  (newContent) => {
    if (publicEditor.value && publicEditor.value.getHTML() !== newContent) {
      publicEditor.value.commands.setContent(newContent, false);
    }
  },
);

watch(
  () => myMemo.value.privateContent,
  (newContent) => {
    if (privateEditor.value && privateEditor.value.getHTML() !== newContent) {
      privateEditor.value.commands.setContent(newContent, false);
    }
  },
);
</script>

<template>
  <div class="memo-editor">
    <!-- タブ切り替え -->
    <div class="flex border-b border-gray-200 mb-2">
      <button
        class="px-3 py-1.5 text-sm font-medium border-b-2 transition-colors"
        :class="
          activeTab === 'public'
            ? 'border-emerald-600 text-emerald-700'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        "
        @click="activeTab = 'public'"
      >
        公開メモ
      </button>
      <button
        class="px-3 py-1.5 text-sm font-medium border-b-2 transition-colors"
        :class="
          activeTab === 'private'
            ? 'border-purple-600 text-purple-700'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        "
        @click="activeTab = 'private'"
      >
        秘匿メモ
      </button>
    </div>

    <!-- エディタ -->
    <div v-show="activeTab === 'public'" class="editor-wrapper">
      <EditorContent :editor="publicEditor" class="prose prose-sm max-w-none" />
    </div>
    <div v-show="activeTab === 'private'" class="editor-wrapper">
      <EditorContent :editor="privateEditor" class="prose prose-sm max-w-none" />
    </div>
  </div>
</template>

<style scoped>
.editor-wrapper :deep(.tiptap) {
  min-height: 120px;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
}
.editor-wrapper :deep(.tiptap:focus) {
  border-color: #059669;
  box-shadow: 0 0 0 1px #059669;
}
.editor-wrapper :deep(.tiptap p) {
  margin: 0.25em 0;
}
.editor-wrapper :deep(.tiptap ul),
.editor-wrapper :deep(.tiptap ol) {
  padding-left: 1.5em;
}
</style>
