<script setup lang="ts">
import { ref } from "vue";
import { useParticipants } from "../composables/useParticipants";

const { masterParticipants, add, remove, moveParticipant, exportToJSON, importFromJSON, purge } =
  useParticipants();

const newName = ref("");
const importText = ref("");
const showImport = ref(false);
const dragIndex = ref<number | null>(null);

function handleAdd() {
  const name = newName.value.trim();
  if (!name) return;
  add(name);
  newName.value = "";
}

async function handleExport() {
  const json = exportToJSON();
  try {
    await navigator.clipboard.writeText(json);
  } catch {
    importText.value = json;
    showImport.value = true;
  }
}

function handleImport() {
  if (!importText.value.trim()) return;
  importFromJSON(importText.value);
  importText.value = "";
  showImport.value = false;
}

// ドラッグ＆ドロップ
function onDragStart(index: number) {
  dragIndex.value = index;
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
}

function onDrop(toIndex: number) {
  if (dragIndex.value !== null && dragIndex.value !== toIndex) {
    moveParticipant(dragIndex.value, toIndex);
  }
  dragIndex.value = null;
}

function onDragEnd() {
  dragIndex.value = null;
}
</script>

<template>
  <div class="p-4 max-w-2xl mx-auto">
    <h2 class="text-2xl font-bold mb-4">参加者管理</h2>

    <!-- 追加フォーム -->
    <form class="flex gap-2 mb-4" @submit.prevent="handleAdd">
      <input
        v-model="newName"
        type="text"
        placeholder="名前"
        class="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <button
        type="submit"
        class="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
      >
        追加
      </button>
    </form>

    <!-- 参加者一覧（ドラッグ＆ドロップ対応） -->
    <ul class="space-y-1 mb-4">
      <li
        v-for="(p, i) in masterParticipants"
        :key="p.id"
        draggable="true"
        class="flex items-center gap-2 px-3 py-2 bg-white rounded border cursor-grab active:cursor-grabbing transition-opacity"
        :class="{ 'opacity-40': dragIndex === i }"
        @dragstart="onDragStart(i)"
        @dragover="onDragOver"
        @drop="onDrop(i)"
        @dragend="onDragEnd"
      >
        <span class="text-gray-300 select-none">⠿</span>
        <span class="flex-1">{{ p.name }}</span>
        <button class="text-red-400 hover:text-red-600" title="削除" @click="remove(p.id)">
          ✕
        </button>
      </li>
      <li v-if="masterParticipants.length === 0" class="text-gray-400 text-center py-4">
        参加者がいないのだ。上のフォームから追加するのだ！
      </li>
    </ul>

    <!-- Import/Export ボタン -->
    <div class="flex gap-2">
      <button class="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300" @click="handleExport">
        📋 エクスポート（クリップボード）
      </button>
      <button
        class="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        @click="showImport = !showImport"
      >
        📥 インポート
      </button>
      <button
        class="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
        @click="purge"
      >
        🗑 全削除
      </button>
    </div>

    <!-- インポートエリア -->
    <div v-if="showImport" class="mt-4">
      <textarea
        v-model="importText"
        rows="4"
        placeholder="JSON を貼り付けるのだ"
        class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <button
        class="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        @click="handleImport"
      >
        インポート実行
      </button>
    </div>
  </div>
</template>
