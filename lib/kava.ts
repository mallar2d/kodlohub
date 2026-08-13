/**
 * Kava 22:00 cycle & formatting utilities
 */

export interface KavaUserProfile {
  telegram_id: string | null;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_photo_url: string | null;
  telegram_linked_at: string | null;
  kava_balance_cache: number;
  kava_last_claim_at: string | null;
  kava_total_claims: number;
}

export function getKyivNow(): {
  date: Date;
  hour: number;
  minute: number;
  second: number;
  dayString: string;
} {
  const date = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const second = Number(parts.find((p) => p.type === "second")?.value ?? "0");
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "00";
  const day = parts.find((p) => p.type === "day")?.value ?? "00";

  return {
    date,
    hour,
    minute,
    second,
    dayString: `${year}-${month}-${day}`,
  };
}

export function getShiftedDay(date: Date): string {
  // Shift by -22 hours to align 22:00-21:59 into a single day key
  const shifted = new Date(date.getTime() - 22 * 3600 * 1000);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(shifted);

  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "00";
  const day = parts.find((p) => p.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

export function canClaimToday(lastUsed: Date | string | null): boolean {
  if (!lastUsed) return true;
  const lastDate = new Date(lastUsed);
  if (isNaN(lastDate.getTime())) return true;
  return getShiftedDay(lastDate) !== getShiftedDay(new Date());
}

export function getTimeUntilNextClaim(lastUsed: Date | string | null): number | null {
  if (!lastUsed) return null;
  const lastDate = new Date(lastUsed);
  if (isNaN(lastDate.getTime())) return null;

  if (getShiftedDay(lastDate) !== getShiftedDay(new Date())) {
    return null; // Can claim right now!
  }

  const kyiv = getKyivNow();
  const currentSeconds = kyiv.hour * 3600 + kyiv.minute * 60 + kyiv.second;
  const boundarySeconds = 22 * 3600;

  const secondsUntilNext =
    currentSeconds < boundarySeconds
      ? boundarySeconds - currentSeconds
      : 24 * 3600 - currentSeconds + boundarySeconds;

  return secondsUntilNext <= 0 ? null : secondsUntilNext;
}

export function formatTimeUntilClaim(totalSeconds: number | null): string {
  if (!totalSeconds || totalSeconds <= 0) return "Зараз!";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatKavaAmount(amount: number): string {
  return new Intl.NumberFormat("uk-UA").format(amount);
}
