import { createAdminClient } from "@/lib/supabase/admin";
import { getApiKeyManager } from "@/lib/api/key-access";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiKeyManager();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const admin = createAdminClient();

  let query = admin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null);

  if (!auth.ctx.isOwner) {
    query = query.eq("created_by", auth.ctx.userId);
  }

  const { data, error } = await query
    .select("id, name, key_prefix, revoked_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Key not found or already revoked" }, { status: 404 });
  }

  return NextResponse.json({ success: true, key: data });
}
