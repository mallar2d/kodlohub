export type ArenaDownloads = {
  linux: string;
  windows: string;
  web: string;
};

export type ArenaVersionInfo = {
  /** Latest published client build. */
  client_version: string;
  /** Clients below this cannot join online matchmaking. */
  min_client_version: string;
  /** Must match game SignalingClient.PROTOCOL_VERSION. */
  protocol_version: number;
  download_page: string;
  downloads: ArenaDownloads;
  notes: string;
};

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://kodlohub.vercel.app").replace(/\/$/, "");
}

/** Public version + download manifest for HALF BRAT / Kodlo Arena. */
export function getArenaVersionInfo(): ArenaVersionInfo {
  const latest = (process.env.ARENA_CLIENT_VERSION || "0.1.0").trim() || "0.1.0";
  const min =
    (process.env.ARENA_MIN_CLIENT_VERSION || latest).trim() || latest;
  const protocol = Number(process.env.ARENA_PROTOCOL_VERSION || "1");
  return {
    client_version: latest,
    min_client_version: min,
    protocol_version: Number.isFinite(protocol) ? protocol : 1,
    download_page:
      (process.env.ARENA_DOWNLOAD_PAGE || "").trim() ||
      `${siteBase()}/tools/kodlo-arena`,
    downloads: {
      linux: (process.env.ARENA_DOWNLOAD_LINUX || "").trim(),
      windows: (process.env.ARENA_DOWNLOAD_WINDOWS || "").trim(),
      web: (process.env.ARENA_DOWNLOAD_WEB || "").trim(),
    },
    notes: (process.env.ARENA_RELEASE_NOTES || "").trim(),
  };
}
