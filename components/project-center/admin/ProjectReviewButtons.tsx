"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProjectReviewButtons({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function review(action: "approve" | "reject") {
    setLoading(action);
    try {
      await fetch(`/api/admin/projects/${projectId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          review("approve");
        }}
        disabled={loading !== null}
        className="button-cap rounded-full border border-green-500/50 px-3 py-1 text-[10px] text-green-300 disabled:opacity-50"
      >
        {loading === "approve" ? "..." : "Approve"}
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          review("reject");
        }}
        disabled={loading !== null}
        className="button-cap rounded-full border border-red-500/50 px-3 py-1 text-[10px] text-red-300 disabled:opacity-50"
      >
        {loading === "reject" ? "..." : "Reject"}
      </button>
    </div>
  );
}
