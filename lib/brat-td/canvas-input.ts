/**
 * Canvas pointer + keyboard input handlers for Brat TD.
 *
 * Extracted from BratTDClient.tsx (Task 12) to keep the React component thin.
 * The hook returns a set of event handler factories that close over the
 * supplied refs / state setters / action callbacks. The handlers own no
 * state of their own — they are pure bridges between DOM events and the
 * game's mutable refs.
 */

import { useEffect, useRef } from "react";
import { GAME_HEIGHT, GAME_WIDTH, TOWER_CONFIGS } from "@/app/(main)/tools/brat-td/gameConfig";

// ─────────────────────────────────────────────────────────────────────────
//  Hook config
// ─────────────────────────────────────────────────────────────────────────

export interface UseCanvasInputConfig {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;

  // State / ref pairs
  gameStatus: "idle" | "playing" | "gameover" | "victory";
  setGameStatus: (s: "idle" | "playing" | "gameover" | "victory") => void;
  isWaveActive: boolean;
  isPaused: boolean;
  setIsPaused: React.Dispatch<React.SetStateAction<boolean>>;
  selectedShopTower: string | null;
  setSelectedShopTower: React.Dispatch<React.SetStateAction<string | null>>;
  selectedPlacedTowerId: string | null;
  setSelectedPlacedTowerId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedTower: (value: unknown) => void;

  // Refs the hook mutates
  mousePosRef: React.MutableRefObject<{ x: number; y: number }>;
  setMousePos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  isMouseOnCanvasRef: React.MutableRefObject<boolean>;
  setIsMouseOnCanvas: React.Dispatch<React.SetStateAction<boolean>>;
  draggedTowerTypeRef: React.MutableRefObject<string | null>;
  setDraggedTowerType: React.Dispatch<React.SetStateAction<string | null>>;
  draggedTowerPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  setDraggedTowerPos: React.Dispatch<
    React.SetStateAction<{ x: number; y: number } | null>
  >;

  // Action callbacks
  pushLog: (msg: string) => void;
  isTowerUnlocked: (type: string) => boolean;
  tryPlaceTower: (type: string, x: number, y: number) => boolean;
  startNextWave: () => void;
  buyUpgrade: (pathIndex: number) => void;
  sellSelectedTower: () => void;
  cycleTargetingMode: () => void;
}

// ─────────────────────────────────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────────────────────────────────

export function useCanvasInput(config: UseCanvasInputConfig) {
  // Hold the latest config in a ref so the event handlers below can read
  // fresh values without re-subscribing on every render.
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  });

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = configRef.current.canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const updateCanvasPointer = (clientX: number, clientY: number) => {
    const point = getCanvasPoint(clientX, clientY);
    if (!point) return null;
    const c = configRef.current;
    c.mousePosRef.current = point;
    c.setMousePos(point);
    if (c.draggedTowerTypeRef.current) {
      c.draggedTowerPosRef.current = point;
      c.setDraggedTowerPos(point);
    }
    return point;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = configRef.current;
    if (c.gameStatus !== "playing") return;
    const point = updateCanvasPointer(e.clientX, e.clientY);
    if (!point) return;
    if (c.selectedShopTower) {
      const success = c.tryPlaceTower(c.selectedShopTower, point.x, point.y);
      if (success) c.setSelectedShopTower(null);
      return;
    }
    // Tower selection uses an external helper supplied by the caller via
    // pushLog + setSelectedTower (the original implementation searched
    // towersRef inline). We delegate the visual feedback here; selection
    // itself is handled by the clickable canvas wrapper.
    if (typeof window !== "undefined" && window.innerWidth < 768 && c.selectedPlacedTowerId) {
      c.setIsPaused(true);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    updateCanvasPointer(e.clientX, e.clientY);
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    updateCanvasPointer(touch.clientX, touch.clientY);
  };

  const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const c = configRef.current;
    const touch = e.changedTouches[0];
    if (!touch || c.gameStatus !== "playing" || !c.selectedShopTower) return;
    const point = updateCanvasPointer(touch.clientX, touch.clientY);
    if (!point) return;
    if (c.tryPlaceTower(c.selectedShopTower, point.x, point.y)) {
      c.setSelectedShopTower(null);
    }
  };

  // Global listeners for custom touch-drag events dispatched by ShopPanel buttons
  useEffect(() => {
    const handleTouchDragMove = (e: Event) => {
      const customEv = e as CustomEvent<{ clientX: number; clientY: number }>;
      if (customEv.detail) {
        updateCanvasPointer(customEv.detail.clientX, customEv.detail.clientY);
      }
    };

    const handleTouchDragEnd = (e: Event) => {
      const customEv = e as CustomEvent<{ clientX: number; clientY: number; type: string }>;
      if (!customEv.detail) return;
      const c = configRef.current;
      if (c.gameStatus !== "playing") return;
      const point = updateCanvasPointer(customEv.detail.clientX, customEv.detail.clientY);
      if (point) {
        const canvas = c.canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          if (
            customEv.detail.clientX >= rect.left &&
            customEv.detail.clientX <= rect.right &&
            customEv.detail.clientY >= rect.top &&
            customEv.detail.clientY <= rect.bottom
          ) {
            if (c.tryPlaceTower(customEv.detail.type, point.x, point.y)) {
              c.setSelectedShopTower(null);
            }
          }
        }
      }
      c.draggedTowerTypeRef.current = null;
      c.draggedTowerPosRef.current = null;
    };

    window.addEventListener("brat-td-touch-drag-move", handleTouchDragMove);
    window.addEventListener("brat-td-touch-drag-end", handleTouchDragEnd);
    return () => {
      window.removeEventListener("brat-td-touch-drag-move", handleTouchDragMove);
      window.removeEventListener("brat-td-touch-drag-end", handleTouchDragEnd);
    };
  }, []);

  // Keyboard shortcuts. Only re-subscribes on the three deps that affect
  // the bound values (game status, currently selected shop tower, current
  // placed tower id).
  useEffect(() => {
    const c = configRef.current;
    if (c.gameStatus !== "playing") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["q", "w", "e"].includes(key) && c.selectedPlacedTowerId) {
        e.preventDefault();
        c.buyUpgrade({ q: 0, w: 1, e: 2 }[key] ?? 0);
        return;
      }
      if (e.key === " " && !c.isWaveActive) {
        e.preventDefault();
        c.startNextWave();
        return;
      }
      if (
        (e.key === "Delete" || e.key === "x" || e.key === "X") &&
        c.selectedPlacedTowerId
      ) {
        e.preventDefault();
        c.sellSelectedTower();
        return;
      }
      const towerKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
      const towerTypes = Object.keys(TOWER_CONFIGS);
      if (towerKeys.includes(e.key)) {
        const idx = e.key === "0" ? 9 : parseInt(e.key) - 1;
        if (idx < towerTypes.length) {
          const type = towerTypes[idx];
          if (!c.isTowerUnlocked(type)) {
            c.pushLog(`${TOWER_CONFIGS[type].name} ще заблоковано.`);
            return;
          }
          c.setSelectedShopTower(c.selectedShopTower === type ? null : type);
          c.setSelectedPlacedTowerId(null);
          c.setSelectedTower(null);
        }
      } else if (e.key === "Escape") {
        c.setSelectedShopTower(null);
        c.setSelectedPlacedTowerId(null);
        c.setSelectedTower(null);
      } else if (e.key === "p" || e.key === "P") {
        c.setIsPaused((prev) => !prev);
      } else if ((e.key === "t" || e.key === "T") && c.selectedPlacedTowerId) {
        e.preventDefault();
        c.cycleTargetingMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [config.gameStatus, config.selectedShopTower, config.selectedPlacedTowerId, config.isWaveActive]);

  return {
    getCanvasPoint,
    updateCanvasPointer,
    handleCanvasClick,
    handleCanvasMouseMove,
    handleCanvasTouchMove,
    handleCanvasTouchEnd,
  };
}
