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
import { DAY_LABELS, daysUntilFreedom } from "@/features/game-engine/progress";
import type {
  DayResult,
  Ending,
  GameTask,
  Rank,
  ScoreResult,
} from "@/types/game";

type Phase =
  | "home"
  | "map"
  | "intro"
  | "task"
  | "scoring"
  | "result"
  | "dayend"
  | "weekclear"
  | "ending";

type SavedState = {
  sessionId: string;
  tasks: GameTask[];
  dayIndex: number;
  gauge: number;
  results: DayResult[];
};

const STORAGE_KEY = "freeweek-session-v1";

const DAY_END_NARRATIONS = [
  "まだ週は始まったばかり。\nでも、最初の一歩は越えた。",
  "少しだけ手応えが出てきた。\n自由ゲージが静かに上がっていく。",
  "週の真ん中を突破した。\nここから先は、自由の気配が近い。",
  "あと少し。\n明日を越えれば、土日の扉が開く。",
  "すべての平日ステージを突破した。\n土日の自由が解放される。",
];

const GAME_TYPE_LABELS: Record<string, string> = {
  email_polish: "メール丁寧化",
  calculation: "事務計算",
  keigo: "敬語変換",
  summary: "要約",
  priority: "優先順位判断",
};

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
  const [phase, setPhase] = useState<Phase>("home");
  const [sessionId, setSessionId] = useState("");
  const [tasks, setTasks] = useState<GameTask[]>([]);
  const [dayIndex, setDayIndex] = useState(0);
  const [gauge, setGauge] = useState(0);
  const [results, setResults] = useState<DayResult[]>([]);
  const [lastResult, setLastResult] = useState<ScoreResult | null>(null);
  const [ending, setEnding] = useState<Ending | null>(null);
  const [answer, setAnswer] = useState("");
  const [remaining, setRemaining] = useState(30);
  const [loading, setLoading] = useState(false);
  const startTimeRef = useRef(0);
  const submittedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const task = tasks[dayIndex] as GameTask | undefined;

  const hasSave = useSyncExternalStore(
    () => () => {},
    () => Boolean(localStorage.getItem(STORAGE_KEY)),
    () => false
  );

  const persist = useCallback(
    (next: Partial<SavedState>) => {
      const state: SavedState = {
        sessionId,
        tasks,
        dayIndex,
        gauge,
        results,
        ...next,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
    [sessionId, tasks, dayIndex, gauge, results]
  );

  const startWeek = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: "normal" }),
      });
      const data = await res.json();
      setSessionId(data.sessionId);
      setTasks(data.tasks);
      setDayIndex(0);
      setGauge(0);
      setResults([]);
      setEnding(null);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sessionId: data.sessionId,
          tasks: data.tasks,
          dayIndex: 0,
          gauge: 0,
          results: [],
        })
      );
      setPhase("map");
    } finally {
      setLoading(false);
    }
  }, []);

  const resumeWeek = useCallback(() => {
    const saved = loadSaved();
    if (!saved) return;
    setSessionId(saved.sessionId);
    setTasks(saved.tasks);
    setDayIndex(saved.dayIndex);
    setGauge(saved.gauge);
    setResults(saved.results);
    setPhase(saved.dayIndex >= DAY_LABELS.length ? "weekclear" : "map");
  }, []);

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
      const nextResults = [
        ...results,
        {
          day: task.dayLabel,
          gameType: task.gameType,
          score: result.score,
          rank: result.rank,
        },
      ];
      setLastResult(result);
      setGauge(nextGauge);
      setResults(nextResults);
      persist({ gauge: nextGauge, results: nextResults });
      setPhase("result");
    },
    [task, sessionId, gauge, results, persist]
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
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/clock-out.mp3");
      audioRef.current.volume = 0.5;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }, [dayIndex, persist]);

  const goHome = useCallback(() => {
    audioRef.current?.pause();
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
        body: JSON.stringify({ sessionId, freedomGauge: gauge, results }),
      });
      setEnding(await res.json());
      setPhase("ending");
    } finally {
      setLoading(false);
    }
  }, [sessionId, gauge, results]);

  const resetGame = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTasks([]);
    setDayIndex(0);
    setGauge(0);
    setResults([]);
    setEnding(null);
    setLastResult(null);
    setPhase("home");
  }, []);

  const ranks: (Rank | null)[] = DAY_LABELS.map(
    (_, i) => results[i]?.rank ?? null
  );

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
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
                <span key={d} className="pixel-card px-2 py-1">
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
                種目：{GAME_TYPE_LABELS[task.gameType] ?? task.gameType}
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
                    className="w-full pixel-card p-3 bg-transparent text-lg outline-none focus:border-accent"
                    placeholder="数値を入力"
                  />
                ) : (
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    autoFocus
                    rows={4}
                    className="w-full pixel-card p-3 bg-transparent text-sm outline-none focus:border-accent resize-none"
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
            <div className="text-xs space-y-1 text-left pixel-card p-3">
              <p>👍 {lastResult.goodPoint}</p>
              <p>💡 {lastResult.improvement}</p>
            </div>
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
                  {results[dayIndex - 1]?.rank}
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
              平日を突破した！
              <br />
              土日の自由が解放されました
            </p>
            <video
              src="/movies/quest-clear.mp4"
              autoPlay
              muted
              playsInline
              loop
              className="w-full pixel-card !p-0"
            />
            <div className="flex justify-center gap-3 text-sm">
              <span className="pixel-card px-3 py-2 text-freedom animate-pop">
                SATURDAY UNLOCKED
              </span>
              <span className="pixel-card px-3 py-2 text-freedom animate-pop">
                SUNDAY UNLOCKED
              </span>
            </div>
            <FreedomGauge value={gauge} rainbow />
            <button
              onClick={showEnding}
              disabled={loading}
              className="pixel-btn w-full py-3 rainbow-bar text-background text-lg disabled:opacity-50"
            >
              {loading ? "AIが自由プランを生成中..." : "🌈 自由プランを見る"}
            </button>
          </div>
        )}

        {phase === "ending" && ending && (
          <div className="pixel-card p-6 space-y-4 animate-fade-in-up">
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
            <div className="pixel-card p-3 space-y-1 text-sm">
              <p className="text-accent">🌞 土曜日：{ending.saturdayTheme}</p>
              <p className="text-xs">朝：{ending.saturdayPlan.morning}</p>
              <p className="text-xs">昼：{ending.saturdayPlan.afternoon}</p>
              <p className="text-xs">夜：{ending.saturdayPlan.night}</p>
            </div>
            <div className="pixel-card p-3 space-y-1 text-sm">
              <p className="text-accent">🌙 日曜日：{ending.sundayTheme}</p>
              <p className="text-xs">朝：{ending.sundayPlan.morning}</p>
              <p className="text-xs">昼：{ending.sundayPlan.afternoon}</p>
              <p className="text-xs">夜：{ending.sundayPlan.night}</p>
            </div>
            <p className="text-xs text-freedom">🎁 {ending.nextWeekBuff}</p>
            <p className="text-center text-sm whitespace-pre-wrap">
              {ending.finalMessage}
            </p>
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
