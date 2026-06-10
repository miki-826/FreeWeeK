import { NextResponse } from "next/server";
import { callOpenAIJson } from "@/features/ai/openaiClient";
import {
  buildGenerateTasksUserPrompt,
  GENERATE_TASKS_SYSTEM,
} from "@/features/ai/prompts";
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

const VALID_GAME_TYPES = new Set<GameCategory>(DEFAULT_GAME_TYPES);
const ALLOW_LOCAL_TASK_FALLBACK =
  process.env.FREEWEEK_ALLOW_LOCAL_TASK_FALLBACK === "true";

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

function isGameCategory(value: unknown): value is GameCategory {
  return typeof value === "string" && VALID_GAME_TYPES.has(value as GameCategory);
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanChoices(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const choices = value
    .map((choice) => cleanText(choice, 120))
    .filter(Boolean);
  return choices.length > 0 ? choices : undefined;
}

function validateChoiceSet(choices: string[] | undefined): boolean {
  if (!choices || choices.length !== 4) return false;
  return choices.every((choice, index) => {
    const label = String.fromCharCode(65 + index);
    return choice.startsWith(`${label}：`) || choice.startsWith(`${label}:`);
  });
}

function buildTasksFromAi(
  aiTasks: AiTask[],
  enabledGameTypes: GameCategory[]
): GameTask[] | null {
  if (!Array.isArray(aiTasks) || aiTasks.length !== DAY_LABELS.length) {
    return null;
  }
  const enabled = new Set(enabledGameTypes);
  const tasks = aiTasks.map((task, dayIndex) => {
    if (!isGameCategory(task.gameType) || !enabled.has(task.gameType)) {
      return null;
    }
    const def = getDefinition(task.gameType);
    if (!def) return null;
    const title = cleanText(task.title, 40);
    const question = cleanText(task.question, 600);
    const expectedAnswer = cleanText(task.expectedAnswer, 400);
    if (!title || !question || !expectedAnswer) return null;
    const choices = cleanChoices(task.choices);
    if (task.gameType === "priority") {
      if (!validateChoiceSet(choices)) return null;
      if (!/^[A-D]$/.test(expectedAnswer)) return null;
    } else if (choices) {
      return null;
    }
    if (task.gameType === "calculation" && !/^-?\d+$/.test(expectedAnswer)) {
      return null;
    }
    return {
      id: crypto.randomUUID(),
      dayIndex,
      dayLabel: DAY_LABELS[dayIndex],
      gameType: task.gameType,
      title,
      question,
      choices,
      expectedAnswer,
      timeLimit: def.timeLimit,
      inputType: def.inputType,
      scoringType: def.scoringType,
    };
  });
  if (tasks.some((task) => task === null)) return null;
  return tasks as GameTask[];
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const difficulty: string = body.difficulty ?? "normal";
  const enabledGameTypes: GameCategory[] =
    Array.isArray(body.enabledGameTypes) && body.enabledGameTypes.length > 0
      ? body.enabledGameTypes.filter(isGameCategory)
      : DEFAULT_GAME_TYPES;
  const gameTypes =
    enabledGameTypes.length > 0 ? enabledGameTypes : DEFAULT_GAME_TYPES;
  const requestId = crypto.randomUUID();

  const aiResult = await callOpenAIJson<{ tasks: AiTask[] }>(
    GENERATE_TASKS_SYSTEM,
    buildGenerateTasksUserPrompt({
      difficulty,
      enabledGameTypes: gameTypes,
      requestId,
      generatedAt: new Date().toISOString(),
    }),
    { temperature: 0.95 }
  );

  const aiTasks = aiResult.data
    ? buildTasksFromAi(aiResult.data.tasks, gameTypes)
    : null;
  const aiError =
    aiResult.error ??
    (aiResult.data && !aiTasks
      ? "AIの応答がFreeWeeKの問題形式として採用できませんでした"
      : null);

  if (!aiTasks && !ALLOW_LOCAL_TASK_FALLBACK) {
    return NextResponse.json(
      {
        error:
          aiError ??
          "AI問題生成に失敗しました。APIキーとモデル設定を確認してください。",
        source: "ai",
      },
      { status: 503 }
    );
  }

  const tasks = aiTasks ?? buildLocalTasks(gameTypes);

  return NextResponse.json({
    sessionId: crypto.randomUUID(),
    tasks,
    source: aiTasks ? "ai" : "local",
    aiError,
    requestId,
  });
}
