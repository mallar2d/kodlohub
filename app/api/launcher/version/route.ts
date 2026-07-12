import { NextResponse } from "next/server";
import { getLauncherVersionInfo } from "@/lib/launcher/version";

export const revalidate = 0;

/** GET /api/launcher/version — public Hammer Launcher self-update manifest. */
export async function GET() {
  return NextResponse.json(getLauncherVersionInfo(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
