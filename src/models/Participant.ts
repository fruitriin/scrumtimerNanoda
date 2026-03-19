import type { Participant } from "../types";

/** 新しい参加者を作成する */
export function createParticipant(init: string, name: string): Participant {
  return {
    id: crypto.randomUUID(),
    init,
    name,
    time: 0,
  };
}
