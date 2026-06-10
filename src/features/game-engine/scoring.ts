import type { GameCategory, Rank, ScoreResult } from "@/types/game";

export function rankFromScore(score: number): Rank {
  if (score >= 90) return "S";
  if (score >= 70) return "A";
  if (score >= 50) return "B";
  return "C";
}

export function timeBonus(elapsedTime: number, timeLimit: number): number {
  return Math.max(0, timeLimit - elapsedTime);
}

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[，,]/g, "")
    .toLowerCase();
}

export function scoreExact(
  userAnswer: string,
  expectedAnswer: string,
  elapsedTime: number,
  timeLimit: number
): number {
  if (normalizeAnswer(userAnswer) !== normalizeAnswer(expectedAnswer)) {
    return 0;
  }
  return Math.min(100, 70 + timeBonus(elapsedTime, timeLimit));
}

export function freedomGainFromScore(score: number): number {
  return Math.max(5, Math.ceil(score * 0.2));
}

const POLITE_PATTERNS = [
  /お世話になっております/,
  /恐れ入りますが/,
  /お手数ですが|お手数をおかけしますが/,
  /いただけますでしょうか|いただけますと幸いです|いただけませんでしょうか/,
  /よろしくお願いいたします|よろしくお願い申し上げます/,
  /ご送付|ご確認|ご対応|ご連絡|ご査収/,
  /ですます?[。、]?$|ます[。、]?$/m,
  /申し訳ございません|申し訳ありません/,
  /ございます/,
  /いたします|致します/,
];

function scorePoliteText(userAnswer: string): number {
  if (!userAnswer.trim()) return 0;
  let score = 30;
  for (const pattern of POLITE_PATTERNS) {
    if (pattern.test(userAnswer)) score += 10;
  }
  if (userAnswer.length >= 20) score += 10;
  return Math.min(100, score);
}

const MONSTERS: Record<string, string> = {
  email_polish: "事務スライム",
  calculation: "電卓ゴーレム",
  keigo: "敬語ドラゴン",
  summary: "議事録ウルフ",
  priority: "締切リーパー",
  typo_fix: "誤字ゴブリン",
  reply: "受信トレイの主",
  custom: "残業の影",
};

const REWARDS: Record<string, string> = {
  email_polish: "丁寧語の羽ペン",
  calculation: "そろばんの護符",
  keigo: "謙譲のマント",
  summary: "要約の巻物",
  priority: "優先順位の羅針盤",
  typo_fix: "校正の虫眼鏡",
  reply: "即レスの靴",
  custom: "自由のかけら",
};

export type LocalScoreInput = {
  gameType: GameCategory;
  question: string;
  expectedAnswer: string;
  userAnswer: string;
  elapsedTime: number;
  timeLimit: number;
};

export function scoreAnswerLocally(input: LocalScoreInput): ScoreResult {
  const { gameType, expectedAnswer, userAnswer, elapsedTime, timeLimit } =
    input;

  let score: number;
  if (gameType === "calculation" || gameType === "priority") {
    score = scoreExact(userAnswer, expectedAnswer, elapsedTime, timeLimit);
  } else {
    score = scorePoliteText(userAnswer);
  }

  const rank = rankFromScore(score);
  const isClear = score >= 50;
  const freedomGain = freedomGainFromScore(score);
  const monster = MONSTERS[gameType] ?? MONSTERS.custom;

  return {
    score,
    rank,
    isClear,
    feedback: isClear
      ? "落ち着いて対応できました。良い仕事です。"
      : "焦らなくて大丈夫。明日はもっとうまくいきます。",
    goodPoint: isClear
      ? "制限時間内に形にできた点が素晴らしいです。"
      : "挑戦したこと自体が前進です。",
    improvement: isClear
      ? "さらに磨けば満点も狙えます。"
      : "もう一度問題文を読み、要点を押さえましょう。",
    damage: score,
    freedomGain,
    battleMessage: isClear
      ? `見事な対応！${monster}に${score}ダメージ！`
      : `${monster}に攻撃を防がれた…ダメージ${score}！`,
    rewardItem: isClear ? REWARDS[gameType] ?? REWARDS.custom : "ざらめ煎餅",
  };
}
