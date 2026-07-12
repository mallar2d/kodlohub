export type LauncherPackage = {
  url: string;
  sha256: string;
  format: "zip";
};

export type LauncherVersionInfo = {
  /** Latest Hammer Launcher version published for desktop clients. */
  version: string;
  notes: string;
  downloads: {
    windows: LauncherPackage;
    linux: LauncherPackage;
  };
};

function packageFromEnvironment(platform: "WINDOWS" | "LINUX"): LauncherPackage {
  return {
    url: (process.env[`HAMMER_LAUNCHER_DOWNLOAD_${platform}`] || "").trim(),
    sha256: (process.env[`HAMMER_LAUNCHER_SHA256_${platform}`] || "")
      .trim()
      .toLowerCase(),
    format: "zip",
  };
}

/** Public self-update manifest consumed by Hammer Launcher. */
export function getLauncherVersionInfo(): LauncherVersionInfo {
  return {
    // Keep this equal to the previously shipped launcher until release URLs and
    // checksums are configured. That prevents offering a non-existent update.
    version: (process.env.HAMMER_LAUNCHER_VERSION || "0.3.0").trim() || "0.3.0",
    notes: (process.env.HAMMER_LAUNCHER_RELEASE_NOTES || "").trim(),
    downloads: {
      windows: packageFromEnvironment("WINDOWS"),
      linux: packageFromEnvironment("LINUX"),
    },
  };
}
