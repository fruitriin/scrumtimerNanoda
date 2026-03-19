import type { Participant } from "../types";

/** 新しい参加者を作成する */
export function createParticipant(name: string, order: number): Participant {
  return {
    id: crypto.randomUUID(),
    name,
    maxTime: 0,
    absent: false,
    order,
  };
}
