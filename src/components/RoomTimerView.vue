<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { useRoom } from "../composables/useRoom";
import RoomPanel from "./RoomPanel.vue";
import TimerView from "./TimerView.vue";

const { roomId, joinRoom } = useRoom();
const route = useRoute();

// ルーム URL から自動参加
onMounted(() => {
  const id = route.params.roomId;
  if (typeof id === "string" && id && !roomId.value) {
    joinRoom(id);
  }
});
</script>

<template>
  <div class="p-4 max-w-2xl mx-auto">
    <RoomPanel />
    <TimerView />
  </div>
</template>
