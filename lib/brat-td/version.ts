export type BratTdDownloads = {
  linux: string;
  windows: string;
  web: string;
};

export type BratTdVersionInfo = {
  client_version: string;
  min_client_version: string;
  protocol_version: number;
  download_page: string;
  downloads: BratTdDownloads;
  notes: string;
  package_kind: "installer" | "zip" | "auto";
};

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://kodlohub.vercel.app").replace(/\/$/, "");
}

/** Public version + download manifest for Brat TD (Hammer Launcher). */
export function getBratTdVersionInfo(): BratTdVersionInfo {
  const latest = (process.env.BRAT_TD_CLIENT_VERSION || "1.0.0").trim() || "1.0.0";
  const min = (process.env.BRAT_TD_MIN_CLIENT_VERSION || latest).trim() || latest;
  const protocol = Number(process.env.BRAT_TD_PROTOCOL_VERSION || "1");
  const packageKindRaw = (process.env.BRAT_TD_PACKAGE_KIND || "auto").trim();
  const package_kind =
    packageKindRaw === "zip" || packageKindRaw === "auto" || packageKindRaw === "installer"
      ? packageKindRaw
      : "installer";

  return {
    client_version: latest,
    min_client_version: min,
    protocol_version: Number.isFinite(protocol) ? protocol : 1,
    download_page:
      (process.env.BRAT_TD_DOWNLOAD_PAGE || "").trim() || `${siteBase()}/tools/brat-td`,
    downloads: {
      linux:
        (process.env.BRAT_TD_DOWNLOAD_LINUX || "").trim() ||
        `${siteBase()}/Brat_TD_1.0.0_linux_x86_64.zip`,
      windows:
        (process.env.BRAT_TD_DOWNLOAD_WINDOWS || "").trim() ||
        // 1.0 Windows NSIS still needs a Windows/CI build; keep 0.8 until then.
        `${siteBase()}/Brat%20TD_0.8.0_x64-setup.exe`,
      web: (process.env.BRAT_TD_DOWNLOAD_WEB || "").trim() || `${siteBase()}/brat-td/`,
    },
    notes:
      (process.env.BRAT_TD_RELEASE_NOTES || "").trim() ||
      "Brat TD 1.0 — hub login + cloud progress + Hammer Launcher",
    package_kind,
  };
}
