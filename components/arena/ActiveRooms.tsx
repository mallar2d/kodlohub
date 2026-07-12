"use client";

import { useEffect, useState, useCallback } from "react";

interface RoomSummary {
  roomCode: string;
  mode: string;
  mapId: string;
  playerCount: number;
  maxPlayers: number;
  locked: boolean;
}

export function ActiveRooms() {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/arena/rooms");
      const data = await res.json();
      setRooms(data.rooms || []);
      if (data.error) {
        setError(data.error);
      }
    } catch {
      setError("Не вдалося завантажити кімнати");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 15000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Fallback
      prompt("Скопіюйте код кімнати:", code);
    }
  };

  const mapNames: Record<string, string> = {
    blok_2200: "БЛОК 2200",
    best_room: "BEST ROOM",
    contamination: "CONTAMINATION",
    crossfire: "CROSSFIRE",
    frenzy: "FRENZY",
    datacore: "DATACORE",
    disposal: "DISPOSAL",
    doublecross: "DOUBLECROSS",
    gasworks: "GASWORKS",
    lambda_bunker: "LAMBDA BUNKER",
    pool_party: "POOL PARTY",
    rapidcore: "RAPIDCORE",
    rocket_frenzy: "ROCKET FRENZY",
    rustmill: "RUSTMILL",
    snark_pit: "SNARK PIT",
    stalkyard: "STALKYARD",
    subtransit: "SUBTRANSIT",
    undertow: "UNDERTOW",
    xen_dm: "XEN DM",
    zhytomyr_station: "ZHYTOMYR STATION",
    korostyshiv_quarry: "KOROSTYSHIV QUARRY",
  };

  return (
    <section className="card-dark p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="button-cap text-on-primary">АКТИВНІ КІМНАТИ</h2>
        <button
          onClick={fetchRooms}
          disabled={loading}
          className="button-cap px-3 py-1.5 rounded border border-hairline-dark text-on-primary-mute hover:border-on-primary-mute transition-colors disabled:opacity-50"
        >
          {loading ? "…" : "ОНОВИТИ"}
        </button>
      </div>

      {error && (
        <p className="text-yellow-400/80 text-sm mb-4">{error}</p>
      )}

      {rooms.length === 0 && !loading && !error && (
        <p className="text-ink-mute text-sm">
          Активних кімнат немає. Створіть кімнату з гри щоб інші могли приєднатися.
        </p>
      )}

      {rooms.length > 0 && (
        <div className="space-y-3">
          {rooms.map((room) => (
            <div
              key={room.roomCode}
              className="flex items-center justify-between gap-4 p-3 rounded-lg bg-white/[0.03] border border-hairline-dark/40 hover:border-hairline-dark/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-on-primary font-medium tracking-wider">
                    {room.roomCode}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-on-primary-mute">
                    {room.mode.toUpperCase()}
                  </span>
                  {room.locked && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                      ЗАБЛОКОВАНО
                    </span>
                  )}
                </div>
                <div className="text-sm text-on-primary-mute">
                  {mapNames[room.mapId] || room.mapId} · {room.playerCount}/{room.maxPlayers} гравців
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyCode(room.roomCode)}
                  className="button-cap px-3 py-1.5 rounded border border-hairline-dark text-on-primary-mute hover:border-on-primary-mute transition-colors text-sm"
                >
                  {copiedCode === room.roomCode ? "КОПІЙОВАНО!" : "КОПІЮВАТИ КОД"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-ink-mute text-xs mt-4">
        Щоб приєднатися: скопіюйте код кімнати та вставте його в грі (MULTIPLAYER → ВХІД)
      </p>
    </section>
  );
}
