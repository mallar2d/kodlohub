import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const revalidate = 0;

const LEADERBOARD_LIMIT = 50;

type LeaderboardRow = {
  user_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  time_taken_seconds: number;
  completed_at: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();

    // Fetch top leaderboard rows
    const { data: topRows, error: topError } = await admin
      .from("podro_nmt_results")
      .select("user_id, score, correct_answers, total_questions, time_taken_seconds, completed_at")
      .order("score", { ascending: false })
      .order("time_taken_seconds", { ascending: true })
      .order("completed_at", { ascending: true })
      .limit(LEADERBOARD_LIMIT);

    if (topError) throw topError;

    const topIds = (topRows ?? []).map((r) => r.user_id);

    const profilesById = new Map<
      string,
      { username: string; display_name: string | null; avatar_url: string | null }
    >();

    if (topIds.length > 0) {
      const { data: profiles, error: profileError } = await admin
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", topIds);

      if (profileError) throw profileError;

      for (const p of profiles ?? []) {
        profilesById.set(p.id, p);
      }
    }

    const leaderboard: LeaderboardRow[] = (topRows ?? []).map((row) => {
      const p = profilesById.get(row.user_id);
      return {
        user_id: row.user_id,
        score: row.score,
        correct_answers: row.correct_answers,
        total_questions: row.total_questions,
        time_taken_seconds: row.time_taken_seconds,
        completed_at: row.completed_at,
        username: p?.username ?? null,
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      };
    });

    let me = null;

    if (user) {
      const [{ data: myResult }, { data: rankVal }] = await Promise.all([
        admin
          .from("podro_nmt_results")
          .select("score, correct_answers, total_questions, time_taken_seconds, completed_at")
          .eq("user_id", user.id)
          .maybeSingle(),

        admin.rpc("podro_nmt_user_rank", { p_user_id: user.id }),
      ]);

      if (myResult) {
        me = {
          score: myResult.score,
          correctAnswers: myResult.correct_answers,
          totalQuestions: myResult.total_questions,
          timeTakenSeconds: myResult.time_taken_seconds,
          completedAt: myResult.completed_at,
          rank: rankVal ?? null,
        };
      }
    }

    return NextResponse.json({
      leaderboard,
      me,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Потрібно увійти, щоб зберегти оцінку в лідерборді" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { score, correctAnswers, totalQuestions, timeTakenSeconds } = body;

    if (
      typeof score !== "number" ||
      typeof correctAnswers !== "number" ||
      typeof totalQuestions !== "number" ||
      typeof timeTakenSeconds !== "number"
    ) {
      return NextResponse.json(
        { error: "Некоректні параметри запиту" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Insert results. The UNIQUE constraint on user_id prevents multiple submissions.
    const { data, error } = await admin
      .from("podro_nmt_results")
      .insert({
        user_id: user.id,
        score,
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
        time_taken_seconds: timeTakenSeconds,
      })
      .select()
      .maybeSingle();

    if (error) {
      // Postgres unique violation code is 23505
      if (error.code === "23505" || error.message?.includes("unique")) {
        return NextResponse.json(
          { error: "Ви вже пройшли цей тест на оцінку. Ваша оцінка зафіксована." },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
