"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function OwnerProjectLink({ projectId }: { projectId: string }) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      setIsOwner(profile?.role === "owner");
    });
  }, []);

  if (!isOwner) return null;

  return (
    <Link href={`/admin/projects/${projectId}/edit`} className="btn-ghost text-on-primary">
      Owner edit
    </Link>
  );
}
