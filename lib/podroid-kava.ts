export interface PodroidKavaState {
  success: true;
  telegramId: string;
  balance: number;
  canClaim: boolean;
  totalClaims: number;
  lastClaimAt: string | null;
  timeUntilNextClaim: number | null;
}

export interface PodroidKavaClaimResult {
  success: boolean;
  message: string;
  newBalance?: number;
  bonus?: boolean;
  amount?: number;
  bonusAmount?: number;
  lastClaimAt?: string | null;
  totalClaims?: number;
  canClaim?: boolean;
  timeUntilNextClaim?: number | null;
}

export interface PodroidKavaTransferResult {
  success: boolean;
  message: string;
  newBalance?: number;
  recipientName?: string;
  recipientTelegramId?: string;
  recipientNewBalance?: number;
}

export interface PodroidKavaAdjustmentResult {
  success: boolean;
  message: string;
  replayed?: boolean;
  balances?: Array<{
    telegramId: string;
    previousBalance: number;
    newBalance: number;
    delta: number;
  }>;
}

export class PodroidKavaIntegrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PodroidKavaIntegrationError";
  }
}

function getIntegrationConfig(): { apiUrl: string; token: string } {
  const apiUrl = process.env.PODROID_KAVA_API_URL?.trim().replace(/\/+$/, "");
  const token = process.env.KODLOHUB_API_TOKEN?.trim();

  if (!apiUrl || !token) {
    throw new PodroidKavaIntegrationError(
      "Синхронізацію з Telegram-ботом не налаштовано"
    );
  }

  return { apiUrl, token };
}

async function postToPodroid<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const { apiUrl, token } = getIntegrationConfig();

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "network error";
    throw new PodroidKavaIntegrationError(
      `Telegram-бот недоступний: ${detail}`
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | (T & { message?: string; error?: string })
    | null;

  if (!response.ok || !payload) {
    throw new PodroidKavaIntegrationError(
      payload?.message || payload?.error || `Telegram-бот відповів ${response.status}`
    );
  }

  return payload;
}

export function getPodroidKavaState(
  telegramId: string
): Promise<PodroidKavaState> {
  return postToPodroid("/clicker/api/external-state", {
    telegram_id: telegramId,
  });
}

export function claimPodroidKava(
  telegramId: string
): Promise<PodroidKavaClaimResult> {
  return postToPodroid("/clicker/api/external-claim-sync", {
    telegram_id: telegramId,
  });
}

export function transferPodroidKava(input: {
  senderTelegramId: string;
  recipient: string;
  amount: number;
}): Promise<PodroidKavaTransferResult> {
  return postToPodroid("/clicker/api/external-transfer-sync", {
    sender_telegram_id: input.senderTelegramId,
    recipient: input.recipient,
    amount: input.amount,
  });
}

export function adjustPodroidKava(input: {
  operationId: string;
  adjustments: Array<{
    telegramId: string;
    delta: number;
    description?: string;
  }>;
}): Promise<PodroidKavaAdjustmentResult> {
  return postToPodroid("/clicker/api/external-adjustments", {
    operation_id: input.operationId,
    adjustments: input.adjustments.map((item) => ({
      telegram_id: item.telegramId,
      delta: item.delta,
      description: item.description,
    })),
  });
}
