import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import UsersClient from "./UsersClient";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

const getProfiles = unstable_cache(
  async (): Promise<Profile[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });
    return (data || []) as Profile[];
  },
  ["all-profiles"],
  { revalidate: 60 }
);

export default async function UsersPage() {
  const profiles = await getProfiles();
  return <UsersClient initialProfiles={profiles} />;
}
