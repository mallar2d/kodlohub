import { NextResponse } from "next/server";
import { getBratTdVersionInfo } from "@/lib/brat-td/version";

export const revalidate = 0;

/** GET /api/brat-td/version — public Brat TD update manifest for Hammer Launcher. */
export async function GET() {
  return NextResponse.json(getBratTdVersionInfo(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
