import type { GameDefinition } from "@/types/game";

export const GAME_DEFINITIONS: GameDefinition[] = [
  {
    id: "email_polish",
    title: "取引先メールを整えろ",
    description: "雑なメール文を取引先向けに丁寧な文章へ変換する",
    category: "email_polish",
    timeLimit: 30,
    difficulty: "normal",
    inputType: "textarea",
    scoringType: "ai",
    promptType: "email_polish",
  },
  {
    id: "calculation",
    title: "事務計算を片付けろ",
    description: "2桁の足し算・引き算・簡単な合計金額を計算する",
    category: "calculation",
    timeLimit: 30,
    difficulty: "easy",
    inputType: "number",
    scoringType: "hybrid",
    promptType: "calculation",
  },
  {
    id: "keigo",
    title: "敬語に変換せよ",
    description: "カジュアルな文章をビジネス敬語に変換する",
    category: "keigo",
    timeLimit: 30,
    difficulty: "normal",
    inputType: "textarea",
    scoringType: "ai",
    promptType: "keigo",
  },
  {
    id: "summary",
    title: "一文に要約せよ",
    description: "短い文章を一文で要約する",
    category: "summary",
    timeLimit: 30,
    difficulty: "normal",
    inputType: "textarea",
    scoringType: "ai",
    promptType: "summary",
  },
  {
    id: "priority",
    title: "最優先タスクを見抜け",
    description: "複数の業務タスクから最優先のものを選ぶ",
    category: "priority",
    timeLimit: 30,
    difficulty: "normal",
    inputType: "choice",
    scoringType: "hybrid",
    promptType: "priority",
  },
];

export function getDefinition(gameType: string): GameDefinition | undefined {
  return GAME_DEFINITIONS.find((d) => d.category === gameType);
}
