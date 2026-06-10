import { describe, it, expect } from "vitest";
import { analyzeWeek } from "../analysis";
import type { TaskRecord } from "@/types/game";

function record(partial: Partial<TaskRecord>): TaskRecord {
  return {
    day: "月曜日",
    gameType: "calculation",
    title: "事務計算",
    question: "1+1",
    userAnswer: "2",
    score: 80,
    rank: "A",
    isClear: true,
    feedback: "",
    goodPoint: "",
    improvement: "",
    ...partial,
  };
}

describe("analyzeWeek", () => {
  const records: TaskRecord[] = [
    record({ day: "月曜日", gameType: "calculation", score: 100, rank: "S" }),
    record({ day: "火曜日", gameType: "email_polish", score: 40, rank: "C", isClear: false }),
    record({ day: "水曜日", gameType: "keigo", score: 70, rank: "A" }),
    record({ day: "木曜日", gameType: "summary", score: 60, rank: "B" }),
    record({ day: "金曜日", gameType: "priority", score: 90, rank: "S" }),
  ];

  it("平均スコアを計算する", () => {
    expect(analyzeWeek(records).averageScore).toBe(72);
  });

  it("最高の日と最低の日を特定する", () => {
    const a = analyzeWeek(records);
    expect(a.bestDay.day).toBe("月曜日");
    expect(a.worstDay.day).toBe("火曜日");
  });

  it("得意・苦手カテゴリを日本語ラベルで返す", () => {
    const a = analyzeWeek(records);
    expect(a.strength).toContain("事務計算");
    expect(a.weakness).toContain("メール丁寧化");
  });

  it("苦手カテゴリに応じたアドバイスを返す", () => {
    const a = analyzeWeek(records);
    expect(a.advice.length).toBeGreaterThan(0);
  });

  it("クリア数を数える", () => {
    expect(analyzeWeek(records).clearCount).toBe(4);
  });

  it("空の記録でも落ちない", () => {
    const a = analyzeWeek([]);
    expect(a.averageScore).toBe(0);
    expect(a.clearCount).toBe(0);
  });
});
