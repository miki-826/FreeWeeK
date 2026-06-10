import { NextResponse } from "next/server";
import { callOpenAIJson, getAiConfig } from "@/features/ai/openaiClient";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getAiConfig();

  if (!config.hasKey) {
    return NextResponse.json({
      ...config,
      ok: false,
      error:
        "APIキーが設定されていません。ローカルモードで動作します。（.env.localに FREEWEEK_OPENAI_API_KEY を設定してください）",
    });
  }

  const result = await callOpenAIJson<{ pong: boolean }>(
    '疎通確認です。JSONで {"pong": true} とだけ返してください。',
    "ping"
  );

  return NextResponse.json({
    ...config,
    ok: result.data?.pong === true,
    error: result.error,
  });
}
