import { redirect } from "next/navigation";
import UploadClient from "./UploadClient";
import { createClient } from "@/lib/supabase/server";

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return <UploadClient initialUser={user} initialUserRole={profile?.role || "shemetovany"} />;
}
