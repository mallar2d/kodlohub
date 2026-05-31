"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ANSWERS = [
  "М.",
  "Нажал.",
  "Пук.",
  "Почув.",
  "Гойда.",
  "Брєдік.",
  "Мразь.",
  "Похуй.",
];

type Phase = "idle" | "shaking" | "revealing" | "shown" | "hiding";

export default function Magic8BallClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [answer, setAnswer] = useState<string | null>(null);
  const [shakeCount, setShakeCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAccel = useRef({ x: 0, y: 0, z: 0 });
  const shakeThreshold = 15;

  const trigger = useCallback(() => {
    if (phase !== "idle" && phase !== "shown") return;

    const newAnswer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    setAnswer(newAnswer);
    setPhase("shaking");
    setShakeCount(0);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setPhase("revealing");
      timeoutRef.current = setTimeout(() => {
        setPhase("shown");
      }, 2000);
    }, 1200);
  }, [phase]);

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPhase("hiding");
    timeoutRef.current = setTimeout(() => {
      setPhase("idle");
      setAnswer(null);
    }, 600);
  }, []);

  // Device shake detection
  useEffect(() => {
    let permitGranted = false;

    const handleMotion = (e: DeviceMotionEvent) => {
      const accel = e.accelerationIncludingGravity;
      if (!accel || accel.x === null || accel.y === null || accel.z === null) return;

      const dx = Math.abs(accel.x - lastAccel.current.x);
      const dy = Math.abs(accel.y - lastAccel.current.y);
      const dz = Math.abs(accel.z - lastAccel.current.z);

      lastAccel.current = { x: accel.x, y: accel.y, z: accel.z };

      if (dx + dy + dz > shakeThreshold) {
        setShakeCount((prev) => {
          if (prev >= 3 && (phase === "idle" || phase === "shown")) {
            trigger();
          }
          return prev + 1;
        });
      }
    };

    const requestPermission = async () => {
      if (
        typeof (DeviceMotionEvent as any).requestPermission === "function"
      ) {
        try {
          const res = await (DeviceMotionEvent as any).requestPermission();
          if (res === "granted") {
            permitGranted = true;
            window.addEventListener("devicemotion", handleMotion);
          }
        } catch {
          // permission denied
        }
      } else {
        permitGranted = true;
        window.addEventListener("devicemotion", handleMotion);
      }
    };

    requestPermission();

    return () => {
      if (permitGranted) {
        window.removeEventListener("devicemotion", handleMotion);
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [phase, trigger]);

  const isAnimating = phase === "shaking" || phase === "revealing" || phase === "hiding";

  return (
    <div className="flex flex-col items-center gap-10 select-none">
      {/* Question */}
      <p className="text-on-primary-mute text-center text-sm max-w-md">
        Запитай щось і натисни на кулю (або потряси телефон)
      </p>

      {/* Ball */}
      <button
        onClick={isAnimating ? undefined : trigger}
        className="relative cursor-pointer focus:outline-none group"
        aria-label="Magic 8-Ball"
      >
        {/* Outer glow */}
        <div
          className={`absolute inset-0 rounded-full blur-3xl transition-opacity duration-700 ${
            phase === "revealing" || phase === "shown"
              ? "opacity-30 bg-blue-500"
              : "opacity-0 bg-transparent"
          }`}
          style={{ transform: "scale(1.3)" }}
        />

        {/* Ball body */}
        <div
          className={`
            relative w-64 h-64 sm:w-80 sm:h-80 rounded-full
            bg-gradient-to-br from-gray-800 via-gray-900 to-black
            border border-gray-700/50
            shadow-[0_0_60px_-15px_rgba(100,100,255,0.15)]
            transition-shadow duration-700
            ${phase === "revealing" || phase === "shown" ? "shadow-[0_0_80px_-10px_rgba(100,100,255,0.4)]" : ""}
            ${phase === "shaking" ? "animate-[shake_0.1s_ease-in-out_infinite]" : ""}
            ${phase === "hiding" ? "animate-[fadeOut_0.6s_ease-out_forwards]" : ""}
            ${phase === "idle" ? "group-hover:shadow-[0_0_70px_-15px_rgba(100,100,255,0.25)]" : ""}
          `}
        >
          {/* Specular highlight */}
          <div className="absolute top-4 left-8 w-20 h-10 sm:top-6 sm:left-10 sm:w-24 sm:h-12 bg-white/5 rounded-full blur-md" />

          {/* Inner circle (window) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`
                w-28 h-28 sm:w-36 sm:h-36 rounded-full
                bg-gradient-to-br from-indigo-950 to-black
                border border-indigo-500/20
                flex items-center justify-center
                overflow-hidden
                transition-all duration-500
                ${phase === "revealing" || phase === "shown"
                  ? "border-indigo-400/40 shadow-[inset_0_0_30px_rgba(99,102,241,0.3)]"
                  : ""
                }
              `}
            >
              {/* Triangle */}
              <div
                className={`
                  relative w-0 h-0
                  transition-all duration-500 ease-out
                  ${phase === "idle" || phase === "hiding"
                    ? "opacity-0 scale-50"
                    : "opacity-100 scale-100"
                  }
                `}
                style={{
                  borderLeft: "36px solid transparent",
                  borderRight: "36px solid transparent",
                  borderBottom: "62px solid rgba(99, 102, 241, 0.15)",
                  filter: phase === "revealing" || phase === "shown"
                    ? "drop-shadow(0 0 12px rgba(99, 102, 241, 0.5))"
                    : "none",
                }}
              >
                {/* Answer text */}
                {answer && (phase === "revealing" || phase === "shown") && (
                  <span
                    className={`
                      absolute top-6 left-1/2 -translate-x-1/2
                      text-[11px] sm:text-xs font-bold text-indigo-200
                      whitespace-nowrap tracking-wide
                      animate-[fadeInText_0.4s_ease-out_0.3s_both]
                    `}
                  >
                    {answer}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </button>

      {/* Hint text */}
      {phase === "idle" && (
        <p className="text-on-primary-mute/50 text-xs animate-pulse">
          торкнись кулю
        </p>
      )}

      {/* Reset */}
      {phase === "shown" && (
        <button
          onClick={reset}
          className="btn-ghost text-on-primary animate-[fadeIn_0.4s_ease-out]"
        >
          ЩЕ РАЗ
        </button>
      )}

      {/* Shake hint on mobile */}
      <p className="text-on-primary-mute/30 text-[10px] sm:hidden">
        потряси телефон для відповіді
      </p>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0); }
          10% { transform: translateX(-8px) rotate(-3deg); }
          20% { transform: translateX(8px) rotate(3deg); }
          30% { transform: translateX(-6px) rotate(-2deg); }
          40% { transform: translateX(6px) rotate(2deg); }
          50% { transform: translateX(-4px) rotate(-1deg); }
          60% { transform: translateX(4px) rotate(1deg); }
          70% { transform: translateX(-2px) rotate(0); }
          80% { transform: translateX(2px) rotate(0); }
          90% { transform: translateX(-1px) rotate(0); }
        }
        @keyframes fadeInText {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
