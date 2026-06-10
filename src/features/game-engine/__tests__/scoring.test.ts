import { describe, it, expect } from "vitest";
import {
  rankFromScore,
  timeBonus,
  scoreExact,
  freedomGainFromScore,
  scoreAnswerLocally,
} from "../scoring";

describe("rankFromScore", () => {
  it("90以上はS", () => {
    expect(rankFromScore(90)).toBe("S");
    expect(rankFromScore(100)).toBe("S");
  });
  it("70以上90未満はA", () => {
    expect(rankFromScore(70)).toBe("A");
    expect(rankFromScore(89)).toBe("A");
  });
  it("50以上70未満はB", () => {
    expect(rankFromScore(50)).toBe("B");
    expect(rankFromScore(69)).toBe("B");
  });
  it("50未満はC", () => {
    expect(rankFromScore(0)).toBe("C");
    expect(rankFromScore(49)).toBe("C");
  });
});

describe("timeBonus", () => {
  it("即答なら制限時間に近いボーナス", () => {
    expect(timeBonus(0, 30)).toBe(30);
  });
  it("時間切れならボーナス0", () => {
    expect(timeBonus(30, 30)).toBe(0);
    expect(timeBonus(40, 30)).toBe(0);
  });
  it("途中なら残り時間分", () => {
    expect(timeBonus(22, 30)).toBe(8);
  });
});

describe("scoreExact", () => {
  it("正解は基礎70点+タイムボーナス", () => {
    expect(scoreExact("85", "85", 10, 30)).toBe(90);
  });
  it("正解かつ即答で100点を超えない", () => {
    expect(scoreExact("85", "85", 0, 30)).toBe(100);
  });
  it("不正解は0点", () => {
    expect(scoreExact("84", "85", 5, 30)).toBe(0);
  });
  it("空白や全角数字も正規化して判定する", () => {
    expect(scoreExact(" ８５ ", "85", 10, 30)).toBe(90);
  });
});

describe("freedomGainFromScore", () => {
  it("満点で20%", () => {
    expect(freedomGainFromScore(100)).toBe(20);
  });
  it("0点でも最低5%", () => {
    expect(freedomGainFromScore(0)).toBe(5);
  });
  it("86点なら18%", () => {
    expect(freedomGainFromScore(86)).toBe(18);
  });
});

describe("scoreAnswerLocally", () => {
  it("計算問題の正解はクリア扱いになる", () => {
    const result = scoreAnswerLocally({
      gameType: "calculation",
      question: "48 + 37 = ?",
      expectedAnswer: "85",
      userAnswer: "85",
      elapsedTime: 10,
      timeLimit: 30,
    });
    expect(result.score).toBe(90);
    expect(result.rank).toBe("S");
    expect(result.isClear).toBe(true);
    expect(result.freedomGain).toBeGreaterThan(0);
  });

  it("計算問題の不正解はクリアにならない", () => {
    const result = scoreAnswerLocally({
      gameType: "calculation",
      question: "48 + 37 = ?",
      expectedAnswer: "85",
      userAnswer: "80",
      elapsedTime: 10,
      timeLimit: 30,
    });
    expect(result.score).toBe(0);
    expect(result.isClear).toBe(false);
  });

  it("丁寧なメール文は加点される", () => {
    const polite = scoreAnswerLocally({
      gameType: "email_polish",
      question: "明日までに資料送ってください。",
      expectedAnswer: "取引先向けの丁寧な依頼文になっていること",
      userAnswer:
        "お世話になっております。恐れ入りますが、明日までに資料をご送付いただけますでしょうか。よろしくお願いいたします。",
      elapsedTime: 20,
      timeLimit: 30,
    });
    const rude = scoreAnswerLocally({
      gameType: "email_polish",
      question: "明日までに資料送ってください。",
      expectedAnswer: "取引先向けの丁寧な依頼文になっていること",
      userAnswer: "資料送って",
      elapsedTime: 20,
      timeLimit: 30,
    });
    expect(polite.score).toBeGreaterThan(rude.score);
    expect(polite.isClear).toBe(true);
  });

  it("選択問題は正解の選択肢でクリアになる", () => {
    const result = scoreAnswerLocally({
      gameType: "priority",
      question: "最優先のタスクはどれ？",
      expectedAnswer: "B",
      userAnswer: "B",
      elapsedTime: 5,
      timeLimit: 30,
    });
    expect(result.isClear).toBe(true);
  });
});
