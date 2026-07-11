import { NextResponse } from "next/server";
import { getArenaVersionInfo } from "@/lib/arena/version";

export const revalidate = 0;

/** GET /api/arena/version — public client update / online gate manifest. */
export async function GET() {
  return NextResponse.json(getArenaVersionInfo(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
