export type GameCategory =
  | "email_polish"
  | "calculation"
  | "keigo"
  | "summary"
  | "priority"
  | "typo_fix"
  | "reply"
  | "custom";

export type InputType = "text" | "number" | "choice" | "textarea";
export type ScoringType = "ai" | "exact" | "hybrid";
export type Rank = "S" | "A" | "B" | "C";

export type GameDefinition = {
  id: string;
  title: string;
  description: string;
  category: GameCategory;
  timeLimit: number;
  difficulty: "easy" | "normal" | "hard";
  inputType: InputType;
  scoringType: ScoringType;
  promptType: string;
};

export type GameTask = {
  id: string;
  dayIndex: number;
  dayLabel: string;
  gameType: GameCategory;
  title: string;
  question: string;
  choices?: string[];
  expectedAnswer: string;
  timeLimit: number;
  inputType: InputType;
  scoringType: ScoringType;
};

export type AiSource = "ai" | "local" | "exact";

export type ScoreResult = {
  source?: AiSource;
  aiError?: string | null;
  score: number;
  rank: Rank;
  isClear: boolean;
  feedback: string;
  goodPoint: string;
  improvement: string;
  damage: number;
  freedomGain: number;
  battleMessage: string;
  rewardItem: string;
};

export type DayResult = {
  day: string;
  gameType: GameCategory;
  score: number;
  rank: Rank;
};

export type TaskRecord = {
  day: string;
  gameType: GameCategory;
  title: string;
  question: string;
  userAnswer: string;
  score: number;
  rank: Rank;
  isClear: boolean;
  feedback: string;
  goodPoint: string;
  improvement: string;
};

export type WeekAnalysis = {
  averageScore: number;
  clearCount: number;
  bestDay: { day: string; label: string; score: number };
  worstDay: { day: string; label: string; score: number };
  strength: string;
  weakness: string;
  advice: string;
};

export type WeekendPlan = {
  morning: string;
  afternoon: string;
  night: string;
};

export type Ending = {
  source?: AiSource;
  aiError?: string | null;
  analysisComment?: string;
  endingTitle: string;
  clearRank: Rank;
  saturdayTheme: string;
  saturdayPlan: WeekendPlan;
  sundayTheme: string;
  sundayPlan: WeekendPlan;
  nextWeekBuff: string;
  finalMessage: string;
};
