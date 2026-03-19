import { createRouter, createWebHashHistory, type RouteRecordRaw } from "vue-router";
import TimerView from "../components/TimerView.vue";
import RoomTimerView from "../components/RoomTimerView.vue";
import ParticipantList from "../components/ParticipantList.vue";
import SettingsView from "../components/SettingsView.vue";
import HelpView from "../components/HelpView.vue";

const routes: RouteRecordRaw[] = [
  { path: "/", name: "timer", component: TimerView },
  { path: "/room", name: "room", component: RoomTimerView },
  { path: "/room/:roomId", name: "room-join", component: RoomTimerView },
  { path: "/participants", name: "participants", component: ParticipantList },
  { path: "/settings", name: "settings", component: SettingsView },
  { path: "/help", name: "help", component: HelpView },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
