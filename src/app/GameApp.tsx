"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import FreedomGauge from "@/components/FreedomGauge";
import TimerBar from "@/components/TimerBar";
import WeekMap from "@/components/WeekMap";
import {
  analyzeWeek,
  CATEGORY_LABELS,
} from "@/features/game-engine/analysis";
import { DAY_LABELS, daysUntilFreedom } from "@/features/game-engine/progress";
import type {
  AiSource,
  Ending,
  GameTask,
  Rank,
  ScoreResult,
  TaskRecord,
} from "@/types/game";

type AiStatus = {
  hasKey: boolean;
  ok: boolean;
  model: string;
  keySource?: string | null;
  baseUrl?: string;
  error: string | null;
};

const SOURCE_LABELS: Record<AiSource, string> = {
  ai: "🤖 AI採点",
  local: "📋 ローカル採点（フォールバック）",
  exact: "🧮 正答判定（ローカル）",
};

type Phase =
  | "opening"
  | "home"
  | "map"
  | "intro"
  | "task"
  | "scoring"
  | "result"
  | "dayend"
  | "weekclear"
  | "freedom"
  | "ending";

type SavedState = {
  sessionId: string;
  tasks: GameTask[];
  dayIndex: number;
  gauge: number;
  records: TaskRecord[];
};

const STORAGE_KEY = "freeweek-session-v2";

const DAY_END_NARRATIONS = [
  "まだ週は始まったばかり。\nでも、最初の一歩は越えた。",
  "少しだけ手応えが出てきた。\n自由ゲージが静かに上がっていく。",
  "週の真ん中を突破した。\nここから先は、自由の気配が近い。",
  "あと少し。\n明日を越えれば、土日の扉が開く。",
  "すべての平日ステージを突破した。\n土日の自由が解放される。",
];

const OPENING_LINES = [
  "月曜日 07:30。アラームが鳴った。",
  "目の前には、月曜から金曜までの業務ダンジョン。",
  "30秒クエストを突破して、自由ゲージを貯めろ。",
  "金曜の夜、土日のロックが外れる。",
];

function loadSaved(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedState;
    if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function GameApp() {
  const [phase, setPhase] = useState<Phase>("opening");
  const [sessionId, setSessionId] = useState("");
  const [tasks, setTasks] = useState<GameTask[]>([]);
  const [dayIndex, setDayIndex] = useState(0);
  const [gauge, setGauge] = useState(0);
  const [records, setRecords] = useState<TaskRecord[]>([]);
  const [lastResult, setLastResult] = useState<ScoreResult | null>(null);
  const [ending, setEnding] = useState<Ending | null>(null);
  const [answer, setAnswer] = useState("");
  const [remaining, setRemaining] = useState(30);
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const [openReview, setOpenReview] = useState<number | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [openingStep, setOpeningStep] = useState(0);
  const [taskGenerationError, setTaskGenerationError] = useState<string | null>(
    null
  );
  const startTimeRef = useRef(0);
  const submittedRef = useRef(false);
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  const task = tasks[dayIndex] as GameTask | undefined;

  useEffect(() => {
    if (phase !== "opening") return;
    const interval = setInterval(() => {
      setOpeningStep((step) => {
        if (step >= OPENING_LINES.length - 1) {
          clearInterval(interval);
          return step;
        }
        return step + 1;
      });
    }, 900);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai-status")
      .then((res) => res.json())
      .then((data: AiStatus) => {
        if (!cancelled) setAiStatus(data);
      })
      .catch(() => {
        if (!cancelled) {
          setAiStatus({
            hasKey: false,
            ok: false,
            model: "-",
            error: "AI状態の取得に失敗しました",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasSave = useSyncExternalStore(
    () => () => {},
    () => Boolean(localStorage.getItem(STORAGE_KEY)),
    () => false
  );

  const startBgm = useCallback(() => {
    if (!bgmRef.current) {
      const audio = new Audio("/sounds/clock-out.mp3");
      audio.loop = true;
      audio.volume = 0.35;
      bgmRef.current = audio;
    }
    bgmRef.current.muted = muted;
    bgmRef.current.play().catch(() => {});
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      if (bgmRef.current) bgmRef.current.muted = !prev;
      return !prev;
    });
  }, []);

  const persist = useCallback(
    (next: Partial<SavedState>) => {
      const state: SavedState = {
        sessionId,
        tasks,
        dayIndex,
        gauge,
        records,
        ...next,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
    [sessionId, tasks, dayIndex, gauge, records]
  );

  const startWeek = useCallback(async () => {
    startBgm();
    setLoading(true);
    setTaskGenerationError(null);
    try {
      const res = await fetch("/api/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: "normal" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error ??
            "AI問題生成に失敗しました。APIキーとモデル設定を確認してください。"
        );
      }
      setSessionId(data.sessionId);
      setTasks(data.tasks);
      setDayIndex(0);
      setGauge(0);
      setRecords([]);
      setEnding(null);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sessionId: data.sessionId,
          tasks: data.tasks,
          dayIndex: 0,
          gauge: 0,
          records: [],
        })
      );
      setPhase("map");
    } catch (e) {
      setTaskGenerationError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [startBgm]);

  const resumeWeek = useCallback(() => {
    const saved = loadSaved();
    if (!saved) return;
    startBgm();
    setSessionId(saved.sessionId);
    setTasks(saved.tasks);
    setDayIndex(saved.dayIndex);
    setGauge(saved.gauge);
    setRecords(saved.records ?? []);
    setPhase(saved.dayIndex >= DAY_LABELS.length ? "weekclear" : "map");
  }, [startBgm]);

  const startTask = useCallback(() => {
    if (!task) return;
    setAnswer("");
    setRemaining(task.timeLimit);
    submittedRef.current = false;
    startTimeRef.current = Date.now();
    setPhase("task");
  }, [task]);

  const submitAnswer = useCallback(
    async (finalAnswer: string) => {
      if (!task || submittedRef.current) return;
      submittedRef.current = true;
      setPhase("scoring");
      const elapsedTime = Math.min(
        task.timeLimit,
        Math.round((Date.now() - startTimeRef.current) / 1000)
      );
      let result: ScoreResult;
      try {
        const res = await fetch("/api/score-answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            taskId: task.id,
            gameType: task.gameType,
            question: task.question,
            expectedAnswer: task.expectedAnswer,
            userAnswer: finalAnswer,
            elapsedTime,
            timeLimit: task.timeLimit,
          }),
        });
        result = await res.json();
      } catch {
        result = {
          score: 0,
          rank: "C",
          isClear: false,
          feedback: "通信に失敗しました。",
          goodPoint: "",
          improvement: "",
          damage: 0,
          freedomGain: 5,
          battleMessage: "攻撃が届かなかった…",
          rewardItem: "ざらめ煎餅",
        };
      }
      const nextGauge = Math.min(100, gauge + result.freedomGain);
      const nextRecords: TaskRecord[] = [
        ...records,
        {
          day: task.dayLabel,
          gameType: task.gameType,
          title: task.title,
          question: task.question,
          userAnswer: finalAnswer,
          score: result.score,
          rank: result.rank,
          isClear: result.isClear,
          feedback: result.feedback,
          goodPoint: result.goodPoint,
          improvement: result.improvement,
        },
      ];
      setLastResult(result);
      setGauge(nextGauge);
      setRecords(nextRecords);
      persist({ gauge: nextGauge, records: nextRecords });
      setPhase("result");
    },
    [task, sessionId, gauge, records, persist]
  );

  useEffect(() => {
    if (phase !== "task") return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase === "task" && remaining === 0) {
      submitAnswer(answer);
    }
  }, [phase, remaining, answer, submitAnswer]);

  const clockOut = useCallback(() => {
    const nextDay = dayIndex + 1;
    setDayIndex(nextDay);
    persist({ dayIndex: nextDay });
    setPhase("dayend");
  }, [dayIndex, persist]);

  const goHome = useCallback(() => {
    if (dayIndex >= DAY_LABELS.length) {
      setPhase("weekclear");
    } else {
      setPhase("map");
    }
  }, [dayIndex]);

  const showEnding = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/generate-ending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          freedomGauge: gauge,
          results: records.map((r) => ({
            day: r.day,
            gameType: r.gameType,
            score: r.score,
            rank: r.rank,
          })),
          records,
        }),
      });
      setEnding(await res.json());
      setOpenReview(null);
      setPhase("ending");
    } finally {
      setLoading(false);
    }
  }, [sessionId, gauge, records]);

  const resetGame = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTasks([]);
    setDayIndex(0);
    setGauge(0);
    setRecords([]);
    setEnding(null);
    setLastResult(null);
    setOpeningStep(0);
    setPhase("opening");
  }, []);

  const ranks: (Rank | null)[] = DAY_LABELS.map(
    (_, i) => records[i]?.rank ?? null
  );
  const analysis = analyzeWeek(records);

  return (
    <main
      className={`game-stage phase-${phase} flex-1 flex items-center justify-center p-4`}
    >
      <div className="pixel-sky" aria-hidden="true" />
      <div className="pixel-city" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
      <button
        onClick={toggleMute}
        aria-label="BGM切り替え"
        className="pixel-btn fixed top-3 right-3 z-10 px-3 py-2 text-sm bg-background/70"
      >
        {muted ? "🔇" : "🔊"}
      </button>
      <div className="relative z-10 w-full max-w-md space-y-4">
        {phase === "opening" && (
          <div className="opening-stage pixel-card p-6 space-y-5 text-center animate-fade-in-up">
            <div className="opening-scene" aria-hidden="true">
              <div className="office-window">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="desk" />
              <div className="worker-sprite" />
              <div className="monitor-sprite" />
              <div className="alarm-sprite">07:30</div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-accent animate-blink">BOOTING WEEK QUEST</p>
              <h1 className="text-3xl leading-relaxed">
                自由まで、
                <br />
                あと<span className="text-accent-warm text-4xl">5</span>日。
              </h1>
              <p className="text-sm opacity-80">
                平日を攻略して、土日の自由を取り戻せ
              </p>
            </div>
            <div className="opening-log text-left text-xs space-y-2">
              {OPENING_LINES.slice(0, openingStep + 1).map((line) => (
                <p key={line}>
                  <span className="text-freedom">&gt;</span> {line}
                </p>
              ))}
            </div>
            <button
              onClick={() => setPhase("home")}
              className="pixel-btn w-full py-3 bg-accent-warm text-background text-lg"
            >
              PRESS START
            </button>
          </div>
        )}

        {phase === "home" && (
          <div className="pixel-card p-6 space-y-6 text-center animate-fade-in-up">
            <p className="text-xs text-accent">07:30 ─ 月曜日の朝</p>
            <h1 className="text-3xl leading-relaxed">
              自由まで、
              <br />
              あと<span className="text-accent-warm text-4xl">5</span>日。
            </h1>
            <p className="text-sm opacity-80">
              平日を突破して土日を解放せよ
            </p>
            <div className="flex justify-center gap-2 text-sm">
              {["月", "火", "水", "木", "金"].map((d) => (
                <span key={d} className="pixel-chip px-2 py-1">
                  {d} 🔒
                </span>
              ))}
            </div>
            <FreedomGauge value={0} />
            <div className="space-y-2">
              <button
                onClick={startWeek}
                disabled={loading}
                className="pixel-btn w-full py-3 bg-accent text-background text-lg disabled:opacity-50"
              >
                {loading ? "業務クエスト生成中..." : "🏢 出勤する"}
              </button>
              {hasSave && (
                <button
                  onClick={resumeWeek}
                  className="pixel-btn w-full py-2 text-accent text-sm"
                >
                  続きから再開する
                </button>
              )}
            </div>
            <p className="text-xs opacity-60">今日の業務クエストを開始します</p>
            {taskGenerationError && (
              <div className="text-xs text-left pixel-inset p-2 space-y-1 text-danger">
                <p>AI問題生成に失敗しました。</p>
                <p className="break-all opacity-80">{taskGenerationError}</p>
              </div>
            )}
            <div className="text-xs text-left pixel-inset p-2 space-y-1">
              {!aiStatus ? (
                <p className="opacity-60 animate-blink">AI接続を確認中...</p>
              ) : aiStatus.ok ? (
                <p className="text-freedom">
                  🤖 AI接続：OK（{aiStatus.model} / キー元:{" "}
                  {aiStatus.keySource}）
                </p>
              ) : (
                <>
                  <p className="text-accent-warm">
                    {aiStatus.hasKey
                      ? `🤖 AI接続：エラー（キー元: ${aiStatus.keySource}）`
                      : "🤖 AI未設定：問題生成にはAPIキーが必要です"}
                  </p>
                  {aiStatus.error && (
                    <p className="opacity-70 break-all">{aiStatus.error}</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {phase === "map" && task && (
          <div className="pixel-card p-6 space-y-4 animate-fade-in-up">
            <h2 className="text-xl text-center">WEEK MAP</h2>
            <p className="text-center text-sm">
              自由まであと{" "}
              <span className="text-accent-warm text-xl">
                {daysUntilFreedom(dayIndex)}
              </span>{" "}
              日
            </p>
            <WeekMap
              currentDayIndex={dayIndex}
              ranks={ranks}
              weekendUnlocked={false}
            />
            <FreedomGauge value={gauge} />
            <button
              onClick={() => setPhase("intro")}
              className="pixel-btn w-full py-3 bg-accent text-background"
            >
              {task.dayLabel}を開始する
            </button>
          </div>
        )}

        {phase === "intro" && task && (
          <div className="pixel-card p-6 space-y-5 text-center animate-fade-in-up">
            <p className="text-xs text-accent">{task.dayLabel} 09:00</p>
            <p className="text-sm opacity-80">
              AI上司：
              <br />
              「今日の業務クエストを開始します」
            </p>
            <div className="space-y-1">
              <p className="text-xs text-accent-warm animate-blink">MISSION</p>
              <h2 className="text-2xl">{task.title}</h2>
              <p className="text-xs opacity-70">
                種目：{CATEGORY_LABELS[task.gameType] ?? task.gameType}
              </p>
            </div>
            <p className="text-sm">
              制限時間：<span className="text-danger">{task.timeLimit}秒</span>
            </p>
            <button
              onClick={startTask}
              className="pixel-btn w-full py-3 bg-accent-warm text-background text-xl"
            >
              ⚔ START
            </button>
          </div>
        )}

        {phase === "task" && task && (
          <div
            className={`pixel-card p-6 space-y-4 ${
              remaining <= 5 ? "border-danger" : ""
            }`}
          >
            <div className="flex justify-between text-xs">
              <span>{task.dayLabel} 業務クエスト</span>
              <span className="opacity-70">12:30 業務中</span>
            </div>
            <TimerBar remaining={remaining} timeLimit={task.timeLimit} />
            <div>
              <p className="text-xs text-accent-warm mb-1">MISSION</p>
              <p className="text-sm whitespace-pre-wrap">{task.question}</p>
            </div>
            {task.inputType === "choice" && task.choices ? (
              <div className="space-y-2">
                {task.choices.map((choice) => {
                  const key = choice.split("：")[0];
                  return (
                    <button
                      key={choice}
                      onClick={() => {
                        setAnswer(key);
                        submitAnswer(key);
                      }}
                      className="pixel-btn w-full py-2 px-3 text-left text-sm hover:text-accent"
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                {task.inputType === "number" ? (
                  <input
                    type="number"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    autoFocus
                    className="w-full pixel-input p-3 bg-transparent text-lg outline-none focus:border-accent"
                    placeholder="数値を入力"
                  />
                ) : (
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    autoFocus
                    rows={4}
                    className="w-full pixel-input p-3 bg-transparent text-sm outline-none focus:border-accent resize-none"
                    placeholder="回答を入力"
                  />
                )}
                <button
                  onClick={() => submitAnswer(answer)}
                  className="pixel-btn w-full py-3 bg-accent text-background"
                >
                  提出する
                </button>
              </>
            )}
          </div>
        )}

        {phase === "scoring" && (
          <div className="pixel-card p-10 text-center space-y-4">
            <p className="text-lg animate-blink">AI上司が確認中...</p>
            <p className="text-xs opacity-60">採点しています</p>
          </div>
        )}

        {phase === "result" && task && lastResult && (
          <div className="pixel-card p-6 space-y-4 text-center animate-fade-in-up">
            <h2
              className={`text-2xl animate-pop ${
                lastResult.isClear ? "text-accent-warm" : "text-danger"
              }`}
            >
              {lastResult.isClear ? "QUEST CLEAR!" : "QUEST FAILED..."}
            </h2>
            <div className="flex justify-center gap-6">
              <div>
                <p className="text-xs opacity-70">スコア</p>
                <p className="text-3xl">{lastResult.score}</p>
              </div>
              <div>
                <p className="text-xs opacity-70">ランク</p>
                <p className="text-3xl text-accent-warm">{lastResult.rank}</p>
              </div>
            </div>
            <p className="text-sm text-accent">{lastResult.battleMessage}</p>
            <div className="text-xs space-y-1 text-left pixel-inset p-3">
              <p>👍 {lastResult.goodPoint}</p>
              <p>💡 {lastResult.improvement}</p>
            </div>
            {lastResult.source && (
              <p className="text-xs opacity-60">
                採点方式：{SOURCE_LABELS[lastResult.source]}
              </p>
            )}
            {lastResult.aiError && (
              <p className="text-xs text-accent-warm break-all">
                ⚠ AI採点に失敗したためローカル採点を使用：{lastResult.aiError}
              </p>
            )}
            <div>
              <p className="text-xs text-freedom mb-1">
                自由ゲージ +{lastResult.freedomGain}%
              </p>
              <FreedomGauge value={gauge} />
            </div>
            <p className="text-xs">
              獲得アイテム：
              <span className="text-accent-warm">{lastResult.rewardItem}</span>
            </p>
            <button
              onClick={clockOut}
              className="pixel-btn w-full py-3 bg-accent-warm text-background text-lg"
            >
              🌇 退勤する
            </button>
          </div>
        )}

        {phase === "dayend" && (
          <div className="pixel-card p-6 space-y-5 text-center animate-fade-in-up">
            <p className="text-xs text-accent">18:45 退勤</p>
            <h2 className="text-2xl">DAY {dayIndex} END</h2>
            <p className="text-lg">{DAY_LABELS[dayIndex - 1]}、終了。</p>
            <p className="text-sm opacity-80 whitespace-pre-wrap leading-relaxed">
              {DAY_END_NARRATIONS[dayIndex - 1]}
            </p>
            {dayIndex < DAY_LABELS.length && (
              <p className="text-sm">
                自由まで、あと
                <span className="text-accent-warm text-xl">
                  {daysUntilFreedom(dayIndex)}
                </span>
                日。
              </p>
            )}
            <div className="text-sm space-y-2">
              <p>
                本日の評価：
                <span className="text-accent-warm">
                  {records[dayIndex - 1]?.rank}
                </span>
              </p>
              <FreedomGauge value={gauge} />
            </div>
            <button
              onClick={goHome}
              className="pixel-btn w-full py-3 bg-accent text-background"
            >
              🌙 帰宅する
            </button>
          </div>
        )}

        {phase === "weekclear" && (
          <div className="pixel-card p-6 space-y-5 text-center animate-fade-in-up">
            <h2 className="text-3xl text-accent-warm animate-pop">
              WEEK CLEAR!
            </h2>
            <p className="text-sm">
              金曜日の夜。
              <br />
              すべての平日クエストを突破した。
            </p>
            <video
              src="/movies/quest-clear.mp4"
              autoPlay
              muted
              playsInline
              loop
              className="w-full pixel-frame"
            />
            <div className="flex justify-center gap-3 text-sm">
              <span className="pixel-chip px-3 py-2 text-freedom animate-pop">
                SATURDAY UNLOCKED
              </span>
              <span className="pixel-chip px-3 py-2 text-freedom animate-pop">
                SUNDAY UNLOCKED
              </span>
            </div>
            <FreedomGauge value={gauge} rainbow />
            <button
              onClick={() => setPhase("freedom")}
              className="pixel-btn w-full py-3 rainbow-bar text-background text-lg"
            >
              🛏 眠りにつく
            </button>
          </div>
        )}

        {phase === "freedom" && (
          <div className="pixel-card p-8 space-y-6 text-center animate-fade-in-up">
            <p className="text-xs text-accent-warm">土曜日 09:42</p>
            <p className="text-sm leading-relaxed opacity-90">
              目が覚めた。
              <br />
              アラームは、鳴らなかった。
              <br />
              <br />
              今日は会社に行かなくていい。
              <br />
              メールも、電話も、上司もいない。
              <br />
              <br />
              この2日間は、すべて自分のものだ。
            </p>
            <h2 className="text-4xl text-accent-warm animate-pop">自由だ！</h2>
            <FreedomGauge value={gauge} rainbow />
            <button
              onClick={showEnding}
              disabled={loading}
              className="pixel-btn w-full py-3 rainbow-bar text-background text-lg disabled:opacity-50"
            >
              {loading ? "AIが自由プランを生成中..." : "🌈 自由な土日を始める"}
            </button>
          </div>
        )}

        {phase === "ending" && ending && (
          <div className="pixel-card p-6 space-y-4 animate-fade-in-up">
            <p className="text-center text-xs text-freedom">
              ─ 土日解放エンディング ─
            </p>
            <h2 className="text-center text-2xl text-accent-warm">
              {ending.endingTitle}
            </h2>
            <p className="text-center text-sm">
              CLEAR RANK：
              <span className="text-3xl text-accent-warm">
                {ending.clearRank}
              </span>
            </p>
            <FreedomGauge value={gauge} rainbow />

            <div className="pixel-inset p-3 space-y-2">
              <p className="text-sm text-accent">📊 今週の総合評価</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="pixel-inset p-2">
                  <p className="opacity-70">平均スコア</p>
                  <p className="text-lg">{analysis.averageScore}</p>
                </div>
                <div className="pixel-inset p-2">
                  <p className="opacity-70">クリア数</p>
                  <p className="text-lg">{analysis.clearCount}/5</p>
                </div>
                <div className="pixel-inset p-2">
                  <p className="opacity-70">最高の日</p>
                  <p className="text-lg">{analysis.bestDay.day.slice(0, 1)}</p>
                </div>
              </div>
              <p className="text-xs">
                💪 得意：<span className="text-freedom">{analysis.strength}</span>
                （{analysis.bestDay.score}点）
              </p>
              <p className="text-xs">
                📉 伸びしろ：
                <span className="text-accent-warm">{analysis.weakness}</span>
                （{analysis.worstDay.score}点）
              </p>
              {ending.analysisComment && (
                <p className="text-xs opacity-90 leading-relaxed border-t border-foreground/20 pt-2">
                  🤖 AI上司の総評：{ending.analysisComment}
                </p>
              )}
            </div>

            <div className="pixel-inset p-3 space-y-2">
              <p className="text-sm text-accent">📝 5日間の振り返り</p>
              <p className="text-xs opacity-60">
                タップすると自分の回答と改善点を見返せます
              </p>
              {records.map((r, i) => (
                <div key={r.day} className="pixel-inset">
                  <button
                    onClick={() => setOpenReview(openReview === i ? null : i)}
                    className="w-full px-3 py-2 flex justify-between items-center text-xs"
                  >
                    <span>
                      {r.isClear ? "✅" : "❌"} {r.day}：
                      {CATEGORY_LABELS[r.gameType] ?? r.gameType}
                    </span>
                    <span className="text-accent-warm">
                      {r.score}点 / {r.rank} {openReview === i ? "▲" : "▼"}
                    </span>
                  </button>
                  {openReview === i && (
                    <div className="px-3 pb-3 space-y-2 text-xs text-left animate-fade-in-up">
                      <p className="opacity-70 whitespace-pre-wrap">
                        問題：{r.question}
                      </p>
                      <p className="pixel-inset p-2 whitespace-pre-wrap">
                        あなたの回答：{r.userAnswer || "（未回答）"}
                      </p>
                      <p>👍 {r.goodPoint}</p>
                      <p>💡 {r.improvement}</p>
                    </div>
                  )}
                </div>
              ))}
              {analysis.advice && (
                <p className="text-xs leading-relaxed border-t border-foreground/20 pt-2">
                  🎯 来週へのアドバイス：{analysis.advice}
                </p>
              )}
            </div>

            <div className="pixel-inset p-3 space-y-1 text-sm">
              <p className="text-accent">🌞 土曜日：{ending.saturdayTheme}</p>
              <p className="text-xs">朝：{ending.saturdayPlan.morning}</p>
              <p className="text-xs">昼：{ending.saturdayPlan.afternoon}</p>
              <p className="text-xs">夜：{ending.saturdayPlan.night}</p>
            </div>
            <div className="pixel-inset p-3 space-y-1 text-sm">
              <p className="text-accent">🌙 日曜日：{ending.sundayTheme}</p>
              <p className="text-xs">朝：{ending.sundayPlan.morning}</p>
              <p className="text-xs">昼：{ending.sundayPlan.afternoon}</p>
              <p className="text-xs">夜：{ending.sundayPlan.night}</p>
            </div>
            <p className="text-xs text-freedom">🎁 {ending.nextWeekBuff}</p>
            <p className="text-center text-sm whitespace-pre-wrap">
              {ending.finalMessage}
            </p>
            {ending.source && (
              <p className="text-xs opacity-60 text-center">
                プラン生成：
                {ending.source === "ai"
                  ? "🤖 AI生成"
                  : "📋 ローカル生成（フォールバック）"}
              </p>
            )}
            {ending.aiError && (
              <p className="text-xs text-accent-warm break-all">
                ⚠ {ending.aiError}
              </p>
            )}
            <button
              onClick={resetGame}
              className="pixel-btn w-full py-3 bg-accent text-background"
            >
              もう一度、月曜日から
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
