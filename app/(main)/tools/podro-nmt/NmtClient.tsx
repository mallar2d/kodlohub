"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import Avatar from "@/components/ui/Avatar";
import { questions, Question, SingleChoiceQuestion, MatchingQuestion, ThreeChoiceQuestion } from "./questions";

type LeaderboardRow = {
  user_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  time_taken_seconds: number;
  completed_at: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type MeData = {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  completedAt: string;
  rank: number | null;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "щойно";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} хв тому`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} год тому`;
  return `${Math.floor(diff / 86_400_000)} д тому`;
}

// Convert raw score (max 65) to NMT rating (100-200)
function getNMTRating(score: number): number {
  if (score === 0) return 100;
  return 100 + Math.round((score / 65) * 100);
}

function getRankTitle(score: number): string {
  if (score <= 15) return "ШЕМЕТОВАНИЙ (SLOP)";
  if (score <= 35) return "КОДЛО (MEMBER)";
  if (score <= 55) return "ПОДРОФІКОВАНИЙ (LOREMASTER)";
  return "ГОЛОВНИЙ ПОДРО (LEGEND)";
}

type ActiveSingleChoice = {
  originalQuestion: SingleChoiceQuestion;
  shuffledOptions: { text: string; originalIndex: number }[];
};

type ActiveMatching = {
  originalQuestion: MatchingQuestion;
  shuffledLeft: { text: string; originalIndex: number }[];
  shuffledRight: { text: string; originalIndex: number }[];
};

type ActiveThreeChoice = {
  originalQuestion: ThreeChoiceQuestion;
  shuffledOptions: { text: string; originalIndex: number }[];
};

type ActiveQuestion = ActiveSingleChoice | ActiveMatching | ActiveThreeChoice;

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function prepareQuizQuestions(): ActiveQuestion[] {
  const shuffledQuestions = shuffleArray(questions);
  return shuffledQuestions.map((q) => {
    if (q.type === "single-choice") {
      const shuffledOptions = shuffleArray(
        q.options.map((opt, idx) => ({ text: opt, originalIndex: idx }))
      );
      return {
        originalQuestion: q,
        shuffledOptions,
      };
    } else if (q.type === "three-choice") {
      const shuffledOptions = shuffleArray(
        q.options.map((opt, idx) => ({ text: opt, originalIndex: idx }))
      );
      return {
        originalQuestion: q,
        shuffledOptions,
      };
    } else {
      // q.type === "matching"
      const shuffledLeft = shuffleArray(
        q.leftItems.map((item, idx) => ({ text: item, originalIndex: idx }))
      );
      const shuffledRight = shuffleArray(
        q.rightItems.map((item, idx) => ({ text: item, originalIndex: idx }))
      );
      return {
        originalQuestion: q,
        shuffledLeft,
        shuffledRight,
      };
    }
  });
}

export default function NmtClient() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [me, setMe] = useState<MeData | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  // Quiz State
  const [screen, setScreen] = useState<"intro" | "quiz" | "submitting" | "result">("intro");
  const [isPractice, setIsPractice] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | number[]>>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<ActiveQuestion[]>([]);

  // Result details after completion
  const [finalRawScore, setFinalRawScore] = useState(0);
  const [finalCorrect, setFinalCorrect] = useState(0);
  const [finalTime, setFinalTime] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/nmt", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
      setMe(data.me || null);
    } catch {
      toast("Не вдалося завантажити лідерборд", "error");
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading) {
      Promise.resolve().then(() => {
        fetchLeaderboard();
      });
    }
  }, [authLoading, fetchLeaderboard]);

  // Handle Timer
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  const startQuiz = (practice: boolean) => {
    if (!user && !practice) {
      toast("Увійди, щоб скласти тест на оцінку", "error");
      return;
    }
    setIsPractice(practice);
    setAnswers({});
    setCurrentIdx(0);
    setTimeElapsed(0);
    setQuizQuestions(prepareQuizQuestions());
    setScreen("quiz");
    setTimerActive(true);
    toast(practice ? "Почалося тренування!" : "Офіційне проходження почалося. Хай щастить!", "success");
  };

  const handleSingleChoice = (questionId: number, optionIdx: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const handleMatching = (questionId: number, leftIdx: number, rightIdx: number) => {
    setAnswers((prev) => {
      const currentVal = prev[questionId];
      const current = Array.isArray(currentVal) ? [...currentVal] : [-1, -1, -1, -1];
      current[leftIdx] = rightIdx;
      return {
        ...prev,
        [questionId]: current,
      };
    });
  };

  const handleThreeChoice = (questionId: number, optionIdx: number) => {
    setAnswers((prev) => {
      const currentVal = prev[questionId];
      const current: number[] = Array.isArray(currentVal) ? [...currentVal] : [];
      if (current.includes(optionIdx)) {
        return {
          ...prev,
          [questionId]: current.filter((x) => x !== optionIdx),
        };
      } else {
        if (current.length >= 3) {
          // If already 3 selected, don't allow more (or uncheck the first one)
          toast("Можна вибрати тільки 3 варіанти", "error");
          return prev;
        }
        return {
          ...prev,
          [questionId]: [...current, optionIdx].sort((a, b) => a - b),
        };
      }
    });
  };

  const calculateScore = () => {
    let rawScore = 0;
    let correctCount = 0;

    questions.forEach((q) => {
      const userAns = answers[q.id];
      if (userAns === undefined || userAns === null) return;

      if (q.type === "single-choice") {
        if (userAns === q.correctIndex) {
          rawScore += 1;
          correctCount += 1;
        }
      } else if (q.type === "matching" && Array.isArray(userAns)) {
        // userAns is number[] of size 4
        for (let i = 0; i < 4; i++) {
          if (userAns[i] === q.correctMatches[i]) {
            rawScore += 1;
            correctCount += 1;
          }
        }
      } else if (q.type === "three-choice" && Array.isArray(userAns)) {
        // userAns is number[] of selected indices
        userAns.forEach((idx: number) => {
          if (q.correctIndices.includes(idx)) {
            rawScore += 1;
            correctCount += 1;
          }
        });
      }
    });

    return { rawScore, correctCount };
  };

  const submitResults = async () => {
    setTimerActive(false);
    const { rawScore, correctCount } = calculateScore();

    setFinalRawScore(rawScore);
    setFinalCorrect(correctCount);
    setFinalTime(timeElapsed);

    if (isPractice) {
      setScreen("result");
      toast("Тренування завершено!", "success");
      return;
    }

    setScreen("submitting");

    try {
      const res = await fetch("/api/nmt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: rawScore,
          correctAnswers: correctCount,
          totalQuestions: 65, // Max raw score is 65 points
          timeTakenSeconds: timeElapsed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Не вдалося зберегти результати", "error");
        // Fall back to practice result view so the user doesn't lose their screen
        setIsPractice(true);
      } else {
        toast("Результат зафіксовано в лідерборді!", "success");
        await fetchLeaderboard();
      }
    } catch {
      toast("Помилка мережі при відправці результату", "error");
      setIsPractice(true);
    } finally {
      setScreen("result");
    }
  };

  const nextQuestion = () => {
    if (currentIdx < quizQuestions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      submitResults();
    }
  };

  const prevQuestion = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const activeQuestion = quizQuestions[currentIdx];
  const currentQuestion = activeQuestion?.originalQuestion;
  const totalQuestions = quizQuestions.length;
  const progressPercent = totalQuestions > 0 ? Math.round(((currentIdx + 1) / totalQuestions) * 100) : 0;

  // Render different question components
  const renderQuestionBody = (activeQ: ActiveQuestion) => {
    if (!activeQ) return null;
    const q = activeQ.originalQuestion;
    const userAns = answers[q.id];

    if (q.type === "single-choice" && "shuffledOptions" in activeQ) {
      return (
        <div className="flex flex-col gap-3 mt-6">
          {activeQ.shuffledOptions.map((optObj, oIdx) => {
            const letter = ["А", "Б", "В", "Г"][oIdx];
            const isSelected = userAns === optObj.originalIndex;
            return (
              <button
                key={oIdx}
                onClick={() => handleSingleChoice(q.id, optObj.originalIndex)}
                className={`w-full text-left p-4 rounded border transition-all duration-200 cursor-pointer flex items-center gap-4 ${
                  isSelected
                    ? "bg-canvas-night-soft border-on-primary text-on-primary"
                    : "border-hairline-dark hover:border-on-primary-mute text-on-primary-mute hover:text-on-primary"
                }`}
              >
                <span className={`w-8 h-8 rounded-full border flex items-center justify-center font-[var(--font-display)] font-black text-sm ${
                  isSelected ? "border-on-primary text-on-primary" : "border-hairline-dark text-ink-mute"
                }`}>
                  {letter}
                </span>
                <span className="caption leading-relaxed">{optObj.text}</span>
              </button>
            );
          })}
        </div>
      );
    }

    if (q.type === "matching" && "shuffledLeft" in activeQ) {
      const letters = ["А", "Б", "В", "Г", "Д"];
      const currentMatch = (Array.isArray(userAns) ? userAns : [-1, -1, -1, -1]) as number[];

      return (
        <div className="mt-6 flex flex-col gap-6">
          {/* Desktop Grid Layout */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-hairline-dark">
                  <th className="p-3 text-left micro-cap text-ink-mute">Завдання</th>
                  {letters.map((letter) => (
                    <th key={letter} className="p-3 text-center micro-cap text-ink-mute w-14">
                      {letter}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeQ.shuffledLeft.map((leftItemObj, leftIdx) => (
                  <tr key={leftIdx} className="border-b border-hairline-dark/50 hover:bg-canvas-night-soft/30">
                    <td className="p-3 caption text-on-primary-mute">{leftItemObj.text}</td>
                    {letters.map((_, rightIdx) => {
                      const rightItemObj = activeQ.shuffledRight[rightIdx];
                      const isChecked = currentMatch[leftItemObj.originalIndex] === rightItemObj.originalIndex;
                      return (
                        <td key={rightIdx} className="p-3 text-center">
                          <button
                            onClick={() => handleMatching(q.id, leftItemObj.originalIndex, rightItemObj.originalIndex)}
                            className={`w-8 h-8 rounded border flex items-center justify-center mx-auto transition-colors cursor-pointer ${
                              isChecked
                                ? "bg-on-primary text-canvas-night border-on-primary"
                                : "border-hairline-dark hover:border-on-primary-mute text-ink-mute hover:text-on-primary"
                            }`}
                          >
                            {isChecked ? (
                              <span className="font-bold text-xs">✓</span>
                            ) : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List Layout */}
          <div className="flex flex-col gap-4 sm:hidden">
            {activeQ.shuffledLeft.map((leftItemObj, leftIdx) => (
              <div key={leftIdx} className="p-4 rounded border border-hairline-dark bg-canvas-night/40">
                <p className="text-sm font-bold text-on-primary mb-3">{leftItemObj.text}</p>
                <div className="flex flex-wrap gap-2">
                  {letters.map((letter, rightIdx) => {
                    const rightItemObj = activeQ.shuffledRight[rightIdx];
                    const isChecked = currentMatch[leftItemObj.originalIndex] === rightItemObj.originalIndex;
                    return (
                      <button
                        key={rightIdx}
                        onClick={() => handleMatching(q.id, leftItemObj.originalIndex, rightItemObj.originalIndex)}
                        className={`px-3 py-2 rounded border text-xs font-bold transition-colors cursor-pointer ${
                          isChecked
                            ? "bg-on-primary text-canvas-night border-on-primary"
                            : "border-hairline-dark text-on-primary-mute"
                        }`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right Items Guide */}
          <div className="card-dark p-4 border-dashed">
            <p className="micro-cap text-ink-mute mb-2">ВАРІАНТИ ДЛЯ ВІДПОВІДНОСТІ:</p>
            <ul className="flex flex-col gap-1.5 text-xs text-on-primary-mute">
              {activeQ.shuffledRight.map((rightItemObj, rIdx) => (
                <li key={rIdx} className="flex gap-2">
                  <span className="font-[var(--font-display)] font-black text-on-primary">{letters[rIdx]}.</span>
                  <span>{rightItemObj.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    if (q.type === "three-choice" && "shuffledOptions" in activeQ) {
      const selected = (Array.isArray(userAns) ? userAns : []) as number[];
      return (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-xs text-ink-mute italic mb-2">Оберіть рівно 3 правильні варіанти із 7:</p>
          {activeQ.shuffledOptions.map((optObj, oIdx) => {
            const isSelected = selected.includes(optObj.originalIndex);
            return (
              <button
                key={oIdx}
                onClick={() => handleThreeChoice(q.id, optObj.originalIndex)}
                className={`w-full text-left p-4 rounded border transition-all duration-200 cursor-pointer flex items-center gap-4 ${
                  isSelected
                    ? "bg-canvas-night-soft border-on-primary text-on-primary"
                    : "border-hairline-dark hover:border-on-primary-mute text-on-primary-mute hover:text-on-primary"
                }`}
              >
                <span className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                  isSelected ? "border-on-primary bg-on-primary text-canvas-night" : "border-hairline-dark"
                }`}>
                  {isSelected ? "✓" : ""}
                </span>
                <span className="caption leading-relaxed">{optObj.text}</span>
              </button>
            );
          })}
        </div>
      );
    }

    return null;
  };

  // Check if current question has been answered fully
  const isQuestionAnswered = (q: Question) => {
    const ans = answers[q.id];
    if (ans === undefined || ans === null) return false;

    if (q.type === "single-choice") return true;
    if (q.type === "matching" && Array.isArray(ans)) {
      // All 4 rows must be matched (no -1s)
      return ans.length === 4 && ans.every((val: number) => val !== -1);
    }
    if (q.type === "three-choice" && Array.isArray(ans)) {
      // Must select exactly 3 options
      return ans.length === 3;
    }
    return false;
  };

  return (
    <div className="relative">
      {screen === "intro" && (
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 animate-slide-up">
          {/* Left Column: Intro Description */}
          <div className="card-dark p-6 sm:p-10 flex flex-col">
            <p className="micro-cap text-ink-mute mb-2">NMT CHALLENGE</p>
            <h2 className="heading-sub text-on-primary mb-6">ПОДРО-НМТ</h2>

            <div className="prose text-on-primary-mute text-sm flex-1 mb-8">
              <p>
                Ласкаво просимо на <strong>Національний Мультипредметний Тест про Подро</strong> — головного мем-персонажа ФІКТ,
                легенду Коростишева та біологічну зброю масового ураження.
              </p>
              <p>
                Тест повністю базується на офіційних розсекречених матеріалах з файлу <code>подро.txt</code>.
                Вам доведеться продемонструвати знання кавових ритуалів, побуту гуртожитку,
                теорії кладменства та кримінального досьє Петра Хоменка.
              </p>

              <h3 className="text-on-primary mt-6 mb-2 text-xs font-bold uppercase tracking-wider">Правила проведення:</h3>
              <ul className="list-disc pl-5 flex flex-col gap-2">
                <li><strong>Кількість завдань</strong>: 40 (30 тестів, 5 відповідностей, 5 виборів 3 із 7).</li>
                <li><strong>Максимальний бал</strong>: 65 балів (конвертуються в оцінку від 100 до 200).</li>
                <li><strong>Час</strong>: необмежений, але швидкість проходження вирішує суперечки в лідерборді при рівній кількості балів.</li>
                <li>
                  <strong>Спроба на оцінку</strong>: тільки <strong>ОДИН РАЗ</strong>. Результат одразу запишеться в лідерборд.
                  Наступні рази будуть доступні лише в режимі «тренування».
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {me ? (
                <>
                  <button
                    onClick={() => startQuiz(true)}
                    className="btn-ghost text-on-primary text-center flex-1 cursor-pointer"
                  >
                    ПРОЙТИ ДЛЯ ТРЕНУВАННЯ
                  </button>
                  <div className="flex-1 flex flex-col justify-center text-center p-3 border border-hairline-dark rounded-full bg-canvas-night-soft">
                    <p className="text-xs text-ink-mute micro-cap">Твій результат</p>
                    <p className="text-lg font-[var(--font-display)] font-black text-yellow-300">
                      {getNMTRating(me.score)} / 200 балів
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => startQuiz(false)}
                    className="btn-ghost text-on-primary text-center flex-1 cursor-pointer hover:bg-on-primary hover:text-canvas-night transition-colors"
                  >
                    СКЛАСТИ НА ОЦІНКУ
                  </button>
                  <button
                    onClick={() => startQuiz(true)}
                    className="btn-ghost border-hairline-dark text-ink-mute hover:border-on-primary-mute hover:text-on-primary text-center flex-1 cursor-pointer"
                  >
                    СПРОБУВАТИ ДЛЯ ТРЕНУВАННЯ
                  </button>
                </>
              )}
            </div>

            {!user && (
              <p className="text-center text-red-500/80 text-xs mt-4">
                Ви не увійшли в систему. Ви зможете пройти тест тільки в режимі тренування.
                Увійдіть, щоб зберегти оцінку:{" "}
                <Link href="/login" className="underline hover:opacity-85">
                  Увійти
                </Link>
              </p>
            )}
          </div>

          {/* Right Column: Leaderboard */}
          <div className="card-dark p-6 flex flex-col h-[550px] lg:h-auto">
            <p className="micro-cap text-ink-mute mb-4">ТАБЛИЦЯ ЛІДЕРІВ (ТОП-50)</p>

            <div className="flex-1 overflow-y-auto pr-1">
              {loadingLeaderboard ? (
                <div className="flex items-center gap-2 text-ink-mute text-sm py-12 justify-center h-full">
                  <span className="animate-spin w-4 h-4 border border-on-primary border-t-transparent rounded-full" />
                  завантаження...
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 text-on-primary-mute h-full">
                  <p className="caption">Ще ніхто не пройшов тест на оцінку.</p>
                  <p className="text-xs text-ink-mute mt-1">Будь першим, покажи свій IQ!</p>
                </div>
              ) : (
                <ol className="flex flex-col gap-2">
                  {leaderboard.map((row, idx) => {
                    const isMe = user?.id === row.user_id;
                    const rank = idx + 1;
                    const rating = getNMTRating(row.score);
                    const name = row.display_name || row.username || "анонімний кодло";

                    return (
                      <li
                        key={row.user_id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded border transition-colors ${
                          isMe ? "bg-canvas-night-soft border-on-primary" : "border-hairline-dark/30 hover:border-hairline-dark bg-canvas-night-soft/30"
                        }`}
                      >
                        <span
                          className={`w-7 text-center font-[var(--font-display)] font-black text-sm ${
                            rank === 1
                              ? "text-yellow-300"
                              : rank === 2
                                ? "text-gray-300"
                                : rank === 3
                                  ? "text-amber-600"
                                  : "text-ink-mute"
                          }`}
                        >
                          {rank}
                        </span>

                        <Avatar
                          src={row.avatar_url}
                          displayName={row.display_name || row.username}
                          size={28}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm truncate font-bold ${isMe ? "text-on-primary" : "text-on-primary-mute"}`}>
                              {name}
                            </span>
                            {isMe && <span className="text-[9px] micro-cap text-ink-mute bg-canvas-night px-1 py-0.5 rounded">(ти)</span>}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-ink-mute mt-0.5">
                            <span>{formatTime(row.time_taken_seconds)}</span>
                            <span>•</span>
                            <span>{timeAgo(row.completed_at)}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-[var(--font-display)] font-black text-yellow-300 text-sm">
                            {rating}
                          </p>
                          <p className="text-[9px] micro-cap text-ink-mute">
                            {row.correct_answers}/{row.total_questions} балів
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {user && me && (
              <div className="mt-4 pt-4 border-t border-hairline-dark flex justify-between items-center text-xs">
                <span className="text-ink-mute micro-cap">Твоє місце: #{me.rank || "—"}</span>
                <span className="text-ink-mute micro-cap">Спроба: {timeAgo(me.completedAt)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {screen === "quiz" && (
        <div className="max-w-[800px] mx-auto card-dark overflow-hidden animate-slide-up relative">
          {/* Progress Bar */}
          <div className="h-1 bg-hairline-dark w-full relative">
            <div
              className="h-full bg-on-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="p-6 sm:p-10">
            {/* Header info */}
            <div className="flex justify-between items-center border-b border-hairline-dark pb-4 mb-6">
              <div>
                <span className="micro-cap text-ink-mute">ЗАВДАННЯ {currentIdx + 1} З {totalQuestions}</span>
                <span className="ml-3 text-[10px] bg-canvas-night-soft text-on-primary-mute px-2 py-0.5 rounded font-mono">
                  {currentQuestion.type === "single-choice"
                    ? "Тест (1 бал)"
                    : currentQuestion.type === "matching"
                      ? "Відповідність (до 4 балів)"
                      : "Вибір 3 з 7 (до 3 балів)"}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm text-on-primary font-bold">
                  {formatTime(timeElapsed)}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <h3 className="heading-sub text-lg sm:text-xl text-on-primary font-normal leading-relaxed">
              {currentQuestion?.text}
            </h3>

            {/* Question Body */}
            {renderQuestionBody(activeQuestion)}

            {/* Footer Buttons */}
            <div className="flex justify-between items-center border-t border-hairline-dark pt-6 mt-8">
              <button
                onClick={prevQuestion}
                disabled={currentIdx === 0}
                className={`button-cap px-6 py-2.5 rounded border transition-colors cursor-pointer ${
                  currentIdx === 0
                    ? "border-hairline-dark text-ink-mute cursor-not-allowed"
                    : "border-hairline-dark text-on-primary-mute hover:border-on-primary-mute hover:text-on-primary"
                }`}
              >
                Назад
              </button>

              <button
                onClick={nextQuestion}
                className={`button-cap px-8 py-2.5 rounded border transition-colors cursor-pointer ${
                  currentQuestion && isQuestionAnswered(currentQuestion)
                    ? "bg-on-primary text-canvas-night border-on-primary hover:opacity-90"
                    : "border-hairline-dark text-ink-mute hover:border-on-primary-mute hover:text-on-primary"
                }`}
              >
                {currentIdx === totalQuestions - 1 ? "Завершити" : "Вперед"}
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === "submitting" && (
        <div className="max-w-[500px] mx-auto card-dark p-10 flex flex-col items-center text-center animate-slide-up">
          <span className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full mb-6" />
          <p className="micro-cap text-ink-mute mb-2">ПОДРОФІКАЦІЯ РЕЗУЛЬТАТІВ</p>
          <h3 className="heading-sub text-lg text-on-primary">ЗАПИСУЄМО ОЦІНКУ...</h3>
          <p className="text-on-primary-mute text-xs mt-2">Будь ласка, зачекайте. Нейронна мережа опрацьовує ваші примогеми.</p>
        </div>
      )}

      {screen === "result" && (
        <div className="max-w-[900px] mx-auto animate-slide-up">
          {/* Summary Card */}
          <div className="card-dark p-6 sm:p-10 text-center mb-8 relative overflow-hidden">
            <p className="micro-cap text-ink-mute mb-2">РЕЗУЛЬТАТИ ТЕСТУВАННЯ</p>
            <h2 className="heading-section text-on-primary leading-tight mb-2">
              {getNMTRating(finalRawScore)} / 200
            </h2>
            <p className="text-yellow-300 font-[var(--font-display)] font-black text-sm tracking-wider uppercase mb-6">
              ТВІЙ СТАТУС: {getRankTitle(finalRawScore)}
            </p>

            <div className="grid grid-cols-3 gap-4 max-w-[500px] mx-auto border-y border-hairline-dark py-6 mb-8 text-sm">
              <div>
                <p className="text-ink-mute micro-cap text-xs">ПРАВИЛЬНО</p>
                <p className="text-lg font-bold text-on-primary mt-1">{finalCorrect}</p>
              </div>
              <div>
                <p className="text-ink-mute micro-cap text-xs">НАБРАНО БАЛІВ</p>
                <p className="text-lg font-bold text-on-primary mt-1">{finalRawScore} / 65</p>
              </div>
              <div>
                <p className="text-ink-mute micro-cap text-xs">ЗАТРАЧЕНИЙ ЧАС</p>
                <p className="text-lg font-bold text-on-primary mt-1">{formatTime(finalTime)}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setScreen("intro");
                  fetchLeaderboard();
                }}
                className="btn-ghost text-on-primary px-8 py-3 cursor-pointer"
              >
                ПОВЕРНУТИСЬ ДО ГОЛОВНОЇ
              </button>
              <button
                onClick={() => setShowErrors(!showErrors)}
                className={`button-cap px-8 py-3 rounded-full border transition-colors cursor-pointer ${
                  showErrors
                    ? "bg-on-primary text-canvas-night border-on-primary"
                    : "border-hairline-dark text-on-primary-mute hover:border-on-primary-mute hover:text-on-primary"
                }`}
              >
                {showErrors ? "ПРИХОВАТИ ПОМИЛКИ" : "ПЕРЕГЛЯНУТИ ВІДПОВІДІ"}
              </button>
            </div>
            {isPractice && (
              <p className="text-red-500/70 text-[10px] mt-4 uppercase tracking-wider">
                * Це було тренувальне проходження. Результат не збережено у лідерборді.
              </p>
            )}
          </div>

          {/* Detailed Answers Section */}
          {showErrors && (
            <div className="flex flex-col gap-6 animate-slide-up">
              <h3 className="heading-sub text-lg text-on-primary px-2">АНАЛІЗ ВІДПОВІДЕЙ:</h3>

              {(quizQuestions.length > 0 ? quizQuestions.map(aq => aq.originalQuestion) : questions).map((q, idx) => {
                const userAns = answers[q.id];

                // Determine correctness for display
                let isFullCorrect = false;
                let detailsStr = "";

                if (q.type === "single-choice") {
                  isFullCorrect = userAns === q.correctIndex;
                  const letter = ["А", "Б", "В", "Г"][q.correctIndex];
                  detailsStr = `Правильна відповідь: ${letter}. ${q.options[q.correctIndex]}`;
                } else if (q.type === "matching") {
                  const letters = ["А", "Б", "В", "Г", "Д"];
                  let matchesCount = 0;
                  const currentMatch = (Array.isArray(userAns) ? userAns : [-1, -1, -1, -1]) as number[];
                  currentMatch.forEach((val: number, i: number) => {
                    if (val === q.correctMatches[i]) matchesCount++;
                  });
                  isFullCorrect = matchesCount === 4;
                  detailsStr = `Встановлено правильно: ${matchesCount} з 4. Правильно: ${q.correctMatches
                    .map((val, i) => `${i + 1}-${letters[val]}`)
                    .join(", ")}`;
                } else if (q.type === "three-choice") {
                  const selected = (Array.isArray(userAns) ? userAns : []) as number[];
                  let correctSelected = 0;
                  selected.forEach((idx: number) => {
                    if (q.correctIndices.includes(idx)) correctSelected++;
                  });
                  isFullCorrect = correctSelected === 3;
                  detailsStr = `Обрано правильно: ${correctSelected} з 3. Правильні номери: ${q.correctIndices
                    .map((x) => x + 1)
                    .join(", ")}`;
                }

                return (
                  <div
                    key={q.id}
                    className={`card-dark p-6 border-l-4 ${
                      isFullCorrect ? "border-l-emerald-500" : "border-l-red-500"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <span className="micro-cap text-ink-mute">ЗАВДАННЯ {idx + 1}</span>
                      <span
                        className={`text-xs font-bold ${
                          isFullCorrect ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isFullCorrect ? "ПРАВИЛЬНО" : "НЕПОВНІСТЮ / НЕПРАВИЛЬНО"}
                      </span>
                    </div>

                    <p className="caption text-on-primary mb-4">{q.text}</p>

                    <div className="bg-canvas-night-soft p-4 rounded border border-hairline-dark/60 text-xs">
                      <p className="text-on-primary-mute font-mono">{detailsStr}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
