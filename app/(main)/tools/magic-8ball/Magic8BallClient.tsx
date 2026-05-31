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

type Phase = "idle" | "spinning" | "revealing" | "shown" | "hiding";

function makeTri(cx: number, cy: number, r: number, angles: number[]): string {
  return angles
    .map((a) => {
      const rad = (a * Math.PI) / 180;
      return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
    })
    .join(" ");
}

const R = 52;
const CX = 60;
const CY = 60;

const FACES: { points: string; rot: string }[] = [
  { points: makeTri(CX, CY, R, [90, 210, 330]), rot: "rotateX(0deg)" },
  { points: makeTri(CX, CY, R, [90, 210, 330]), rot: "rotateY(90deg)" },
  { points: makeTri(CX, CY, R, [90, 210, 330]), rot: "rotateY(180deg)" },
  { points: makeTri(CX, CY, R, [90, 210, 330]), rot: "rotateY(270deg)" },
  { points: makeTri(CX, CY, R, [30, 150, 270]), rot: "rotateX(90deg)" },
  { points: makeTri(CX, CY, R, [30, 150, 270]), rot: "rotateX(-90deg)" },
  { points: makeTri(CX, CY, R, [90, 210, 330]), rot: "rotateX(45deg) rotateZ(45deg)" },
  { points: makeTri(CX, CY, R, [30, 150, 270]), rot: "rotateX(-45deg) rotateZ(-45deg)" },
];

export default function Magic8BallClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [answer, setAnswer] = useState<string | null>(null);
  const [dieRotation, setDieRotation] = useState({ x: 0, y: 0, z: 0 });
  const [windowGlow, setWindowGlow] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAccel = useRef({ x: 0, y: 0, z: 0 });
  const shakeCountRef = useRef(0);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const trigger = useCallback(() => {
    if (phase === "spinning" || phase === "revealing") return;

    clearTimeouts();
    const newAnswer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    setAnswer(newAnswer);
    setPhase("spinning");

    let step = 0;
    intervalRef.current = setInterval(() => {
      step++;
      const speed = Math.max(0.1, 1 - step / 60);
      setDieRotation((prev) => ({
        x: prev.x + 12 * speed + Math.random() * 4,
        y: prev.y + 8 * speed + Math.random() * 3,
        z: prev.z + 5 * speed + Math.random() * 2,
      }));
      setWindowGlow(Math.min(1, step / 40));
    }, 30);

    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPhase("revealing");
      timeoutRef.current = setTimeout(() => {
        setPhase("shown");
      }, 800);
    }, 2000);
  }, [phase, clearTimeouts]);

  const reset = useCallback(() => {
    clearTimeouts();
    setPhase("hiding");
    setWindowGlow(0);
    timeoutRef.current = setTimeout(() => {
      setPhase("idle");
      setAnswer(null);
      setDieRotation({ x: 0, y: 0, z: 0 });
    }, 600);
  }, [clearTimeouts]);

  useEffect(() => {
    let permitGranted = false;

    const handleMotion = (e: DeviceMotionEvent) => {
      const accel = e.accelerationIncludingGravity;
      if (!accel || accel.x === null || accel.y === null || accel.z === null) return;

      const dx = Math.abs(accel.x - lastAccel.current.x);
      const dy = Math.abs(accel.y - lastAccel.current.y);
      const dz = Math.abs(accel.z - lastAccel.current.z);
      lastAccel.current = { x: accel.x, y: accel.y, z: accel.z };

      if (dx + dy + dz > 18) {
        shakeCountRef.current++;
        if (shakeCountRef.current >= 4 && phase !== "spinning" && phase !== "revealing") {
          shakeCountRef.current = 0;
          trigger();
        }
      }
    };

    const requestPermission = async () => {
      if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
        try {
          const res = await (DeviceMotionEvent as any).requestPermission();
          if (res === "granted") {
            permitGranted = true;
            window.addEventListener("devicemotion", handleMotion);
          }
        } catch { /* denied */ }
      } else {
        permitGranted = true;
        window.addEventListener("devicemotion", handleMotion);
      }
    };

    requestPermission();
    return () => {
      if (permitGranted) window.removeEventListener("devicemotion", handleMotion);
      clearTimeouts();
    };
  }, [phase, trigger, clearTimeouts]);

  const isAnimating = phase === "spinning" || phase === "revealing" || phase === "hiding";
  const showAnswer = phase === "revealing" || phase === "shown";

  return (
    <div className="flex flex-col items-center gap-10 select-none">
      <p className="text-on-primary-mute text-center text-sm max-w-md">
        Запитай щось і натисни на кулю
      </p>

      <button
        onClick={isAnimating ? undefined : trigger}
        className="relative cursor-pointer focus:outline-none group"
        aria-label="Magic 8-Ball"
      >
        {/* Ambient glow */}
        <div
          className="absolute rounded-full blur-[80px] transition-all duration-1000 ease-out"
          style={{
            inset: "-40px",
            background: showAnswer
              ? "radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%)"
              : "radial-gradient(circle, rgba(99,102,241,0.06), transparent 70%)",
          }}
        />

        {/* Sphere */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80">
          {/* Sphere body */}
          <div
            className="absolute inset-0 rounded-full transition-all duration-300"
            style={{
              background:
                "radial-gradient(ellipse 35% 30% at 38% 32%, rgba(255,255,255,0.07), transparent), " +
                "radial-gradient(ellipse 50% 50% at 65% 70%, rgba(0,0,0,0.5), transparent), " +
                "radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0d0d1a 40%, #050510 70%, #000005 100%)",
              boxShadow:
                "inset 0 2px 20px rgba(255,255,255,0.04), " +
                "inset 0 -4px 30px rgba(0,0,0,0.6), " +
                "0 0 60px -10px rgba(99,102,241," + (0.1 + windowGlow * 0.25) + "), " +
                "0 20px 50px -15px rgba(0,0,0,0.8)",
              transform: phase === "spinning" ? "scale(1.02)" : "scale(1)",
            }}
          />

          {/* Specular highlight */}
          <div
            className="absolute rounded-full"
            style={{
              top: "8%",
              left: "22%",
              width: "35%",
              height: "18%",
              background:
                "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.06), transparent 70%)",
              transform: "rotate(-15deg)",
            }}
          />

          {/* Bottom rim light */}
          <div
            className="absolute rounded-full"
            style={{
              bottom: "12%",
              right: "18%",
              width: "25%",
              height: "10%",
              background:
                "radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.08), transparent 70%)",
              transform: "rotate(20deg)",
            }}
          />

          {/* Inner viewport - dark indigo circle */}
          <div
            className="absolute rounded-full flex items-center justify-center overflow-hidden transition-all duration-700"
            style={{
              top: "25%",
              left: "25%",
              width: "50%",
              height: "50%",
              background:
                "radial-gradient(circle at 45% 40%, #0f0a2a 0%, #080520 50%, #030212 100%)",
              boxShadow:
                "inset 0 0 40px rgba(0,0,0,0.8), " +
                "inset 0 2px 15px rgba(99,102,241," + (0.05 + windowGlow * 0.2) + "), " +
                "0 0 " + (20 + windowGlow * 30) + "px rgba(99,102,241," + (0.05 + windowGlow * 0.2) + ")",
            }}
          >
            {/* 3D Scene container */}
            <div
              className="relative w-full h-full flex items-center justify-center"
              style={{ perspective: "400px" }}
            >
              {/* 3D Octahedron */}
              <div
                className="relative"
                style={{
                  width: "100px",
                  height: "100px",
                  transformStyle: "preserve-3d",
                  transform: `translateZ(-20px) rotateX(${dieRotation.x}deg) rotateY(${dieRotation.y}deg) rotateZ(${dieRotation.z}deg)`,
                  transition: phase === "idle" || phase === "hiding" ? "transform 0.6s ease-out" : "none",
                  opacity: phase === "idle" ? 0.3 : 1,
                }}
              >
                {FACES.map((face, i) => (
                  <div
                    key={i}
                    className="absolute inset-0"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: face.rot,
                    }}
                  >
                    <svg viewBox="0 0 120 120" className="w-full h-full">
                      <polygon
                        points={face.points}
                        fill="rgba(67,56,202,0.12)"
                        stroke="rgba(129,140,248,0.35)"
                        strokeWidth="1"
                      />
                    </svg>
                  </div>
                ))}
              </div>

              {/* Answer text overlay */}
              {answer && showAnswer && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    animation: "answerReveal 0.8s ease-out forwards",
                  }}
                >
                  <span
                    className="text-indigo-200 font-bold tracking-wider text-center px-2"
                    style={{
                      fontSize: "clamp(14px, 4vw, 20px)",
                      textShadow: "0 0 20px rgba(99,102,241,0.6), 0 0 40px rgba(99,102,241,0.3)",
                      filter: "drop-shadow(0 0 8px rgba(99,102,241,0.4))",
                    }}
                  >
                    {answer}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Hint */}
      {phase === "idle" && (
        <p className="text-on-primary-mute/40 text-xs animate-pulse">
          торкнись кулю
        </p>
      )}

      {/* Reset */}
      {phase === "shown" && (
        <button
          onClick={reset}
          className="btn-ghost text-on-primary"
          style={{ animation: "uiFadeIn 0.4s ease-out" }}
        >
          ЩЕ РАЗ
        </button>
      )}

      <p className="text-on-primary-mute/30 text-[10px] sm:hidden">
        потряси телефон для відповіді
      </p>

      <style jsx>{`
        @keyframes answerReveal {
          0% { opacity: 0; transform: scale(0.7) translateY(6px); }
          60% { opacity: 1; transform: scale(1.05) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes uiFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
