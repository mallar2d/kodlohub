import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";
import { getArenaVersionInfo } from "@/lib/arena/version";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActiveRooms } from "@/components/arena/ActiveRooms";

export const metadata = buildPageMetadata({
  title: "Kodlo Arena / HALF BRAT",
  description: "Deathmatch Half-Life vibes. Логін через KodloHUB, статистика й лідерборд.",
  path: "/tools/kodlo-arena",
});

export const revalidate = 30;

export default async function KodloArenaToolPage() {
  const version = getArenaVersionInfo();
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("kodlo_arena_stats")
    .select("user_id, frags, deaths, matches, wins")
    .order("frags", { ascending: false })
    .limit(10);

  const ids = (rows ?? []).map((r) => r.user_id);
  const profiles = new Map<string, { username: string | null; display_name: string | null; game_nick: string | null }>();
  if (ids.length > 0) {
    const { data } = await admin
      .from("profiles")
      .select("id, username, display_name, game_nick")
      .in("id", ids);
    for (const p of data ?? []) profiles.set(p.id, p);
  }

  const downloadEntries: { label: string; href: string }[] = [
    { label: "Linux", href: version.downloads.linux },
    { label: "Windows", href: version.downloads.windows },
    { label: "Web", href: version.downloads.web },
  ].filter((d) => d.href.length > 0);

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[900px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">KODLOHUB × GAME</p>
        <h1 className="heading-section mb-4">HALF BRAT</h1>
        <p className="text-on-primary-mute mb-8 max-w-2xl">
          Deathmatch з лору KodloHUB: Quake air, HL vibes, мемна зброя. Увійди з гри через
          pairing-код — статистика та ігровий нік зберігаються тут.
        </p>

        <div className="flex flex-wrap gap-3 mb-10">
          <Link
            href="/arena/link"
            className="button-cap px-5 py-3 rounded-full border border-on-primary text-on-primary hover:bg-on-primary/10 transition-colors"
          >
            ПІДКЛЮЧИТИ ГРУ
          </Link>
          <Link
            href="/docs"
            className="button-cap px-5 py-3 rounded-full border border-hairline-dark text-on-primary-mute hover:border-on-primary-mute transition-colors"
          >
            API DOCS
          </Link>
        </div>

        <ActiveRooms />

        <section className="card-dark p-6 mb-8">
          <h2 className="button-cap text-on-primary mb-2">ЗАВАНТАЖИТИ</h2>
          <p className="text-on-primary-mute text-sm mb-4 font-mono">
            v{version.client_version}
            {version.min_client_version !== version.client_version
              ? ` · онлайн від v${version.min_client_version}`
              : ""}
            {" · "}protocol {version.protocol_version}
          </p>
          {version.notes ? (
            <p className="text-on-primary-mute text-sm mb-4">{version.notes}</p>
          ) : null}
          {downloadEntries.length === 0 ? (
            <p className="text-ink-mute text-sm">
              Білди ще не викладені. Коли зʼявляться — лінки зʼявляться тут автоматично.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {downloadEntries.map((d) => (
                <a
                  key={d.label}
                  href={d.href}
                  className="button-cap px-5 py-3 rounded-full border border-on-primary text-on-primary hover:bg-on-primary/10 transition-colors"
                >
                  {d.label}
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="card-dark p-6">
          <h2 className="button-cap text-on-primary mb-4">ЛІДЕРБОРД (FRAGS)</h2>
          {(rows ?? []).length === 0 ? (
            <p className="text-ink-mute text-sm">Поки порожньо — зіграй матч і сабмітни результат з клієнта.</p>
          ) : (
            <ol className="space-y-2">
              {(rows ?? []).map((row, i) => {
                const p = profiles.get(row.user_id);
                const nick = p?.game_nick || p?.display_name || p?.username || "Гравець";
                return (
                  <li
                    key={row.user_id}
                    className="flex items-center justify-between gap-4 border-b border-hairline-dark/60 py-2 text-sm"
                  >
                    <span className="text-on-primary">
                      <span className="text-ink-mute mr-3">{i + 1}.</span>
                      {nick}
                    </span>
                    <span className="text-on-primary-mute font-mono">
                      {row.frags}F / {row.deaths}D · {row.wins}W · {row.matches}M
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
