"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { formatKavaAmount, formatTimeUntilClaim, getKyivNow } from "@/lib/kava";

interface TelegramProfile {
  id: string;
  username: string | null;
  firstName: string | null;
  photoUrl: string | null;
  linkedAt: string | null;
}

interface TransactionItem {
  id: number;
  action_type: string;
  amount_change: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

interface LeaderboardItem {
  rank: number;
  telegram_id: string;
  amount: number;
  first_name: string | null;
  username: string | null;
  photo_url: string | null;
  kodlohub_user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
  } | null;
}

interface DiceRoom {
  id: string;
  creator_id: string;
  creator_name: string;
  creator_photo_url: string | null;
  joiner_id: string | null;
  joiner_name: string | null;
  joiner_photo_url: string | null;
  stake: number;
  status: "waiting" | "playing" | "finished" | "cancelled";
  current_turn: string | null;
  winner_id: string | null;
  created_at: string;
}

interface DiceRollItem {
  player_id: string;
  roll_value: number;
  player_total: number;
  rolled_at: string;
}

interface HammerRoom {
  id: string;
  creator_id: string;
  creator_name: string;
  creator_photo_url: string | null;
  joiner_id: string | null;
  joiner_name: string | null;
  joiner_photo_url: string | null;
  stake: number;
  status: "waiting" | "playing" | "finished" | "cancelled";
  round_index: number;
  max_rounds: number;
  distance_state: "short" | "long";
  creator_hp: number;
  joiner_hp: number;
  creator_charges: number;
  joiner_charges: number;
  winner_id: string | null;
  result_reason: string | null;
  round_started_at: string;
  created_at: string;
}

interface ShopItem {
  id: number;
  title: string;
  price: number;
  description: string;
  image_url: string | null;
  quantity: number | null;
  active: boolean;
}

export default function KavaClient() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isLinked, setIsLinked] = useState(false);
  const [telegram, setTelegram] = useState<TelegramProfile | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [canClaim, setCanClaim] = useState(false);
  const [secondsUntilNextClaim, setSecondsUntilNextClaim] = useState<number | null>(null);
  const [totalClaims, setTotalClaims] = useState(0);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Link Modal / Flow State
  const [linking, setLinking] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkPolling, setLinkPolling] = useState(false);

  // Transfer Modal State
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  // Claim State
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState<{ amount: number; message: string; bonus?: boolean } | null>(null);

  // Active Tab
  const [tab, setTab] = useState<"hub" | "games" | "shop" | "leaderboard" | "history">("hub");

  // Games Sub-state
  const [gameMode, setGameMode] = useState<"list" | "dice" | "hammer">("list");

  // Dice state
  const [diceRooms, setDiceRooms] = useState<DiceRoom[]>([]);
  const [activeDiceRoom, setActiveDiceRoom] = useState<DiceRoom | null>(null);
  const [diceRolls, setDiceRolls] = useState<DiceRollItem[]>([]);
  const [creatorDiceScore, setCreatorDiceScore] = useState(0);
  const [joinerDiceScore, setJoinerDiceScore] = useState(0);
  const [diceStakeInput, setDiceStakeInput] = useState("5");
  const [diceRolling, setDiceRolling] = useState(false);

  // Hammer state
  const [hammerRooms, setHammerRooms] = useState<HammerRoom[]>([]);
  const [activeHammerRoom, setActiveHammerRoom] = useState<HammerRoom | null>(null);
  const [hammerStakeInput, setHammerStakeInput] = useState("10");
  const [hammerMoveSubmitted, setHammerMoveSubmitted] = useState<string | null>(null);
  const [hammerMoving, setHammerMoving] = useState(false);

  // Shop state
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [buyingId, setBuyingId] = useState<number | null>(null);

  const myPlayerId = telegram?.id || user?.id || "";

  // Fetch Kava Profile State
  const fetchKavaState = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/v1/kava/me", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setIsLinked(data.isLinked);
        setTelegram(data.telegram);
        setBalance(data.balance);
        setCanClaim(data.canClaim);
        setSecondsUntilNextClaim(data.timeUntilNextClaim);
        setTotalClaims(data.totalClaims);
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to load kava state:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch Leaderboard
  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const res = await fetch("/api/v1/kava/leaderboard", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLeaderboard(data.leaderboard || []);
        }
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  // Fetch Shop Items
  const fetchShopItems = useCallback(async () => {
    setShopLoading(true);
    try {
      const res = await fetch("/api/v1/kava/shop/items", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setShopItems(data.items || []);
        }
      }
    } catch (err) {
      console.error("Failed to load shop items:", err);
    } finally {
      setShopLoading(false);
    }
  }, []);

  // Fetch Dice Rooms
  const fetchDiceRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/kava/games/dice/rooms", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDiceRooms(data.rooms || []);
          if (myPlayerId && !activeDiceRoom) {
            const myActive = (data.rooms as DiceRoom[]).find(
              (r) => (r.creator_id === myPlayerId || r.joiner_id === myPlayerId) && (r.status === "waiting" || r.status === "playing")
            );
            if (myActive) {
              setActiveDiceRoom(myActive);
            }
          }
        }
      }
    } catch (e) {
      console.error("Error fetching dice rooms:", e);
    }
  }, [myPlayerId, activeDiceRoom]);

  // Fetch Hammer Rooms
  const fetchHammerRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/kava/games/hammer/rooms", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHammerRooms(data.rooms || []);
          if (myPlayerId && !activeHammerRoom) {
            const myActive = (data.rooms as HammerRoom[]).find(
              (r) => (r.creator_id === myPlayerId || r.joiner_id === myPlayerId) && (r.status === "waiting" || r.status === "playing")
            );
            if (myActive) {
              setActiveHammerRoom(myActive);
            }
          }
        }
      }
    } catch (e) {
      console.error("Error fetching hammer rooms:", e);
    }
  }, [myPlayerId, activeHammerRoom]);

  // Sync Active Dice Room State
  const syncActiveDiceRoom = useCallback(async () => {
    if (!activeDiceRoom) return;
    try {
      const res = await fetch(`/api/v1/kava/games/dice/rooms/${activeDiceRoom.id}/state`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActiveDiceRoom(data.room);
          setDiceRolls(data.rolls || []);
          setCreatorDiceScore(data.creator_score || 0);
          setJoinerDiceScore(data.joiner_score || 0);
        }
      }
    } catch (e) {
      console.error("Error syncing active dice room:", e);
    }
  }, [activeDiceRoom]);

  // Sync Active Hammer Room State
  const syncActiveHammerRoom = useCallback(async () => {
    if (!activeHammerRoom) return;
    try {
      const res = await fetch(`/api/v1/kava/games/hammer/rooms/${activeHammerRoom.id}/state`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActiveHammerRoom(data.room);
        }
      }
    } catch (e) {
      console.error("Error syncing active hammer room:", e);
    }
  }, [activeHammerRoom]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchKavaState();
      } else {
        setLoading(false);
      }
      fetchLeaderboard();
      fetchShopItems();
      fetchDiceRooms();
      fetchHammerRooms();
    }
  }, [authLoading, user, fetchKavaState, fetchLeaderboard, fetchShopItems, fetchDiceRooms, fetchHammerRooms]);

  // Poll active game rooms
  useEffect(() => {
    if (tab !== "games") return;
    const interval = setInterval(() => {
      if (gameMode === "dice" && activeDiceRoom && activeDiceRoom.status === "playing") {
        syncActiveDiceRoom();
      } else if (gameMode === "dice") {
        fetchDiceRooms();
      }
      if (gameMode === "hammer" && activeHammerRoom && activeHammerRoom.status === "playing") {
        syncActiveHammerRoom();
      } else if (gameMode === "hammer") {
        fetchHammerRooms();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [tab, gameMode, activeDiceRoom, activeHammerRoom, syncActiveDiceRoom, syncActiveHammerRoom, fetchDiceRooms, fetchHammerRooms]);

  // Real-time second countdown for 22:00 reset
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilNextClaim((prev) => {
        if (prev === null || prev <= 0) return null;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Polling for Telegram link confirmation while modal is open
  useEffect(() => {
    if (!linkPolling || isLinked || !linkToken) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/kava/link/status?token=${encodeURIComponent(linkToken)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.linked) {
            setIsLinked(true);
            setTelegram(data.telegram);
            setBalance(data.balance);
            setCanClaim(data.canClaim);
            setSecondsUntilNextClaim(data.timeUntilNextClaim);
            setTotalClaims(data.totalClaims || 0);
            setLinking(false);
            setLinkPolling(false);
            toast("Telegram акаунт успішно підключено!", "success");
            fetchKavaState();
            fetchLeaderboard();
          }
        }
      } catch {
        // ignore
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [linkPolling, isLinked, linkToken, toast, fetchKavaState, fetchLeaderboard]);

  // Window focus re-sync
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchKavaState();
        fetchLeaderboard();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user, fetchKavaState, fetchLeaderboard]);

  // Start Telegram Link Flow
  const handleStartLink = async () => {
    try {
      setLinking(true);
      const res = await fetch("/api/v1/kava/link/start", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setLinkUrl(data.link_url);
        setLinkToken(data.token);
        setLinkPolling(true);
      } else {
        toast(data.error || "Помилка генерації посилання", "error");
        setLinking(false);
      }
    } catch {
      toast("Помилка підключення до сервера", "error");
      setLinking(false);
    }
  };

  // Daily Claim
  const handleClaim = async () => {
    if (claimLoading) return;
    setClaimLoading(true);
    setClaimResult(null);

    try {
      const res = await fetch("/api/v1/kava/claim", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setBalance(data.newBalance);
        setCanClaim(false);
        setSecondsUntilNextClaim(24 * 3600);
        setClaimResult({
          amount: data.amount,
          message: data.message,
          bonus: data.bonus,
        });
        toast(data.message, data.amount > 0 ? "success" : "info");
        fetchKavaState();
        fetchLeaderboard();
      } else {
        toast(data.error || "Помилка клейму кави", "error");
      }
    } catch {
      toast("Помилка запиту клейму", "error");
    } finally {
      setClaimLoading(false);
    }
  };

  // Transfer Kava
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferLoading) return;

    const amountNum = parseInt(transferAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast("Введи коректну кількість кави", "error");
      return;
    }

    if (!transferRecipient.trim()) {
      toast("Вкажи отримувача", "error");
      return;
    }

    setTransferLoading(true);
    try {
      const res = await fetch("/api/v1/kava/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: transferRecipient.trim(),
          amount: amountNum,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setBalance(data.newBalance);
        toast(`Успішно переказано ${amountNum} KAVA для ${data.recipientName}`, "success");
        setTransferOpen(false);
        setTransferRecipient("");
        setTransferAmount("");
        fetchKavaState();
        fetchLeaderboard();
      } else {
        toast(data.error || "Помилка переказу", "error");
        if (data.newBalance !== undefined) {
          setBalance(data.newBalance);
        }
      }
    } catch {
      toast("Помилка відправки запиту", "error");
    } finally {
      setTransferLoading(false);
    }
  };

  // Create Dice Room
  const handleCreateDiceRoom = async () => {
    const stake = parseInt(diceStakeInput, 10);
    if (!stake || stake < 1) {
      toast("≥1 нахуй", "error");
      return;
    }
    try {
      const res = await fetch("/api/v1/kava/games/dice/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stake }),
      });
      const data = await res.json();
      if (data.success) {
        toast("Кімнату створено", "success");
        setActiveDiceRoom(data.room);
        fetchDiceRooms();
      } else {
        toast(data.message || "Помилка", "error");
      }
    } catch {
      toast("Помилка запиту", "error");
    }
  };

  // Join Dice Room
  const handleJoinDiceRoom = async (roomId: string) => {
    try {
      const res = await fetch(`/api/v1/kava/games/dice/rooms/${roomId}/join`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast("Приєднався до битви кубів!", "success");
        setActiveDiceRoom(data.room);
        fetchDiceRooms();
        fetchKavaState();
      } else {
        toast(data.message || "Помилка входу", "error");
      }
    } catch {
      toast("Помилка запиту", "error");
    }
  };

  // Roll Dice
  const handleRollDice = async () => {
    if (!activeDiceRoom || diceRolling) return;
    setDiceRolling(true);
    try {
      const res = await fetch(`/api/v1/kava/games/dice/rooms/${activeDiceRoom.id}/roll`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        if (data.roll.winner) {
          toast(`ПЕРЕМОГА! +${activeDiceRoom.stake * 2} KAVA`, "success");
        } else {
          toast(`Кидок: ${data.roll.roll_value} (Всього: ${data.roll.player_total})`, "info");
        }
        syncActiveDiceRoom();
        fetchKavaState();
      } else {
        toast(data.message || "Помилка кидка", "error");
      }
    } catch {
      toast("Помилка кидка", "error");
    } finally {
      setDiceRolling(false);
    }
  };

  // Create Hammer Room
  const handleCreateHammerRoom = async () => {
    const stake = parseInt(hammerStakeInput, 10);
    if (!stake || stake < 1) {
      toast("≥1 нахуй", "error");
      return;
    }
    try {
      const res = await fetch("/api/v1/kava/games/hammer/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stake }),
      });
      const data = await res.json();
      if (data.success) {
        toast("Битву створено", "success");
        setActiveHammerRoom(data.room);
        fetchHammerRooms();
      } else {
        toast(data.message || "Помилка", "error");
      }
    } catch {
      toast("Помилка запиту", "error");
    }
  };

  // Join Hammer Room
  const handleJoinHammerRoom = async (roomId: string) => {
    try {
      const res = await fetch(`/api/v1/kava/games/hammer/rooms/${roomId}/join`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast("Приєднався до битви на молотках!", "success");
        setActiveHammerRoom(data.room);
        fetchHammerRooms();
        fetchKavaState();
      } else {
        toast(data.message || "Помилка входу", "error");
      }
    } catch {
      toast("Помилка запиту", "error");
    }
  };

  // Submit Hammer Move
  const handleHammerMove = async (action: string) => {
    if (!activeHammerRoom || hammerMoving) return;
    setHammerMoving(true);
    try {
      const res = await fetch(`/api/v1/kava/games/hammer/rooms/${activeHammerRoom.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.resolved) {
          setHammerMoveSubmitted(null);
          setActiveHammerRoom(data.room);
          if (data.round_summary.is_game_over) {
            toast(data.room.result_reason || "Битву завершено", "success");
          } else {
            toast(`Раунд завершено! Завдано шкоди: ${data.round_summary.damage_to_joiner} / ${data.round_summary.damage_to_creator}`, "info");
          }
          fetchKavaState();
        } else {
          setHammerMoveSubmitted(action);
          toast("Дію обрано! Очікуємо хід супротивника...", "info");
        }
      } else {
        toast(data.message || "Помилка дії", "error");
      }
    } catch {
      toast("Помилка запиту", "error");
    } finally {
      setHammerMoving(false);
    }
  };

  // Buy Shop Item
  const handleBuyShopItem = async (item: ShopItem) => {
    if (!isLinked) {
      handleStartLink();
      toast("Спочатку підключи Telegram акаунт", "info");
      return;
    }
    if (buyingId) return;
    if (balance < item.price) {
      toast(`Недостатньо кави (у тебе ${balance}, потрібно ${item.price} KAVA)`, "error");
      return;
    }
    setBuyingId(item.id);
    try {
      const res = await fetch("/api/v1/kava/shop/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast(data.message, "success");
        setBalance(data.newBalance);
        fetchShopItems();
        fetchKavaState();
      } else {
        toast(data.message || "Помилка купівлі", "error");
      }
    } catch {
      toast("Помилка запиту", "error");
    } finally {
      setBuyingId(null);
    }
  };

  const kyiv = getKyivNow();
  const isSpecialBonusMinute = kyiv.hour === 22 && kyiv.minute === 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-[1200px] mx-auto flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-on-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="micro-cap text-ink-mute">Синхронізація Kava Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-[1200px] mx-auto">
      {/* Clean Top Navigation Bar */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-hairline-dark pb-4">
        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => {
              setTab("hub");
              setGameMode("list");
              fetchKavaState();
            }}
            className={`button-cap px-5 py-2.5 rounded-lg border transition-all cursor-pointer ${
              tab === "hub"
                ? "bg-white text-black border-white font-bold"
                : "border-hairline-dark text-on-primary-mute hover:border-on-primary hover:text-on-primary"
            }`}
          >
            ДАШБОРД & ЙОБНУТИ
          </button>
          <button
            onClick={() => {
              setTab("games");
              fetchDiceRooms();
              fetchHammerRooms();
            }}
            className={`button-cap px-5 py-2.5 rounded-lg border transition-all cursor-pointer ${
              tab === "games"
                ? "bg-white text-black border-white font-bold"
                : "border-hairline-dark text-on-primary-mute hover:border-on-primary hover:text-on-primary"
            }`}
          >
            ІГРИ
          </button>
          <button
            onClick={() => {
              setTab("shop");
              fetchShopItems();
            }}
            className={`button-cap px-5 py-2.5 rounded-lg border transition-all cursor-pointer ${
              tab === "shop"
                ? "bg-white text-black border-white font-bold"
                : "border-hairline-dark text-on-primary-mute hover:border-on-primary hover:text-on-primary"
            }`}
          >
            МАГАЗИН
          </button>
          <button
            onClick={() => {
              setTab("leaderboard");
              fetchLeaderboard();
            }}
            className={`button-cap px-5 py-2.5 rounded-lg border transition-all cursor-pointer ${
              tab === "leaderboard"
                ? "bg-white text-black border-white font-bold"
                : "border-hairline-dark text-on-primary-mute hover:border-on-primary hover:text-on-primary"
            }`}
          >
            ЛІДЕРБОРД
          </button>
          {isLinked && (
            <button
              onClick={() => setTab("history")}
              className={`button-cap px-5 py-2.5 rounded-lg border transition-all cursor-pointer ${
                tab === "history"
                  ? "bg-white text-black border-white font-bold"
                  : "border-hairline-dark text-on-primary-mute hover:border-on-primary hover:text-on-primary"
              }`}
            >
              ІСТОРІЯ
            </button>
          )}
        </div>

        {/* Connected Telegram User Pill */}
        {user && isLinked && telegram && (
          <div className="flex items-center gap-2.5 p-1.5 px-3.5 rounded-full border border-hairline-dark bg-canvas-night-soft">
            {telegram.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={telegram.photoUrl}
                alt={telegram.username || "Telegram"}
                className="w-7 h-7 rounded-full object-cover border border-hairline-dark"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-[10px]">
                {telegram.firstName?.charAt(0) || "TG"}
              </div>
            )}
            <div className="text-left min-w-0 pr-1">
              <p className="text-xs font-bold text-on-primary truncate">
                @{telegram.username || telegram.id}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Non-authenticated prompt */}
      {!user && (
        <div className="card-dark p-8 sm:p-12 text-center rounded-2xl border border-hairline-dark mb-10 max-w-xl mx-auto space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-hairline-dark flex items-center justify-center mx-auto text-on-primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="2" x2="6" y2="4" />
              <line x1="10" y1="2" x2="10" y2="4" />
              <line x1="14" y1="2" x2="14" y2="4" />
            </svg>
          </div>
          <div>
            <h2 className="heading-section text-on-primary mb-2">Увійди в KodloHUB</h2>
            <p className="text-sm text-ink-mute">
              Щоб прив&apos;язати свій Telegram, переглядати баланс кави та клеймити нагороди на сайті, спочатку авторизуйся.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <Link href="/login" className="btn-ghost text-on-primary inline-flex justify-center w-full sm:w-auto px-8 py-3">
              УВІЙТИ В АКАУНТ →
            </Link>
          </div>
        </div>
      )}

      {/* Main Tab: HUB & CLAIM */}
      {user && tab === "hub" && (
        <div className="space-y-8">
          {/* If NOT LINKED -> Prominent Linking Banner */}
          {!isLinked && (
            <div className="card-dark p-6 sm:p-10 rounded-2xl border border-hairline-dark bg-gradient-to-b from-white/[0.03] to-transparent">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center md:text-left">
                  <span className="micro-cap text-zinc-400 font-mono">ПІДКЛЮЧЕННЯ ОБЛІКОВОГО ЗАПИСУ</span>
                  <h3 className="heading-section text-on-primary">Підключи свій Telegram від @podroid_bot</h3>
                  <p className="text-sm text-ink-mute max-w-xl">
                    Зв&apos;яжи свій Telegram з KodloHUB в один клік через Telegram бота. Баланс кави, статистика та клейми синхронізуються миттєво.
                  </p>
                </div>
                <button
                  onClick={handleStartLink}
                  className="btn-ghost text-on-primary px-8 py-4 shrink-0 font-bold tracking-wider uppercase text-xs w-full md:w-auto"
                >
                  ПІДКЛЮЧИТИ TELEGRAM
                </button>
              </div>
            </div>
          )}

          {/* Top Row: Balance Card + Daily Claim Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Balance Card */}
            <div className="card-dark p-6 sm:p-8 rounded-2xl border border-hairline-dark flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="micro-cap text-ink-mute">ПОТОЧНИЙ БАЛАНС</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-hairline-dark flex items-center justify-center text-on-primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                    <line x1="6" y1="2" x2="6" y2="4" />
                    <line x1="10" y1="2" x2="10" y2="4" />
                    <line x1="14" y1="2" x2="14" y2="4" />
                  </svg>
                </div>
              </div>

              <div className="my-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl sm:text-6xl font-extrabold text-on-primary font-mono tracking-tight">
                    {formatKavaAmount(balance)}
                  </span>
                  <span className="text-xl font-bold text-ink-mute font-mono">
                    KAVA
                  </span>
                </div>
                <p className="text-xs text-ink-mute mt-2 font-mono">
                  {isLinked ? `Синхронізовано з Telegram @${telegram?.username || telegram?.id}` : "Не прив'язано до Telegram"}
                </p>
              </div>

              <div className="pt-6 border-t border-hairline-dark/60 flex items-center gap-3">
                <button
                  disabled={!isLinked || balance <= 0}
                  onClick={() => setTransferOpen(true)}
                  className="btn-ghost text-on-primary flex-1 py-3 text-center text-xs font-bold disabled:opacity-30 cursor-pointer"
                >
                  ПЕРЕДАТИ КАВУ →
                </button>
                <button
                  onClick={fetchKavaState}
                  title="Оновити баланс"
                  className="p-3 rounded-lg border border-hairline-dark text-ink-mute hover:text-on-primary hover:border-on-primary transition-colors cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Daily Claim Card (Настане 22:00) */}
            <div className="card-dark p-6 sm:p-8 rounded-2xl border border-hairline-dark flex flex-col justify-between relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="micro-cap text-ink-mute">ЩОДЕННО ЙОБНУТИ</span>
                  {isSpecialBonusMinute && (
                    <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded border border-white/30 bg-white/10">
                      22:00 БОНУС (+22)
                    </span>
                  )}
                </div>
                <h3 className="heading-section text-on-primary mb-1">ЙОБНУТИ КАВИ</h3>
                <p className="text-xs text-ink-mute">
                  Скидання циклу щодня о 22:00 за Коростишевом.
                </p>
              </div>

              {/* Status / Countdown */}
              <div className="my-6 p-4 rounded-xl bg-canvas-night-soft border border-hairline-dark text-center">
                {canClaim ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-on-primary tracking-wider uppercase">
                      ГОТОВО ДО ЙОБАННЯ!
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Тисни кнопку нижче, щоб йобнути денну порцію
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[11px] text-ink-mute font-mono uppercase">
                      Наступний раз о 22:00 (через):
                    </p>
                    <p className="text-2xl font-mono font-bold text-on-primary tracking-wider">
                      {formatTimeUntilClaim(secondsUntilNextClaim)}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div>
                <button
                  disabled={!isLinked || !canClaim || claimLoading}
                  onClick={handleClaim}
                  className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider text-xs transition-all cursor-pointer ${
                    canClaim && isLinked
                      ? "bg-white text-black hover:bg-zinc-200 shadow-xl hover:scale-[1.01]"
                      : "bg-white/5 border border-hairline-dark text-ink-mute cursor-not-allowed opacity-60"
                  }`}
                >
                  {claimLoading ? "ЙОБАННЯ..." : canClaim ? "ЙОБНУТИ КАВИ" : "ВЖЕ ЙОБНУВ СЬОГОДНІ"}
                </button>

                {claimResult && (
                  <div className="mt-3 text-center text-xs font-mono text-on-primary">
                    Результат: <span className="font-bold">{claimResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Mini Games Hub Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => {
                if (!isLinked) {
                  handleStartLink();
                  toast("Спочатку підключи Telegram акаунт", "info");
                  return;
                }
                setTab("games");
                setGameMode("dice");
              }}
              className="card-dark p-5 rounded-xl border border-hairline-dark hover:border-on-primary transition-colors flex items-center gap-4 group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-on-primary shrink-0 group-hover:bg-white group-hover:text-black transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
                  <circle cx="8" cy="8" r="1.2" fill="currentColor" />
                  <circle cx="16" cy="8" r="1.2" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.2" fill="currentColor" />
                  <circle cx="8" cy="16" r="1.2" fill="currentColor" />
                  <circle cx="16" cy="16" r="1.2" fill="currentColor" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-on-primary uppercase tracking-wider truncate">БИТВА КУБІВ</p>
                <p className="text-[11px] text-ink-mute truncate">Кидай d6 поки не набереш 22</p>
              </div>
            </button>

            <button
              onClick={() => {
                if (!isLinked) {
                  handleStartLink();
                  toast("Спочатку підключи Telegram акаунт", "info");
                  return;
                }
                setTab("games");
                setGameMode("hammer");
              }}
              className="card-dark p-5 rounded-xl border border-hairline-dark hover:border-on-primary transition-colors flex items-center gap-4 group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-on-primary shrink-0 group-hover:bg-white group-hover:text-black transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" />
                  <path d="m18 15 4-4" />
                  <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-on-primary uppercase tracking-wider truncate">БИТВА НА МОЛОТКАХ</p>
                <p className="text-[11px] text-ink-mute truncate">Дуелі на 100 HP та замахи</p>
              </div>
            </button>

            <button
              onClick={() => setTab("shop")}
              className="card-dark p-5 rounded-xl border border-hairline-dark hover:border-on-primary transition-colors flex items-center gap-4 group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-on-primary shrink-0 group-hover:bg-white group-hover:text-black transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-on-primary uppercase tracking-wider truncate">МАГАЗИН</p>
                <p className="text-[11px] text-ink-mute truncate">Нескафе голд та лут за KAVA</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Tab: GAMES */}
      {tab === "games" && (
        <div className="space-y-6">
          {/* Games Mode Header */}
          <div className="flex items-center justify-between border-b border-hairline-dark pb-4">
            <div>
              <h2 className="heading-section text-on-primary">ігри блять</h2>
              <p className="text-xs text-ink-mute">постав каву на кін чи що</p>
            </div>
            {gameMode !== "list" && (
              <button
                onClick={() => {
                  setGameMode("list");
                  setActiveDiceRoom(null);
                  setActiveHammerRoom(null);
                }}
                className="button-cap px-4 py-2 rounded-lg border border-hairline-dark hover:border-on-primary text-xs text-on-primary cursor-pointer"
              >
                ← ВСІ ІГРИ
              </button>
            )}
          </div>

          {/* 1. Games List */}
          {gameMode === "list" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card: Битва кубів */}
              <div className="card-dark p-6 rounded-2xl border border-hairline-dark flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-hairline-dark flex items-center justify-center text-on-primary mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
                      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
                      <circle cx="16" cy="8" r="1.2" fill="currentColor" />
                      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
                      <circle cx="8" cy="16" r="1.2" fill="currentColor" />
                      <circle cx="16" cy="16" r="1.2" fill="currentColor" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-on-primary mb-1">битва кубів</h3>
                  <p className="text-xs text-ink-mute leading-relaxed">
                    кидай d6 поки не набереш 22. хто перший забирає все каву.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (!isLinked) {
                      handleStartLink();
                      toast("Спочатку підключи Telegram акаунт", "info");
                      return;
                    }
                    setGameMode("dice");
                  }}
                  className="btn-ghost text-on-primary py-3 text-xs font-bold text-center uppercase tracking-wider cursor-pointer"
                >
                  {isLinked ? "ГРАТИ →" : "ПІДКЛЮЧИ TELEGRAM →"}
                </button>
              </div>

              {/* Card: Битва на молотках */}
              <div className="card-dark p-6 rounded-2xl border border-hairline-dark flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-hairline-dark flex items-center justify-center text-on-primary mb-4">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" />
                      <path d="m18 15 4-4" />
                      <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-on-primary mb-1">битва на молотках</h3>
                  <p className="text-xs text-ink-mute leading-relaxed">
                    шоб перемогти треба згадат брат. нажал.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (!isLinked) {
                      handleStartLink();
                      toast("Спочатку підключи Telegram акаунт", "info");
                      return;
                    }
                    setGameMode("hammer");
                  }}
                  className="btn-ghost text-on-primary py-3 text-xs font-bold text-center uppercase tracking-wider cursor-pointer"
                >
                  {isLinked ? "ГРАТИ →" : "ПІДКЛЮЧИ TELEGRAM →"}
                </button>
              </div>

              {/* Card: Кавові слоти */}
              <div className="card-dark p-6 rounded-2xl border border-hairline-dark flex flex-col justify-between space-y-4 opacity-50">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-hairline-dark flex items-center justify-center font-mono font-bold text-xs text-ink-mute mb-4">
                    777
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-on-primary">кавові слоти</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-hairline-dark text-ink-mute">
                      не зараз
                    </span>
                  </div>
                  <p className="text-xs text-ink-mute leading-relaxed">
                    навіть не починали
                  </p>
                </div>
                <button
                  disabled
                  className="py-3 text-xs font-mono text-ink-mute border border-hairline-dark rounded-lg cursor-not-allowed text-center uppercase"
                >
                  ВИМКНЕНО
                </button>
              </div>
            </div>
          )}

          {/* 2. DICE GAME VIEW */}
          {gameMode === "dice" && (
            <div className="space-y-6">
              {/* Active Room View */}
              {activeDiceRoom ? (
                <div className="card-dark p-6 sm:p-8 rounded-2xl border border-hairline-dark space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline-dark pb-4">
                    <div>
                      <span className="micro-cap text-ink-mute">БИТВА КУБІВ • СТАВКА {activeDiceRoom.stake} KAVA</span>
                      <h3 className="text-lg font-bold text-on-primary">
                        {activeDiceRoom.status === "waiting"
                          ? "Очікування суперника..."
                          : activeDiceRoom.status === "playing"
                          ? "Битва триває (до 22 очок)!"
                          : "Гру завершено!"}
                      </h3>
                    </div>
                    {activeDiceRoom.status === "waiting" && activeDiceRoom.creator_id === myPlayerId && (
                      <button
                        onClick={async () => {
                          await fetch(`/api/v1/kava/games/dice/rooms/${activeDiceRoom.id}`, { method: "DELETE" });
                          setActiveDiceRoom(null);
                          fetchDiceRooms();
                        }}
                        className="text-xs text-ink-mute hover:text-red-400 font-mono"
                      >
                        СКАСУВАТИ КІМНАТУ
                      </button>
                    )}
                  </div>

                  {/* Scoreboard */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className={`p-4 rounded-xl border ${
                      activeDiceRoom.current_turn === activeDiceRoom.creator_id
                        ? "border-white bg-white/5"
                        : "border-hairline-dark bg-canvas-night-soft"
                    }`}>
                      <p className="text-xs text-ink-mute truncate">{activeDiceRoom.creator_name}</p>
                      <p className="text-4xl font-extrabold font-mono text-on-primary my-2">{creatorDiceScore}</p>
                      <p className="text-[10px] font-mono text-ink-mute">Ціль: 22</p>
                    </div>

                    <div className={`p-4 rounded-xl border ${
                      activeDiceRoom.current_turn === activeDiceRoom.joiner_id
                        ? "border-white bg-white/5"
                        : "border-hairline-dark bg-canvas-night-soft"
                    }`}>
                      <p className="text-xs text-ink-mute truncate">{activeDiceRoom.joiner_name || "Очікування..."}</p>
                      <p className="text-4xl font-extrabold font-mono text-on-primary my-2">{joinerDiceScore}</p>
                      <p className="text-[10px] font-mono text-ink-mute">Ціль: 22</p>
                    </div>
                  </div>

                  {/* Controls / Rolls */}
                  {activeDiceRoom.status === "playing" && (
                    <div className="text-center pt-2 space-y-4">
                      {activeDiceRoom.current_turn === myPlayerId ? (
                        <button
                          disabled={diceRolling}
                          onClick={handleRollDice}
                          className="w-full py-4 rounded-xl bg-white text-black font-bold uppercase tracking-wider text-xs hover:bg-zinc-200 cursor-pointer shadow-xl transition-all"
                        >
                          {diceRolling ? "КИДОК..." : "КИНОТИ КУБИК (d6)"}
                        </button>
                      ) : (
                        <div className="p-3 rounded-lg border border-hairline-dark bg-canvas-night-soft text-xs font-mono text-ink-mute">
                          Очікуємо кидок суперника...
                        </div>
                      )}
                    </div>
                  )}

                  {activeDiceRoom.status === "finished" && (
                    <div className="p-4 rounded-xl border border-hairline-dark bg-white/5 text-center space-y-2">
                      <p className="text-sm font-bold text-on-primary">
                        {activeDiceRoom.winner_id === myPlayerId ? "ТИ ПЕРЕМІГ І ЗАБРАВ ВСЮ КАВУ!" : "ПЕРЕМІГ СУПЕРНИК!"}
                      </p>
                      <button
                        onClick={() => {
                          setActiveDiceRoom(null);
                          fetchDiceRooms();
                        }}
                        className="btn-ghost text-on-primary px-6 py-2 text-xs font-bold"
                      >
                        НАЗАД ДО КІМНАТ
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Rooms & Create */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Create Room Form */}
                  <div className="card-dark p-6 rounded-2xl border border-hairline-dark space-y-4">
                    <h3 className="text-sm font-bold text-on-primary uppercase">Створити кімнату</h3>
                    <div>
                      <label className="block text-xs font-mono text-ink-mute mb-1.5">Ставка (KAVA):</label>
                      <input
                        type="number"
                        min="1"
                        value={diceStakeInput}
                        onChange={(e) => setDiceStakeInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-canvas-night-soft border border-hairline-dark text-on-primary text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:border-on-primary focus:outline-none transition-colors"
                      />
                    </div>
                    <button
                      onClick={handleCreateDiceRoom}
                      className="w-full btn-ghost text-on-primary py-3 text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      СТВОРИТИ КІМНАТУ
                    </button>
                  </div>

                  {/* Open Rooms List */}
                  <div className="md:col-span-2 card-dark p-6 rounded-2xl border border-hairline-dark space-y-4">
                    <h3 className="text-sm font-bold text-on-primary uppercase">Відкриті кімнати</h3>
                    <div className="divide-y divide-hairline-dark/60 max-h-80 overflow-y-auto">
                      {diceRooms.filter((r) => r.status === "waiting").length === 0 ? (
                        <p className="p-8 text-center text-xs text-ink-mute font-mono">
                          Немає відкритих кімнат. Створи першим!
                        </p>
                      ) : (
                        diceRooms
                          .filter((r) => r.status === "waiting")
                          .map((room) => (
                            <div key={room.id} className="py-3 flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-on-primary">{room.creator_name}</p>
                                <p className="text-[10px] text-ink-mute font-mono">Ставка: {room.stake} KAVA</p>
                              </div>
                              {room.creator_id === myPlayerId ? (
                                <span className="text-[10px] font-mono text-zinc-400">Твоя кімната</span>
                              ) : (
                                <button
                                  onClick={() => handleJoinDiceRoom(room.id)}
                                  className="btn-ghost text-on-primary px-4 py-2 text-xs font-bold cursor-pointer"
                                >
                                  ВВІЙТИ ({room.stake} KAVA)
                                </button>
                              )}
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. HAMMER DUEL VIEW */}
          {gameMode === "hammer" && (
            <div className="space-y-6">
              {activeHammerRoom ? (
                <div className="card-dark p-6 sm:p-8 rounded-2xl border border-hairline-dark space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline-dark pb-4">
                    <div>
                      <span className="micro-cap text-ink-mute">
                        ДУЕЛЬ НА МОЛОТКАХ • РАУНД {activeHammerRoom.round_index}/5 • ДИСТАНЦІЯ: {activeHammerRoom.distance_state === "short" ? "БЛИЖНЯ" : "ДАЛЬНЯ"}
                      </span>
                      <h3 className="text-lg font-bold text-on-primary">
                        {activeHammerRoom.status === "waiting"
                          ? "Очікування суперника..."
                          : activeHammerRoom.status === "playing"
                          ? "Тактична битва триває!"
                          : "Дуель завершено!"}
                      </h3>
                    </div>
                    {activeHammerRoom.status === "waiting" && activeHammerRoom.creator_id === myPlayerId && (
                      <button
                        onClick={async () => {
                          await fetch(`/api/v1/kava/games/hammer/rooms/${activeHammerRoom.id}`, { method: "DELETE" });
                          setActiveHammerRoom(null);
                          fetchHammerRooms();
                        }}
                        className="text-xs text-ink-mute hover:text-red-400 font-mono"
                      >
                        СКАСУВАТИ ДУЕЛЬ
                      </button>
                    )}
                  </div>

                  {/* Healthbars */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 rounded-xl border border-hairline-dark bg-canvas-night-soft">
                      <p className="text-xs text-ink-mute truncate">{activeHammerRoom.creator_name}</p>
                      <p className="text-3xl font-extrabold font-mono text-on-primary my-1">{activeHammerRoom.creator_hp} HP</p>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden my-2">
                        <div className="bg-white h-full transition-all" style={{ width: `${Math.max(0, activeHammerRoom.creator_hp)}%` }} />
                      </div>
                      <p className="text-[10px] font-mono text-ink-mute">Заряди: {activeHammerRoom.creator_charges}/3</p>
                    </div>

                    <div className="p-4 rounded-xl border border-hairline-dark bg-canvas-night-soft">
                      <p className="text-xs text-ink-mute truncate">{activeHammerRoom.joiner_name || "Очікування..."}</p>
                      <p className="text-3xl font-extrabold font-mono text-on-primary my-1">{activeHammerRoom.joiner_hp} HP</p>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden my-2">
                        <div className="bg-white h-full transition-all" style={{ width: `${Math.max(0, activeHammerRoom.joiner_hp)}%` }} />
                      </div>
                      <p className="text-[10px] font-mono text-ink-mute">Заряди: {activeHammerRoom.joiner_charges}/3</p>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  {activeHammerRoom.status === "playing" && (
                    <div className="space-y-4">
                      {hammerMoveSubmitted ? (
                        <div className="p-4 rounded-xl border border-hairline-dark bg-white/5 text-center text-xs font-mono text-ink-mute">
                          Твій хід ({hammerMoveSubmitted.toUpperCase()}) зафіксовано. Очікуємо хід супротивника...
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <button
                            disabled={hammerMoving}
                            onClick={() => handleHammerMove("strike")}
                            className="p-4 rounded-xl border border-hairline-dark hover:border-white bg-canvas-night-soft hover:bg-white hover:text-black transition-all text-center cursor-pointer"
                          >
                            <p className="font-bold text-xs">УДАР</p>
                            <p className="text-[10px] text-ink-mute mt-1">18 шкоди + заряд</p>
                          </button>

                          <button
                            disabled={hammerMoving}
                            onClick={() => handleHammerMove("charge")}
                            className="p-4 rounded-xl border border-hairline-dark hover:border-white bg-canvas-night-soft hover:bg-white hover:text-black transition-all text-center cursor-pointer"
                          >
                            <p className="font-bold text-xs">ЗАМАХ</p>
                            <p className="text-[10px] text-ink-mute mt-1">+1 заряд (+8 dmg)</p>
                          </button>

                          <button
                            disabled={hammerMoving}
                            onClick={() => handleHammerMove("parry")}
                            className="p-4 rounded-xl border border-hairline-dark hover:border-white bg-canvas-night-soft hover:bg-white hover:text-black transition-all text-center cursor-pointer"
                          >
                            <p className="font-bold text-xs">БЛОК</p>
                            <p className="text-[10px] text-ink-mute mt-1">Блок + контратака</p>
                          </button>

                          <button
                            disabled={hammerMoving}
                            onClick={() => handleHammerMove("step")}
                            className="p-4 rounded-xl border border-hairline-dark hover:border-white bg-canvas-night-soft hover:bg-white hover:text-black transition-all text-center cursor-pointer"
                          >
                            <p className="font-bold text-xs">КРОК</p>
                            <p className="text-[10px] text-ink-mute mt-1">Зміна дистанції</p>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {activeHammerRoom.status === "finished" && (
                    <div className="p-4 rounded-xl border border-hairline-dark bg-white/5 text-center space-y-2">
                      <p className="text-sm font-bold text-on-primary">{activeHammerRoom.result_reason || "Дуель завершено"}</p>
                      <button
                        onClick={() => {
                          setActiveHammerRoom(null);
                          fetchHammerRooms();
                        }}
                        className="btn-ghost text-on-primary px-6 py-2 text-xs font-bold"
                      >
                        НАЗАД ДО ДУЕЛЕЙ
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Rooms & Create */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="card-dark p-6 rounded-2xl border border-hairline-dark space-y-4">
                    <h3 className="text-sm font-bold text-on-primary uppercase">Створити дуель</h3>
                    <div>
                      <label className="block text-xs font-mono text-ink-mute mb-1.5">Ставка (KAVA):</label>
                      <input
                        type="number"
                        min="1"
                        value={hammerStakeInput}
                        onChange={(e) => setHammerStakeInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-canvas-night-soft border border-hairline-dark text-on-primary text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:border-on-primary focus:outline-none transition-colors"
                      />
                    </div>
                    <button
                      onClick={handleCreateHammerRoom}
                      className="w-full btn-ghost text-on-primary py-3 text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      ВИКЛИКАТИ НА ДУЕЛЬ
                    </button>
                  </div>

                  <div className="md:col-span-2 card-dark p-6 rounded-2xl border border-hairline-dark space-y-4">
                    <h3 className="text-sm font-bold text-on-primary uppercase">Активні виклики</h3>
                    <div className="divide-y divide-hairline-dark/60 max-h-80 overflow-y-auto">
                      {hammerRooms.filter((r) => r.status === "waiting").length === 0 ? (
                        <p className="p-8 text-center text-xs text-ink-mute font-mono">
                          Немає активних дуелей. Кинь виклик першим!
                        </p>
                      ) : (
                        hammerRooms
                          .filter((r) => r.status === "waiting")
                          .map((room) => (
                            <div key={room.id} className="py-3 flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-on-primary">{room.creator_name}</p>
                                <p className="text-[10px] text-ink-mute font-mono">Ставка: {room.stake} KAVA</p>
                              </div>
                              {room.creator_id === myPlayerId ? (
                                <span className="text-[10px] font-mono text-zinc-400">Твій виклик</span>
                              ) : (
                                <button
                                  onClick={() => handleJoinHammerRoom(room.id)}
                                  className="btn-ghost text-on-primary px-4 py-2 text-xs font-bold cursor-pointer"
                                >
                                  ПРИЙНЯТИ ({room.stake} KAVA)
                                </button>
                              )}
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: SHOP */}
      {tab === "shop" && (
        <div className="space-y-6">
          <div className="border-b border-hairline-dark pb-4">
            <h2 className="heading-section text-on-primary">МАГАЗИН КАВИ</h2>
            <p className="text-xs text-ink-mute">Обмінюй KAVA на артефакти та фізичні речі</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {shopItems.length === 0 ? (
              <div className="col-span-full p-12 text-center text-xs text-ink-mute font-mono">
                {shopLoading ? "Завантаження магазину..." : "Товарів поки немає"}
              </div>
            ) : (
              shopItems.map((item) => (
                <div key={item.id} className="card-dark p-6 rounded-2xl border border-hairline-dark flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-36 object-cover rounded-xl border border-hairline-dark"
                      />
                    ) : (
                      <div className="w-full h-36 rounded-xl bg-white/5 border border-hairline-dark flex items-center justify-center font-mono text-xs text-ink-mute">
                        KODLO ITEM
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-on-primary uppercase">{item.title}</h3>
                      <span className="text-xs font-mono font-bold text-on-primary shrink-0">
                        {item.price} KAVA
                      </span>
                    </div>
                    <p className="text-xs text-ink-mute leading-relaxed">{item.description}</p>
                  </div>

                  <button
                    disabled={buyingId === item.id || balance < item.price}
                    onClick={() => handleBuyShopItem(item)}
                    className="w-full btn-ghost text-on-primary py-3 text-xs font-bold uppercase tracking-wider disabled:opacity-40 cursor-pointer"
                  >
                    {buyingId === item.id ? "КУПІВЛЯ..." : `КУПИТИ (${item.price} KAVA)`}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: LEADERBOARD */}
      {tab === "leaderboard" && (
        <div className="card-dark rounded-2xl border border-hairline-dark overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-hairline-dark flex items-center justify-between">
            <div>
              <h3 className="heading-section text-on-primary mb-1">ТОП БАЛАНСІВ КАВИ</h3>
              <p className="text-xs text-ink-mute">
                Глобальний рейтинг учасників екосистеми Podroid & KodloHUB
              </p>
            </div>
            <button
              onClick={fetchLeaderboard}
              disabled={leaderboardLoading}
              className="p-2.5 rounded-lg border border-hairline-dark text-ink-mute hover:text-on-primary transition-colors cursor-pointer"
              title="Оновити рейтинг"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </div>

          <div className="divide-y divide-hairline-dark/60">
            {leaderboard.length === 0 ? (
              <div className="p-12 text-center text-ink-mute text-xs font-mono">
                {leaderboardLoading ? "Завантаження рейтингу..." : "Рейтинг поки що порожній"}
              </div>
            ) : (
              leaderboard.map((item) => {
                const isMe = telegram && item.telegram_id === telegram.id;
                return (
                  <div
                    key={item.telegram_id}
                    className={`p-4 sm:px-6 flex items-center justify-between transition-colors ${
                      isMe ? "bg-white/[0.06]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Rank */}
                      <span className={`font-mono text-sm font-bold w-6 text-center shrink-0 ${
                        item.rank === 1 ? "text-white" : "text-ink-mute"
                      }`}>
                        #{item.rank}
                      </span>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-canvas-night-soft border border-hairline-dark overflow-hidden shrink-0">
                        {item.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.photo_url}
                            alt={item.username || "User"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-mono text-xs font-bold text-ink-mute">
                            {item.first_name?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-on-primary truncate">
                            {item.first_name || item.kodlohub_user?.full_name || "Користувач"}
                          </p>
                          {item.kodlohub_user && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-white/20 text-zinc-300">
                              KODLOHUB
                            </span>
                          )}
                          {isMe && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-black">
                              ТИ
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-ink-mute font-mono truncate">
                          @{item.username || `id:${item.telegram_id}`}
                        </p>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0 pl-4">
                      <span className="text-base sm:text-lg font-mono font-bold text-on-primary">
                        {formatKavaAmount(item.amount)}
                      </span>
                      <span className="text-xs text-ink-mute font-mono ml-1.5">KAVA</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab: HISTORY */}
      {tab === "history" && isLinked && (
        <div className="card-dark rounded-2xl border border-hairline-dark overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-hairline-dark">
            <h3 className="heading-section text-on-primary mb-1">ІСТОРІЯ ОПЕРАЦІЙ</h3>
            <p className="text-xs text-ink-mute">
              Останні клейми, перекази та зміни балансу
            </p>
          </div>

          <div className="divide-y divide-hairline-dark/60">
            {transactions.length === 0 ? (
              <div className="p-12 text-center text-ink-mute text-xs font-mono">
                Транзакцій ще немає
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="min-w-0 pr-4">
                    <p className="text-xs font-medium text-on-primary truncate">
                      {tx.description || tx.action_type}
                    </p>
                    <p className="text-[10px] text-ink-mute font-mono">
                      {new Date(tx.created_at).toLocaleString("uk-UA")}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`font-mono text-xs sm:text-sm font-bold ${
                      tx.amount_change > 0 ? "text-white" : "text-zinc-400"
                    }`}>
                      {tx.amount_change > 0 ? `+${tx.amount_change}` : tx.amount_change} KAVA
                    </span>
                    <p className="text-[10px] text-ink-mute font-mono">
                      Баланс: {tx.balance_after}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Footer attribution */}
      <div className="pt-8 mt-12 border-t border-hairline-dark text-center">
        <p className="text-[11px] font-mono text-ink-mute">
          оригінальний кава хаб made by <span className="text-zinc-300 font-bold">anus115</span>
        </p>
      </div>

      {/* LINK TELEGRAM MODAL */}
      {linking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="card-dark max-w-md w-full p-6 sm:p-8 rounded-2xl border border-hairline-dark shadow-2xl relative space-y-6">
            <button
              onClick={() => {
                setLinking(false);
                setLinkPolling(false);
              }}
              className="absolute top-5 right-5 text-ink-mute hover:text-on-primary p-2 cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-hairline-dark flex items-center justify-center mx-auto text-on-primary">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-on-primary">
                Підключення Telegram
              </h3>
              <p className="text-xs text-ink-mute">
                Натисни кнопку нижче, щоб відкрити бота <span className="text-zinc-200">@podroid_bot</span> та підтвердити прив&apos;язку:
              </p>
            </div>

            {linkUrl && (
              <div className="space-y-4">
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full btn-ghost text-on-primary py-3.5 block text-center font-bold text-xs uppercase tracking-wider"
                >
                  ВІДКРИТИ @PODROID_BOT →
                </a>

                <div className="p-3 rounded-lg bg-canvas-night-soft border border-hairline-dark text-center">
                  <p className="text-[10px] text-ink-mute font-mono mb-1.5">Або надішли боту команду вручну:</p>
                  <p className="px-2.5 py-1.5 rounded bg-black/50 border border-hairline-dark/60 font-mono text-[11px] font-bold text-on-primary select-all break-all">
                    /start link_{linkToken}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-ink-mute text-xs font-mono pt-2">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>Очікуємо підтвердження з Telegram...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {transferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="card-dark max-w-md w-full p-6 sm:p-8 rounded-2xl border border-hairline-dark shadow-2xl relative space-y-6">
            <button
              onClick={() => setTransferOpen(false)}
              className="absolute top-5 right-5 text-ink-mute hover:text-on-primary p-2 cursor-pointer"
            >
              ✕
            </button>

            <div>
              <span className="micro-cap text-ink-mute">P2P ОПЕРАЦІЯ</span>
              <h3 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-on-primary mb-1">
                ПЕРЕДАТИ КАВУ
              </h3>
              <p className="text-xs text-ink-mute">
                Переказ кави іншому користувачу хабу або учаснику бота.
              </p>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                  Отримувач (@username або Telegram ID):
                </label>
                <input
                  type="text"
                  placeholder="@username або 12345678"
                  value={transferRecipient}
                  onChange={(e) => setTransferRecipient(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-canvas-night-soft border border-hairline-dark text-on-primary placeholder:text-zinc-600 text-xs font-mono focus:border-on-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono text-zinc-300 mb-1.5">
                  <label>Кількість кави:</label>
                  <span className="text-ink-mute">Доступно: {balance} KAVA</span>
                </div>
                <input
                  type="number"
                  placeholder="50"
                  min="1"
                  max={balance}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-canvas-night-soft border border-hairline-dark text-on-primary placeholder:text-zinc-600 text-xs font-mono focus:border-on-primary focus:outline-none transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTransferOpen(false)}
                  className="flex-1 py-3 rounded-lg border border-hairline-dark text-xs text-ink-mute hover:text-on-primary transition-colors cursor-pointer"
                >
                  СКАСУВАТИ
                </button>
                <button
                  type="submit"
                  disabled={transferLoading || !transferAmount || !transferRecipient}
                  className="flex-1 btn-ghost text-on-primary py-3 text-xs font-bold disabled:opacity-30 cursor-pointer"
                >
                  {transferLoading ? "ВІДПРАВКА..." : "ПЕРЕКАЗАТИ →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
