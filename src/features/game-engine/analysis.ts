import type { TaskRecord, WeekAnalysis } from "@/types/game";

export const CATEGORY_LABELS: Record<string, string> = {
  email_polish: "メール丁寧化",
  calculation: "事務計算",
  keigo: "敬語変換",
  summary: "要約",
  priority: "優先順位判断",
};

const CATEGORY_ADVICE: Record<string, string> = {
  email_polish:
    "「お世話になっております」で始め、依頼は「〜いただけますでしょうか」と疑問形に、最後は「よろしくお願いいたします」で締めると安定します。",
  calculation:
    "急ぐほどミスが出ます。最初の5秒で式を立ててから計算し、提出前に1秒だけ見直す癖をつけましょう。",
  keigo:
    "「了解→承知いたしました」「あとで→後ほど」「いない→席を外しております」など、よく出る変換パターンを覚えると速くなります。",
  summary:
    "「誰が・何を・どうなった」の3点だけ残し、理由や経緯は思い切って削るのが一文要約のコツです。",
  priority:
    "「締切が近い」「相手を待たせている」ものが最優先。自分だけで完結するタスクは後回しでOKです。",
};

export function analyzeWeek(records: TaskRecord[]): WeekAnalysis {
  if (records.length === 0) {
    return {
      averageScore: 0,
      clearCount: 0,
      bestDay: { day: "-", label: "-", score: 0 },
      worstDay: { day: "-", label: "-", score: 0 },
      strength: "-",
      weakness: "-",
      advice: "",
    };
  }

  const averageScore = Math.round(
    records.reduce((sum, r) => sum + r.score, 0) / records.length
  );
  const clearCount = records.filter((r) => r.isClear).length;

  const best = records.reduce((a, b) => (b.score > a.score ? b : a));
  const worst = records.reduce((a, b) => (b.score < a.score ? b : a));

  const label = (r: TaskRecord) => CATEGORY_LABELS[r.gameType] ?? r.gameType;

  return {
    averageScore,
    clearCount,
    bestDay: { day: best.day, label: label(best), score: best.score },
    worstDay: { day: worst.day, label: label(worst), score: worst.score },
    strength: label(best),
    weakness: label(worst),
    advice: CATEGORY_ADVICE[worst.gameType] ?? "",
  };
}
