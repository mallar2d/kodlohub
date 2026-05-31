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

type Phase = "idle" | "shaking" | "shown";

export default function Magic8BallClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [answer, setAnswer] = useState<string | null>(null);
  const [tilt, setTilt] = useState({ x: -8, y: 10, z: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const motionEnabledRef = useRef(false);
  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 });
  const shakeCountRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const trigger = useCallback(() => {
    clearTimer();
    setPhase("shaking");
    setAnswer(null);
    setTilt({
      x: -24 + Math.random() * 48,
      y: -28 + Math.random() * 56,
      z: -10 + Math.random() * 20,
    });

    timeoutRef.current = setTimeout(() => {
      setAnswer(ANSWERS[Math.floor(Math.random() * ANSWERS.length)]);
      setPhase("shown");
      setTilt({ x: -7 + Math.random() * 14, y: -8 + Math.random() * 16, z: 0 });
      timeoutRef.current = null;
    }, 980);
  }, [clearTimer]);

  const handleMotion = useCallback(
    (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity;
      if (!accel || accel.x === null || accel.y === null || accel.z === null) return;

      const dx = Math.abs(accel.x - lastAccelRef.current.x);
      const dy = Math.abs(accel.y - lastAccelRef.current.y);
      const dz = Math.abs(accel.z - lastAccelRef.current.z);
      lastAccelRef.current = { x: accel.x, y: accel.y, z: accel.z };

      if (dx + dy + dz > 20) {
        shakeCountRef.current += 1;
        if (shakeCountRef.current >= 3) {
          shakeCountRef.current = 0;
          trigger();
        }
      }
    },
    [trigger],
  );

  const enableMotion = useCallback(async () => {
    if (motionEnabledRef.current || typeof window === "undefined") return;

    const MotionEventCtor = window.DeviceMotionEvent as
      | (typeof DeviceMotionEvent & { requestPermission?: () => Promise<PermissionState> })
      | undefined;
    if (!MotionEventCtor) return;

    try {
      if (typeof MotionEventCtor.requestPermission === "function") {
        const permission = await MotionEventCtor.requestPermission();
        if (permission !== "granted") return;
      }

      window.addEventListener("devicemotion", handleMotion);
      motionEnabledRef.current = true;
    } catch {
      // Some browsers expose DeviceMotionEvent but deny access without noise.
    }
  }, [handleMotion]);

  const handleBallClick = useCallback(() => {
    enableMotion();
    if (phase !== "shaking") trigger();
  }, [enableMotion, phase, trigger]);

  useEffect(() => {
    return () => {
      clearTimer();
      if (motionEnabledRef.current) window.removeEventListener("devicemotion", handleMotion);
    };
  }, [clearTimer, handleMotion]);

  const isShaking = phase === "shaking";
  const isShown = phase === "shown";

  return (
    <div className="flex flex-col items-center gap-8 select-none">
      <p className="text-on-primary-mute text-center text-sm max-w-md">
        Запитай щось і натисни на кулю. На телефоні після першого натиску можна просто потрясти.
      </p>

      <button
        type="button"
        onClick={handleBallClick}
        disabled={isShaking}
        className="group relative h-[300px] w-[300px] cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 sm:h-[380px] sm:w-[380px] disabled:cursor-wait"
        aria-label="Magic 8-Ball"
      >
        <span className="absolute -inset-10 rounded-full bg-indigo-500/10 blur-[70px] transition-opacity duration-700 group-hover:opacity-90" />
        <span className="absolute inset-x-10 bottom-0 h-10 rounded-full bg-black/80 blur-2xl" />

        <span
          className={`absolute inset-0 rounded-full transition-transform duration-700 ease-out ${isShaking ? "animate-[ballShake_0.98s_cubic-bezier(.36,.07,.19,.97)]" : ""}`}
          style={{
            background:
              "radial-gradient(circle at 31% 23%, rgba(255,255,255,0.42) 0 5%, rgba(255,255,255,0.13) 12%, transparent 28%), " +
              "radial-gradient(circle at 68% 74%, rgba(59,70,130,0.28), transparent 20%), " +
              "radial-gradient(circle at 50% 50%, #171824 0%, #070711 50%, #010104 79%, #000 100%)",
            boxShadow:
              "inset 24px 18px 46px rgba(255,255,255,0.08), inset -42px -50px 70px rgba(0,0,0,0.95), 0 34px 70px rgba(0,0,0,0.85)",
          }}
        />

        <span className="absolute left-[18%] top-[12%] h-[22%] w-[34%] rotate-[-24deg] rounded-full bg-white/18 blur-xl" />
        <span className="absolute inset-[18%] rounded-full border border-white/5" />

        <span
          className={`absolute left-1/2 top-1/2 flex h-[43%] w-[43%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-all duration-700 ${isShown ? "scale-100" : "scale-95"}`}
          style={{
            background:
              "radial-gradient(circle at 45% 38%, #13214a 0%, #05091d 44%, #01020a 100%)",
            boxShadow:
              "inset 0 0 32px rgba(0,0,0,0.96), inset 0 0 18px rgba(99,102,241,0.35), 0 0 28px rgba(99,102,241,0.18)",
          }}
        >
          <span
            className="relative flex h-[70%] w-[70%] items-center justify-center transition-transform duration-700 ease-out"
            style={{
              transform: `perspective(480px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) rotateZ(${tilt.z}deg)`,
              transformStyle: "preserve-3d",
            }}
          >
            <span className="absolute h-full w-full rotate-180 bg-indigo-400/90 [clip-path:polygon(50%_92%,5%_14%,95%_14%)]" />
            <span className="absolute h-[92%] w-[92%] rotate-180 bg-[#11175a] [clip-path:polygon(50%_90%,8%_16%,92%_16%)]" />
            <span className="absolute h-[78%] w-[78%] rotate-180 bg-gradient-to-b from-indigo-400/40 to-indigo-950 [clip-path:polygon(50%_88%,9%_17%,91%_17%)]" />

            <span className="absolute top-[22%] text-[44px] font-black leading-none tracking-tight text-white/95 drop-shadow-[0_0_14px_rgba(165,180,252,0.9)] transition-opacity duration-300 sm:text-[58px]">
              {answer ? "" : "8"}
            </span>
            {answer && (
              <span className="absolute top-[31%] max-w-[74%] text-center text-sm font-black uppercase leading-tight tracking-[0.08em] text-indigo-50 drop-shadow-[0_0_12px_rgba(165,180,252,0.85)] animate-[answerPop_0.42s_ease-out] sm:text-base">
                {answer}
              </span>
            )}
          </span>
        </span>
      </button>

      <div className="h-12 text-center">
        {isShaking ? (
          <p className="micro-cap text-indigo-200">КУЛЯ ДУМАЄ...</p>
        ) : isShown ? (
          <button type="button" onClick={trigger} className="btn-ghost text-on-primary">
            ЩЕ РАЗ
          </button>
        ) : (
          <p className="text-on-primary-mute/45 text-xs animate-pulse">торкнись кулю</p>
        )}
      </div>

      <style jsx global>{`
        @keyframes ballShake {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          12% { transform: translate3d(-7px, 4px, 0) rotate(-3deg); }
          24% { transform: translate3d(8px, -5px, 0) rotate(3deg); }
          36% { transform: translate3d(-8px, -3px, 0) rotate(-2deg); }
          48% { transform: translate3d(7px, 5px, 0) rotate(2deg); }
          60% { transform: translate3d(-5px, 2px, 0) rotate(-1deg); }
          74% { transform: translate3d(4px, -2px, 0) rotate(1deg); }
        }
        @keyframes answerPop {
          from { opacity: 0; transform: scale(0.72) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
