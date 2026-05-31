"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function SpinTrickClient() {
  const [emoji, setEmoji] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [motionReady, setMotionReady] = useState(false);

  const [metricZ, setMetricZ] = useState(0);
  const [metricTotal, setMetricTotal] = useState(0);
  const [metricEvents, setMetricEvents] = useState(0);
  const [metricTriggered, setMetricTriggered] = useState(false);
  const [metricPermission, setMetricPermission] = useState<"idle" | "requested" | "granted" | "denied" | "no-api">("idle");

  const totalRotationRef = useRef(0);
  const comboDirRef = useRef(0);
  const lastTimeRef = useRef(0);
  const comboCountRef = useRef(0);
  const triggeredRef = useRef(false);
  const eventCountRef = useRef(0);
  const soundRef = useRef<HTMLAudioElement | null>(null);
  const comboSoundRef = useRef<HTMLAudioElement | null>(null);
  const dragStartRef = useRef<{ x: number; time: number } | null>(null);

  useEffect(() => {
    soundRef.current = new Audio("/spintrick-sound.mp3");
    comboSoundRef.current = new Audio("/spintrick-combosound.mp3");
    soundRef.current.preload = "auto";
    comboSoundRef.current.preload = "auto";
  }, []);

  const playTrickSound = useCallback((isCombo: boolean) => {
    try {
      const audio = isCombo ? comboSoundRef.current : soundRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } catch {
      // audio unavailable
    }
  }, []);

  const triggerTrick = useCallback(
    (direction: number) => {
      const isCombo = comboDirRef.current !== 0 && comboDirRef.current === direction;

      if (isCombo) {
        comboCountRef.current += 1;
      } else {
        comboCountRef.current = 1;
      }
      comboDirRef.current = direction;

      setCombo(comboCountRef.current);
      setEmoji("😎");
      setSpinning(true);
      playTrickSound(isCombo);

      setTimeout(() => {
        setEmoji(null);
        setSpinning(false);
      }, 800);
    },
    [playTrickSound],
  );

  const handleMotion = useCallback(
    (event: DeviceMotionEvent) => {
      const raw = event.rotationRate as Record<string, number> | null;
      if (!raw) return;
      const z = raw.z ?? raw.alpha ?? null;
      if (z === null) return;

      const now = performance.now();
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = now;
        return;
      }
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (dt <= 0 || dt > 0.5) return;

      const angularVelDeg = z * (180 / Math.PI);
      const degreesMoved = angularVelDeg * dt;
      totalRotationRef.current += degreesMoved;
      eventCountRef.current += 1;

      setMetricZ(angularVelDeg);
      setMetricTotal(totalRotationRef.current);
      setMetricEvents(eventCountRef.current);
      setMetricTriggered(triggeredRef.current);

      const absTotal = Math.abs(totalRotationRef.current);

      if (absTotal > 270 && !triggeredRef.current) {
        const dir = Math.sign(totalRotationRef.current);
        triggerTrick(dir);
        triggeredRef.current = true;
      }

      if (Math.abs(angularVelDeg) < 10) {
        totalRotationRef.current = 0;
        triggeredRef.current = false;
        if (comboDirRef.current !== 0) {
          comboDirRef.current = 0;
          comboCountRef.current = 0;
          setCombo(0);
        }
      }
    },
    [triggerTrick],
  );

  const enableMotion = useCallback(async () => {
    if (typeof window === "undefined" || motionReady) return;

    const DeviceMotionEventCtor = window.DeviceMotionEvent as
      | (typeof DeviceMotionEvent & {
          requestPermission?: () => Promise<PermissionState>;
        })
      | undefined;

    if (!DeviceMotionEventCtor) {
      setMetricPermission("no-api");
      return;
    }

    try {
      if (typeof DeviceMotionEventCtor.requestPermission === "function") {
        setMetricPermission("requested");
        const permission = await DeviceMotionEventCtor.requestPermission();
        if (permission !== "granted") {
          setMetricPermission("denied");
          return;
        }
      }

      setMetricPermission("granted");
      window.addEventListener("devicemotion", handleMotion);
      setMotionReady(true);
    } catch {
      setMetricPermission("denied");
    }
  }, [handleMotion, motionReady]);

  useEffect(() => {
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, [handleMotion]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      enableMotion();
      dragStartRef.current = { x: e.clientX, time: Date.now() };
    },
    [enableMotion],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dt = Date.now() - dragStartRef.current.time;
      dragStartRef.current = null;

      if (dt < 600 && Math.abs(dx) > 80) {
        triggerTrick(dx > 0 ? 1 : -1);
      }
    },
    [triggerTrick],
  );

  return (
    <div className="flex flex-col items-center gap-8 select-none">
      <p className="text-on-primary-mute text-center text-sm max-w-md">
        Оберти телефон щоб отримати 😎. На десктопі — свайпни по кулі.
      </p>

      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="group relative h-[280px] w-[280px] cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 sm:h-[360px] sm:w-[360px]"
        aria-label="SpinTrick"
      >
        <span className="absolute -inset-10 rounded-full bg-indigo-500/10 blur-[70px] transition-opacity duration-700 group-hover:opacity-90" />

        <span
          className={`absolute inset-0 rounded-full transition-transform duration-300 ${spinning ? "scale-105" : "scale-100"}`}
          style={{
            background:
              "radial-gradient(circle at 31% 23%, rgba(255,255,255,0.15) 0 20%, transparent 50%), " +
              "radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0d0d1a 50%, #000005 100%)",
            boxShadow:
              "inset 0 0 60px rgba(0,0,0,0.8), 0 0 40px rgba(99,102,241,0.15)",
          }}
        />

        <span className="absolute left-[18%] top-[12%] h-[22%] w-[34%] rotate-[-24deg] rounded-full bg-white/10 blur-xl" />

        {emoji ? (
          <span
            className="absolute inset-0 flex items-center justify-center text-[80px] sm:text-[100px] animate-[emojiPop_0.8s_ease-out]"
            key={combo}
          >
            {emoji}
          </span>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[60px] sm:text-[72px] opacity-20 group-hover:opacity-40 transition-opacity">
            📱
          </span>
        )}
      </button>

      <div className="h-12 text-center">
        {spinning ? (
          <p className="micro-cap text-indigo-200">TRICK!</p>
        ) : combo > 0 ? (
          <p className="micro-cap text-indigo-200">COMBO x{combo}</p>
        ) : (
          <p className="text-on-primary-mute/45 text-xs animate-pulse">
            {motionReady ? "обертай телефон" : "свайпни або оберти"}
          </p>
        )}
      </div>

      <p className="text-on-primary-mute/30 text-[10px]">
        Inspired by{" "}
        <a
          href="https://github.com/JumperOnJava/spintrick"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-on-primary-mute/60 transition-colors"
        >
          JumperOnJava/spintrick
        </a>
      </p>

      <div className="w-full max-w-md card-dark p-4 mt-4">
        <p className="micro-cap text-ink-mute mb-3">DEBUG METRICS</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <span className="text-ink-mute">Gyroscope</span>
            <span className={`font-mono font-bold ${motionReady ? "text-green-400" : "text-red-400"}`}>
              {motionReady ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-ink-mute">Permission</span>
            <span className={`font-mono font-bold ${
              metricPermission === "granted" ? "text-green-400" :
              metricPermission === "denied" ? "text-red-400" :
              metricPermission === "no-api" ? "text-yellow-400" :
              "text-on-primary-mute"
            }`}>
              {metricPermission.toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-ink-mute">Angular Vel (°/s)</span>
            <span className="font-mono font-bold text-on-primary">
              {metricZ.toFixed(1)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-ink-mute">Total Rotation (°)</span>
            <span className={`font-mono font-bold ${Math.abs(metricTotal) > 270 ? "text-indigo-400" : "text-on-primary"}`}>
              {metricTotal.toFixed(0)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-ink-mute">Events</span>
            <span className="font-mono font-bold text-on-primary">
              {metricEvents}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-ink-mute">Triggered</span>
            <span className={`font-mono font-bold ${metricTriggered ? "text-indigo-400" : "text-on-primary-mute"}`}>
              {metricTriggered ? "YES" : "NO"}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-hairline-dark">
          <div className="relative h-2 w-full rounded-full bg-canvas-night-soft overflow-hidden">
            <div
              className="absolute top-0 left-1/2 h-full rounded-full transition-all duration-75"
              style={{
                width: `${Math.min(50, Math.abs(metricZ) / 3)}%`,
                marginLeft: metricZ >= 0 ? "0" : "auto",
                marginRight: metricZ < 0 ? "0" : "auto",
                background: Math.abs(metricTotal) > 270 ? "#818cf8" : "#4b5563",
              }}
            />
            <div className="absolute top-0 left-1/2 h-full w-px bg-white/20" />
          </div>
          <p className="text-ink-mute text-[10px] mt-1 text-center">
            {Math.abs(metricTotal).toFixed(0)}° / 270° to trick
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes emojiPop {
          0% { opacity: 0; transform: scale(0.3) rotate(-20deg); }
          40% { opacity: 1; transform: scale(1.3) rotate(5deg); }
          70% { transform: scale(0.95) rotate(-2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
