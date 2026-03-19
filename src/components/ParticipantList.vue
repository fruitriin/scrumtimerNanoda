<script setup lang="ts">
import { ref } from "vue";
import { useParticipants } from "../composables/useParticipants";

const { participants, add, remove, exportToJSON, importFromJSON, purge } = useParticipants();

const newInit = ref("");
const newName = ref("");
const importText = ref("");
const showImport = ref(false);

function handleAdd() {
  const init = newInit.value.trim();
  const name = newName.value.trim();
  if (!init || !name) return;
  add(init, name);
  newInit.value = "";
  newName.value = "";
}

async function handleExport() {
  const json = exportToJSON();
  try {
    await navigator.clipboard.writeText(json);
  } catch {
    // クリップボード API が使えない場合はフォールバック
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
</script>

<template>
  <div class="p-4 max-w-2xl mx-auto">
    <h2 class="text-2xl font-bold mb-4">参加者管理</h2>

    <!-- 追加フォーム -->
    <form class="flex gap-2 mb-4" @submit.prevent="handleAdd">
      <input
        v-model="newInit"
        type="text"
        placeholder="イニシャル"
        class="w-20 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
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

    <!-- 参加者一覧 -->
    <ul class="space-y-1 mb-4">
      <li
        v-for="p in participants"
        :key="p.id"
        class="flex items-center gap-2 px-3 py-2 bg-white rounded border"
      >
        <span class="font-mono text-sm text-gray-500 w-12">{{ p.init }}</span>
        <span class="flex-1">{{ p.name }}</span>
        <button class="text-red-400 hover:text-red-600" title="削除" @click="remove(p.id)">
          ✕
        </button>
      </li>
      <li v-if="participants.length === 0" class="text-gray-400 text-center py-4">
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
