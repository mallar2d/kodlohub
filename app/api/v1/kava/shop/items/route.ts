import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: items, error } = await admin
      .from("kava_shop_items")
      .select("*")
      .eq("active", true)
      .order("price", { ascending: true });

    if (error) {
      console.error("Error fetching shop items:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, items: items || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
