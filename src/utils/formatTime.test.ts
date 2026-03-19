import { describe, it, expect } from "vitest";
import { formatTime } from "./formatTime";

describe("formatTime", () => {
  it("0秒を 00:00 に変換するのだ", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("59秒を 00:59 に変換するのだ", () => {
    expect(formatTime(59)).toBe("00:59");
  });

  it("60秒を 01:00 に変換するのだ", () => {
    expect(formatTime(60)).toBe("01:00");
  });

  it("90秒を 01:30 に変換するのだ", () => {
    expect(formatTime(90)).toBe("01:30");
  });

  it("600秒を 10:00 に変換するのだ", () => {
    expect(formatTime(600)).toBe("10:00");
  });

  it("負の値は 00:00 にするのだ", () => {
    expect(formatTime(-5)).toBe("00:00");
  });

  it("小数は切り捨てるのだ", () => {
    expect(formatTime(61.9)).toBe("01:01");
  });
});
