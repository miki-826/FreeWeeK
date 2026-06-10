import { NextResponse } from "next/server";
import { callOpenAIJson } from "@/features/ai/openaiClient";
import { GENERATE_ENDING_SYSTEM } from "@/features/ai/prompts";
import { finalRankFromGauge } from "@/features/game-engine/progress";
import type { DayResult, Ending, Rank } from "@/types/game";

type AiEnding = Omit<Ending, "clearRank">;

const ENDING_TITLES: Record<Rank, string> = {
  S: "完全自由解放者",
  A: "平日突破者",
  B: "週末生還者",
  C: "ギリギリ退勤者",
};

function buildLocalEnding(gauge: number): Ending {
  const clearRank = finalRankFromGauge(gauge);
  const restful = clearRank === "C" || clearRank === "B";
  return {
    endingTitle: ENDING_TITLES[clearRank],
    clearRank,
    saturdayTheme: restful ? "何もしない贅沢を味わう日" : "思いきり好きなことをする日",
    saturdayPlan: restful
      ? {
          morning: "目覚ましをかけずに眠る",
          afternoon: "近所をのんびり散歩する",
          night: "好きなものを食べてゆっくりする",
        }
      : {
          morning: "ゆっくり起きて好きな朝食をとる",
          afternoon: "作りたかったものに没頭する",
          night: "好きな趣味に時間を使う",
        },
    sundayTheme: "来週の自由を守る日",
    sundayPlan: {
      morning: "軽く体を動かして休む",
      afternoon: "来週の最初のタスクを1つだけ決める",
      night: "早めに寝て月曜に備える",
    },
    nextWeekBuff:
      clearRank === "S"
        ? "月曜ステージ開始時、自由ゲージ+15%"
        : "月曜ステージ開始時、自由ゲージ+10%",
    finalMessage:
      "あなたは平日を突破し、土日の自由を取り戻しました。自由だ！",
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const freedomGauge: number = Number(body.freedomGauge ?? 0);
  const results: DayResult[] = Array.isArray(body.results) ? body.results : [];
  const clearRank = finalRankFromGauge(freedomGauge);

  const aiResult = await callOpenAIJson<AiEnding>(
    GENERATE_ENDING_SYSTEM,
    JSON.stringify({ freedomGauge, clearRank, results })
  );

  const localEnding = buildLocalEnding(freedomGauge);
  if (!aiResult?.saturdayPlan || !aiResult?.sundayPlan) {
    return NextResponse.json(localEnding);
  }

  return NextResponse.json({
    ...localEnding,
    ...aiResult,
    clearRank,
  });
}
