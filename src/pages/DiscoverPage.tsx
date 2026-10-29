import { Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { useDeferredValue, useId, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { CreatorCard } from "@/components/discover/CreatorCard";
import { DiscoverFilters } from "@/components/discover/DiscoverFilters";
import {
  activeFilterCount,
  DISCOVER_SORTS,
  EMPTY_QUERY,
  filterCreators,
  parseDiscoverQuery,
  sortCreators,
  toSearchParams,
  type DiscoverQuery,
  type DiscoverSort,
} from "@/components/discover/query";
import { PageHeader } from "@/components/layout/Layout";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { SITE } from "@/config/site";
import { creators } from "@/data/creators";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 24;

export default function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => parseDiscoverQuery(params), [params]);
  const deferredQuery = useDeferredValue(query);
  const list = useMemo(() => sortCreators(filterCreators(creators, deferredQuery), deferredQuery.sort), [deferredQuery]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState({ size: PAGE_SIZE, key: list });
  const visibleCount = page.key === list ? page.size : PAGE_SIZE;
  const visible = list.slice(0, visibleCount);

  const id = useId();
  const filterCount = activeFilterCount(query);
  const hasCriteria = filterCount > 0 || query.q.trim() !== "";

  function update(patch: Partial<DiscoverQuery>) {
    setParams(toSearchParams({ ...query, ...patch }), { replace: true });
  }

  function clearFilters() {
    setParams(toSearchParams({ ...EMPTY_QUERY, sort: query.sort }), { replace: true });
  }

  return (
    <div className="container-page pb-16">
      <title>{"Discover creators · " + SITE.name}</title>
      <PageHeader
        eyebrow="Discover"
        title="Browse creators"
        description="Search and filter every creator in the demo dataset, no brief needed. Profiles, rates and audiences are fictional and generated for this demo."
        actions={
          <ButtonLink to="/match" variant="secondary">
            Match to a brief instead
          </ButtonLink>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative min-w-0 flex-1">
          <Label htmlFor={`${id}-q`} className="sr-only">
            Search creators
          </Label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            id={`${id}-q`}
            type="search"
            value={query.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Search name, @handle, topic or city"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`${id}-sort`} className="shrink-0">
            Sort by
          </Label>
          <Select id={`${id}-sort`} value={query.sort} onChange={(e) => update({ sort: e.target.value as DiscoverSort })} className="min-w-0 flex-1 sm:w-auto">
            {DISCOVER_SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside aria-label="Filters" className="lg:sticky lg:top-20">
          <Button
            variant="outline"
            className="w-full justify-between lg:hidden"
            aria-expanded={filtersOpen}
            aria-controls={`${id}-filters`}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Filters{filterCount > 0 ? ` (${filterCount})` : ""}
            </span>
            <span className="text-xs font-normal text-slate-500">{filtersOpen ? "Hide" : "Show"}</span>
          </Button>
          <Card id={`${id}-filters`} className={cn("mt-3 p-4 lg:mt-0 lg:block", filtersOpen ? "block" : "hidden")}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
              {filterCount > 0 ? (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="-mr-2">
                  Clear
                </Button>
              ) : null}
            </div>
            <DiscoverFilters query={query} onChange={update} />
          </Card>
        </aside>

        <section aria-labelledby={`${id}-count`} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id={`${id}-count`} className="text-sm text-slate-600" aria-live="polite">
              <span className="font-semibold tabular-nums text-slate-900">{list.length}</span> of {creators.length} creators
            </h2>
            {hasCriteria ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="size-4" aria-hidden="true" />
                Clear filters
              </Button>
            ) : null}
          </div>

          {list.length > 0 ? (
            <>
              <ul className={cn("grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3", deferredQuery !== query && "opacity-60")}>
                {visible.map((creator) => (
                  <li key={creator.id} className="min-w-0">
                    <CreatorCard creator={creator} />
                  </li>
                ))}
              </ul>
              {visible.length < list.length ? (
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => setPage({ size: visibleCount + PAGE_SIZE, key: list })}>
                    Show {Math.min(PAGE_SIZE, list.length - visible.length)} more
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No creators match"
              description="Try a broader search or remove a filter or two."
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
