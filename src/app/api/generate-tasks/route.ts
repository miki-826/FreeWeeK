import { NextResponse } from "next/server";
import { callOpenAIJson } from "@/features/ai/openaiClient";
import { GENERATE_TASKS_SYSTEM } from "@/features/ai/prompts";
import { getDefinition } from "@/features/games/definitions";
import { pickTaskFromBank } from "@/features/games/taskBank";
import { DAY_LABELS } from "@/features/game-engine/progress";
import type { GameCategory, GameTask } from "@/types/game";

const DEFAULT_GAME_TYPES: GameCategory[] = [
  "email_polish",
  "calculation",
  "keigo",
  "summary",
  "priority",
];

type AiTask = {
  day: string;
  gameType: GameCategory;
  title: string;
  question: string;
  choices?: string[];
  expectedAnswer: string;
  timeLimit?: number;
};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildLocalTasks(gameTypes: GameCategory[]): GameTask[] {
  const order: GameCategory[] = [];
  while (order.length < DAY_LABELS.length) {
    order.push(...shuffle(gameTypes));
  }
  return DAY_LABELS.map((dayLabel, dayIndex) => {
    const gameType = order[dayIndex];
    const def = getDefinition(gameType);
    const entry = pickTaskFromBank(gameType);
    return {
      id: crypto.randomUUID(),
      dayIndex,
      dayLabel,
      gameType,
      title: entry.title,
      question: entry.question,
      choices: entry.choices,
      expectedAnswer: entry.expectedAnswer,
      timeLimit: def?.timeLimit ?? 30,
      inputType: def?.inputType ?? "textarea",
      scoringType: def?.scoringType ?? "ai",
    };
  });
}

function buildTasksFromAi(aiTasks: AiTask[]): GameTask[] | null {
  if (!Array.isArray(aiTasks) || aiTasks.length !== DAY_LABELS.length) {
    return null;
  }
  return aiTasks.map((task, dayIndex) => {
    const def = getDefinition(task.gameType);
    return {
      id: crypto.randomUUID(),
      dayIndex,
      dayLabel: DAY_LABELS[dayIndex],
      gameType: task.gameType,
      title: task.title,
      question: task.question,
      choices: task.choices,
      expectedAnswer: String(task.expectedAnswer),
      timeLimit: task.timeLimit ?? def?.timeLimit ?? 30,
      inputType: def?.inputType ?? "textarea",
      scoringType: def?.scoringType ?? "ai",
    };
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const difficulty: string = body.difficulty ?? "normal";
  const enabledGameTypes: GameCategory[] =
    Array.isArray(body.enabledGameTypes) && body.enabledGameTypes.length > 0
      ? body.enabledGameTypes
      : DEFAULT_GAME_TYPES;

  const aiResult = await callOpenAIJson<{ tasks: AiTask[] }>(
    GENERATE_TASKS_SYSTEM,
    JSON.stringify({ difficulty, enabledGameTypes })
  );

  const aiTasks = aiResult.data ? buildTasksFromAi(aiResult.data.tasks) : null;
  const tasks = aiTasks ?? buildLocalTasks(enabledGameTypes);

  return NextResponse.json({
    sessionId: crypto.randomUUID(),
    tasks,
    source: aiTasks ? "ai" : "local",
    aiError:
      aiResult.error ??
      (aiResult.data && !aiTasks ? "AIの応答が5日分の形式になっていません" : null),
  });
}
