"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCategory, OVERALL_ID, VIEW_CATEGORIES } from "@/lib/kodlobench/categories";
import { withOverall } from "@/lib/kodlobench/overall";
import { formatDate } from "@/lib/kodlobench/format";
import type { LoadResult, PublishedResult, ScatterAxis, SortKey } from "@/lib/kodlobench/types";
import {
  DEFAULT_VIEW,
  MAX_SELECTED,
  paramsFromSearch,
  parseView,
  selectedIds,
  serializeView,
  sortResults,
  toggleSlot,
  uniqueSorted,
  visibleResults,
  type ViewState,
} from "@/lib/kodlobench/view";
import CategoryTabs from "./CategoryTabs";
import ChartPanel from "./ChartPanel";
import DetailsDialog from "./DetailsDialog";
import { EmptyNotice, ErrorNotice } from "./Notices";
import ResultsTable from "./ResultsTable";
import SelectionTray from "./SelectionTray";
import Toolbar from "./Toolbar";

interface Props {
  data: LoadResult;
  initialView: ViewState;
}

const EMPTY: PublishedResult[] = [];

export default function KodloBenchClient({ data, initialView }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState<ViewState>(initialView);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [full, setFull] = useState(false);

  const ok = data.status === "ok" ? data : null;
  const published = ok ? ok.results : EMPTY;
  // Overall rows are derived from the published ones; the exclusion list decides which categories count.
  const all = useMemo(() => withOverall(published, view.exclude), [published, view.exclude]);
  const currency = ok ? ok.currency : null;

  // Back/forward restores the view stored in the address.
  useEffect(() => {
    const onPop = () => setView(parseView(paramsFromSearch(window.location.search), published));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [published]);

  const commit = useCallback(
    (patch: Partial<ViewState>, mode: "push" | "replace" = "replace") => {
      const next = { ...view, ...patch };
      if (next.onlySelected && !next.slots.some(Boolean)) next.onlySelected = false;
      setView(next);
      window.history[mode === "push" ? "pushState" : "replaceState"](null, "", `${pathname}${serializeView(next)}`);
    },
    [view, pathname],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of all) c[r.category] = (c[r.category] ?? 0) + 1;
    return c;
  }, [all]);

  const categoryRows = useMemo(() => all.filter((r) => r.category === view.category), [all, view.category]);
  const byId = useMemo(() => new Map(categoryRows.map((r) => [r.id, r])), [categoryRows]);
  const modelOptions = useMemo(() => uniqueSorted(categoryRows.map((r) => r.model)), [categoryRows]);
  const agentOptions = useMemo(() => uniqueSorted(categoryRows.map((r) => r.agent)), [categoryRows]);

  const visible = useMemo(() => visibleResults(all, view), [all, view]);
  const tableRows = useMemo(() => sortResults(visible, view.sort, view.dir), [visible, view.sort, view.dir]);

  const category = getCategory(view.category) ?? VIEW_CATEGORIES[0];
  const selected = selectedIds(view.slots);
  const dirty = view.query.trim() !== "" || view.models.length > 0 || view.agents.length > 0 || view.onlySelected;

  const toggle = useCallback(
    (id: string) => {
      const res = toggleSlot(view.slots, id);
      setFull(res.full);
      if (!res.full) commit({ slots: res.slots });
    },
    [view.slots, commit],
  );

  function onSort(key: SortKey) {
    if (view.sort === key) commit({ dir: view.dir === "asc" ? "desc" : "asc" });
    else commit({ sort: key, dir: key === "score" ? "desc" : "asc" });
  }

  function onCategory(id: string) {
    if (id === view.category) return;
    setHoverId(null);
    setFull(false);
    // Selections and filters belong to a category; log-scale and total-exclusion choices carry over.
    commit({ ...DEFAULT_VIEW, category: id, logs: view.logs, exclude: view.exclude }, "push");
  }

  const openResult = view.openId ? (byId.get(view.openId) ?? null) : null;

  if (!ok) {
    return (
      <ErrorNotice
        message={data.status === "error" ? data.message : "Не вдалося завантажити результати."}
        onRetry={() => router.refresh()}
      />
    );
  }

  const hasAny = all.some((r) => r.category !== OVERALL_ID);
  const hasInCategory = categoryRows.length > 0;

  return (
    <div className="space-y-6">
      {ok.synthetic && (
        <div role="note" className="rounded-xl border border-dashed border-on-primary-mute px-4 py-3 text-sm text-on-primary">
          <b className="micro-cap mr-2">РЕЖИМ РОЗРОБКИ</b>
          Синтетичні дані для перевірки інтерфейсу. Це не результати KodloBench.
        </div>
      )}

      <CategoryTabs active={view.category} counts={counts} onChange={onCategory} />

      <div id="kb-panel" role="tabpanel" aria-labelledby={`kb-tab-${view.category}`} className="space-y-4">
        {!hasAny ? (
          <EmptyNotice title="Результати KodloBench ще не опубліковані." caption={category.caption} />
        ) : !hasInCategory && view.category === OVERALL_ID ? (
          <EmptyNotice title="Загальний бал поки не можна показати." caption={category.caption}>
            Потрібні результати в усіх чотирьох категоріях для однієї конфігурації моделі й агента.
          </EmptyNotice>
        ) : !hasInCategory ? (
          <EmptyNotice title={`Для ${category.name} результати ще не опубліковані.`} caption={category.caption} />
        ) : (
          <>
            <Toolbar
              query={view.query}
              onQuery={(q) => commit({ query: q })}
              modelOptions={modelOptions}
              agentOptions={agentOptions}
              models={view.models}
              agents={view.agents}
              onModels={(models) => commit({ models })}
              onAgents={(agents) => commit({ agents })}
              onlySelected={view.onlySelected}
              selectedCount={selected.size}
              onOnlySelected={(onlySelected) => commit({ onlySelected })}
              dirty={dirty}
              onReset={() => commit({ query: "", models: [], agents: [], onlySelected: false })}
              shown={visible.length}
              total={categoryRows.length}
            />

            <SelectionTray
              slots={view.slots}
              byId={byId}
              hoverId={hoverId}
              full={full}
              onToggle={toggle}
              onClear={() => {
                setFull(false);
                commit({ slots: [] });
              }}
              onHover={setHoverId}
            />

            {visible.length === 0 ? (
              <EmptyNotice title="За цими фільтрами нічого не знайдено.">
                <button
                  type="button"
                  className="btn-ghost text-on-primary mt-2"
                  onClick={() => commit({ query: "", models: [], agents: [], onlySelected: false })}
                >
                  СКИНУТИ ФІЛЬТРИ
                </button>
              </EmptyNotice>
            ) : (
              <>
                <ChartPanel
                  categoryId={view.category}
                  exclude={view.exclude}
                  onToggleExclude={(id: string) => {
                    const exclude = view.exclude.includes(id) ? view.exclude.filter((x) => x !== id) : [...view.exclude, id];
                    // Rows that exist only in one of the two modes drop out of the selection.
                    const ids = new Set(withOverall(published, exclude).map((r) => r.id));
                    commit({ exclude, slots: view.slots.map((s) => (s && ids.has(s) ? s : null)) });
                  }}
                  logs={view.logs}
                  onToggleLog={(axis: ScatterAxis) =>
                    commit({ logs: view.logs.includes(axis) ? view.logs.filter((a) => a !== axis) : [...view.logs, axis] })
                  }
                  rows={visible}
                  slots={view.slots}
                  hoverId={hoverId}
                  onHover={setHoverId}
                  onToggle={toggle}
                  currency={currency}
                />
                <ResultsTable
                  rows={tableRows}
                  sort={view.sort}
                  dir={view.dir}
                  onSort={onSort}
                  slots={view.slots}
                  hoverId={hoverId}
                  onHover={setHoverId}
                  onToggle={toggle}
                  onOpen={(id) => commit({ openId: id })}
                  currency={currency}
                  synthetic={ok.synthetic}
                />
              </>
            )}
          </>
        )}
      </div>

      {(ok.updatedAt || ok.rejected > 0) && (
        <p className="text-xs text-ink-mute">
          {ok.updatedAt && <>Оновлено: {formatDate(ok.updatedAt)}. </>}
          {ok.rejected > 0 && <>Частину записів приховано: вони не пройшли перевірку формату.</>}
        </p>
      )}

      <DetailsDialog
        result={openResult}
        currency={currency}
        selected={openResult ? selected.has(openResult.id) : false}
        full={full || selected.size >= MAX_SELECTED}
        onToggle={toggle}
        onClose={() => {
          if (view.openId) commit({ openId: null });
        }}
        synthetic={ok.synthetic}
      />
    </div>
  );
}
