import { describe, it, expect } from "vitest";
import {
  DAY_LABELS,
  daysUntilFreedom,
  addFreedomGauge,
  finalRankFromGauge,
} from "../progress";

describe("DAY_LABELS", () => {
  it("月曜から金曜の5日分ある", () => {
    expect(DAY_LABELS).toEqual([
      "月曜日",
      "火曜日",
      "水曜日",
      "木曜日",
      "金曜日",
    ]);
  });
});

describe("daysUntilFreedom", () => {
  it("月曜開始時点で自由まで5日", () => {
    expect(daysUntilFreedom(0)).toBe(5);
  });
  it("金曜開始時点で自由まで1日", () => {
    expect(daysUntilFreedom(4)).toBe(1);
  });
  it("全日終了で0日", () => {
    expect(daysUntilFreedom(5)).toBe(0);
  });
});

describe("addFreedomGauge", () => {
  it("ゲージが加算される", () => {
    expect(addFreedomGauge(20, 18)).toBe(38);
  });
  it("100を超えない", () => {
    expect(addFreedomGauge(95, 20)).toBe(100);
  });
  it("0を下回らない", () => {
    expect(addFreedomGauge(0, -10)).toBe(0);
  });
});

describe("finalRankFromGauge", () => {
  it("90以上はS", () => {
    expect(finalRankFromGauge(92)).toBe("S");
  });
  it("70以上はA", () => {
    expect(finalRankFromGauge(75)).toBe("A");
  });
  it("50以上はB", () => {
    expect(finalRankFromGauge(55)).toBe("B");
  });
  it("50未満はC", () => {
    expect(finalRankFromGauge(30)).toBe("C");
  });
});
