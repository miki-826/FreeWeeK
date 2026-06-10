const BASE_URL = (
  process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"
).replace(/\/$/, "");
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export type AiCallResult<T> = {
  data: T | null;
  error: string | null;
};

function resolveApiKey(): { key: string | null; source: string | null } {
  if (process.env.FREEWEEK_OPENAI_API_KEY) {
    return {
      key: process.env.FREEWEEK_OPENAI_API_KEY,
      source: "FREEWEEK_OPENAI_API_KEY",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return { key: process.env.OPENAI_API_KEY, source: "OPENAI_API_KEY" };
  }
  return { key: null, source: null };
}

export function hasOpenAIKey(): boolean {
  return Boolean(resolveApiKey().key);
}

export function getAiConfig() {
  const { key, source } = resolveApiKey();
  return {
    hasKey: Boolean(key),
    keySource: source,
    baseUrl: BASE_URL,
    model: MODEL,
  };
}

export async function callOpenAIJson<T>(
  systemPrompt: string,
  userPrompt: string
): Promise<AiCallResult<T>> {
  const { key: apiKey } = resolveApiKey();
  if (!apiKey) {
    return {
      data: null,
      error:
        "APIキーが設定されていません（FREEWEEK_OPENAI_API_KEY または OPENAI_API_KEY）",
    };
  }

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      const error = `AI APIエラー (HTTP ${res.status}, ${BASE_URL}): ${body.slice(0, 300)}`;
      console.error(error);
      return { data: null, error };
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { data: null, error: "AI APIの応答にcontentがありません" };
    }
    try {
      return { data: JSON.parse(content) as T, error: null };
    } catch {
      const error = `AI APIの応答がJSONとして解析できません: ${String(content).slice(0, 200)}`;
      console.error(error);
      return { data: null, error };
    }
  } catch (e) {
    const error = `AI API（${BASE_URL}）への接続に失敗: ${e instanceof Error ? e.message : String(e)}`;
    console.error(error);
    return { data: null, error };
  }
}
