import type { Participant } from "../types";

/** 新しい参加者を作成する */
export function createParticipant(name: string): Participant {
  return {
    id: crypto.randomUUID(),
    name,
    time: 0,
  };
}
