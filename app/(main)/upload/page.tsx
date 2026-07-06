import { redirect } from "next/navigation";
import UploadClient from "./UploadClient";
import { createClient } from "@/lib/supabase/server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Завантажити",
  description: "Додай фото, відео або артефакт у KodloHUB.",
  path: "/upload",
});

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
