import { NextResponse } from "next/server";
import { callOpenAIJson } from "@/features/ai/openaiClient";
import { SCORE_ANSWER_SYSTEM } from "@/features/ai/prompts";
import {
  freedomGainFromScore,
  rankFromScore,
  scoreAnswerLocally,
} from "@/features/game-engine/scoring";
import type { GameCategory, ScoreResult } from "@/types/game";

const LOCAL_SCORING_TYPES: GameCategory[] = ["calculation", "priority"];

type AiScore = {
  score: number;
  feedback: string;
  goodPoint: string;
  improvement: string;
  battleMessage: string;
  rewardItem: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.gameType || body.userAnswer === undefined) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const gameType: GameCategory = body.gameType;
  const question: string = body.question ?? "";
  const expectedAnswer: string = String(body.expectedAnswer ?? "");
  const userAnswer: string = String(body.userAnswer);
  const elapsedTime: number = Number(body.elapsedTime ?? 0);
  const timeLimit: number = Number(body.timeLimit ?? 30);

  const localResult = scoreAnswerLocally({
    gameType,
    question,
    expectedAnswer,
    userAnswer,
    elapsedTime,
    timeLimit,
  });

  if (LOCAL_SCORING_TYPES.includes(gameType)) {
    return NextResponse.json(localResult);
  }

  const aiResult = await callOpenAIJson<AiScore>(
    SCORE_ANSWER_SYSTEM,
    JSON.stringify({ gameType, question, expectedAnswer, userAnswer })
  );

  if (!aiResult || typeof aiResult.score !== "number") {
    return NextResponse.json(localResult);
  }

  const score = Math.min(100, Math.max(0, Math.round(aiResult.score)));
  const result: ScoreResult = {
    score,
    rank: rankFromScore(score),
    isClear: score >= 50,
    feedback: aiResult.feedback ?? localResult.feedback,
    goodPoint: aiResult.goodPoint ?? localResult.goodPoint,
    improvement: aiResult.improvement ?? localResult.improvement,
    damage: score,
    freedomGain: freedomGainFromScore(score),
    battleMessage: aiResult.battleMessage ?? localResult.battleMessage,
    rewardItem: aiResult.rewardItem ?? localResult.rewardItem,
  };

  return NextResponse.json(result);
}
