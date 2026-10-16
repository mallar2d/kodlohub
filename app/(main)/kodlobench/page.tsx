import KodloBenchClient from "@/components/kodlobench/KodloBenchClient";
import { buildPageMetadata } from "@/lib/seo";
import { loadKodloBench } from "@/lib/kodlobench/source";
import { DEFAULT_VIEW, parseView } from "@/lib/kodlobench/view";

export const metadata = buildPageMetadata({
  title: "KodloBench — результати тестування моделей ШІ — KodloHUB 2.0",
  description:
    "Публічні результати тестування моделей ШІ: загальний бал і чотири напрями PDRBench-Pro, REDOTUI-Bench, UTWMR-REC-Bench та 3DSC-GT+. Порівняння балів із часом, токенами та вартістю.",
  path: "/kodlobench",
});

export default async function KodloBenchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const data = await loadKodloBench();
  const initialView = data.status === "ok" ? parseView(params, data.results) : DEFAULT_VIEW;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="heading-section mb-6">KodloBench</h1>
        <KodloBenchClient data={data} initialView={initialView} />
      </div>
    </div>
  );
}
