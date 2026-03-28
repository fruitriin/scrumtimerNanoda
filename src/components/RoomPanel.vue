<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoom } from "../composables/useRoom";
import { useRouter } from "vue-router";

const router = useRouter();
const {
  roomId,
  isHost,
  connectedPeers,
  connectionStatus,
  errorMessage,
  createRoom,
  joinRoom,
  leaveRoom,
} = useRoom();

const joinId = ref("");

const isConnected = computed(() => connectionStatus.value === "connected");
const isInRoom = computed(() => roomId.value !== null);

const statusLabel = computed(() => {
  switch (connectionStatus.value) {
    case "connected":
      return "接続済み";
    case "connecting":
      return "接続中...";
    case "migrating":
      return "ホスト移行中...";
    case "disconnected":
      return "未接続";
  }
});

const statusColor = computed(() => {
  switch (connectionStatus.value) {
    case "connected":
      return "bg-emerald-500";
    case "connecting":
      return "bg-yellow-500 animate-pulse";
    case "migrating":
      return "bg-orange-500 animate-pulse";
    case "disconnected":
      return "bg-gray-400";
  }
});

function handleCreate() {
  const id = createRoom();
  router.push(`/room/${id}`);
}

function handleJoin() {
  const id = joinId.value.trim();
  if (!id) return;
  joinRoom(id);
  router.push(`/room/${id}`);
}

function handleLeave() {
  leaveRoom();
  router.push("/");
}

async function copyRoomUrl() {
  if (!roomId.value) return;
  const url = `${window.location.origin}${window.location.pathname}#/room/${roomId.value}`;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // フォールバック: アラートで表示
    window.alert(url);
  }
}
</script>

<template>
  <div class="bg-white rounded-lg border p-4 mb-4">
    <!-- ルーム未参加 -->
    <div v-if="!isInRoom">
      <div class="flex gap-2 mb-3">
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          @click="handleCreate"
        >
          🏠 ルームを作成
        </button>
      </div>
      <div class="flex gap-2">
        <input
          v-model="joinId"
          type="text"
          placeholder="ルーム ID を入力"
          class="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          @keydown.enter="handleJoin"
        />
        <button
          class="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          @click="handleJoin"
        >
          🔗 参加
        </button>
      </div>
    </div>

    <!-- ルーム参加中 -->
    <div v-else>
      <div class="flex items-center gap-3 mb-3">
        <!-- 接続状態インジケーター -->
        <span class="inline-flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full" :class="statusColor" />
          <span class="text-sm text-gray-600">{{ statusLabel }}</span>
        </span>

        <span class="text-sm text-gray-500">
          {{ isHost ? "ホスト" : "ゲスト" }}
        </span>

        <span v-if="isConnected" class="text-sm text-gray-500">
          👤 {{ connectedPeers + 1 }} 人
        </span>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
          {{ roomId }}
        </span>
        <button
          class="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
          @click="copyRoomUrl"
        >
          📋 URL コピー
        </button>
        <button
          class="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
          @click="handleLeave"
        >
          退出
        </button>
      </div>

      <!-- エラーメッセージ -->
      <div v-if="errorMessage" class="mt-2 text-sm text-red-500">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>
