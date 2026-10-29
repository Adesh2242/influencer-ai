import { Bookmark, Download, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "@/components/layout/Layout";
import { briefSummary, hasTargeting, plural } from "@/components/profile/helpers";
import { BudgetPanel } from "@/components/shortlist/BudgetPanel";
import { downloadShortlistCSV } from "@/components/shortlist/exportShortlist";
import { OptimisePreview } from "@/components/shortlist/OptimisePreview";
import { ShortlistTable } from "@/components/shortlist/ShortlistTable";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/misc";
import { SITE } from "@/config/site";
import { getCreatorById } from "@/data/creators";
import { scoreCreator } from "@/lib/matching/engine";
import { planCampaign, summarizeSelection } from "@/lib/matching/optimize";
import { useBrief } from "@/state/BriefContext";
import { useShortlist } from "@/state/ShortlistContext";
import type { Creator } from "@/types";

export default function ShortlistPage() {
  const { brief, updateBrief } = useBrief();
  const shortlist = useShortlist();
  const [optimising, setOptimising] = useState(false);
  const optimiseButton = useRef<HTMLButtonElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);

  const results = useMemo(
    () =>
      shortlist.ids
        .map((id) => getCreatorById(id))
        .filter((creator): creator is Creator => creator !== undefined)
        .map((creator) => scoreCreator(brief, creator)),
    [shortlist.ids, brief],
  );

  const summary = useMemo(() => summarizeSelection(results, brief.budgetINR), [results, brief.budgetINR]);
  // Recomputed from live state, so the preview stays correct if the budget or shortlist changes while open.
  const plan = useMemo(
    () => (optimising ? planCampaign(results, brief.budgetINR, brief.creatorsWanted) : null),
    [optimising, results, brief.budgetINR, brief.creatorsWanted],
  );

  useEffect(() => {
    if (optimising) previewHeading.current?.focus();
  }, [optimising]);

  const canOptimise = brief.budgetINR > 0 && results.length > 0;
  useEffect(() => {
    if (!canOptimise) setOptimising(false);
  }, [canOptimise]);

  function closePreview() {
    setOptimising(false);
    optimiseButton.current?.focus();
  }

  function applyPlan() {
    if (!plan) return;
    const keep = new Set(plan.selected.map((result) => result.creator.id));
    // Keep the user's original ordering rather than the optimiser's.
    shortlist.replace(shortlist.ids.filter((id) => keep.has(id)));
    closePreview();
  }

  function clearShortlist() {
    if (window.confirm(`Remove all ${plural(results.length, "creator")} from your shortlist?`)) {
      setOptimising(false);
      shortlist.clear();
    }
  }

  const title = <title>{"Shortlist · " + SITE.name}</title>;

  if (results.length === 0) {
    return (
      <div className="container-page pb-16">
        {title}
        <PageHeader eyebrow="Shortlist" title="Your shortlist" description="Save creators while you match and browse, then plan your campaign here." />
        <EmptyState
          icon={Bookmark}
          title="No creators shortlisted yet"
          description="Describe your campaign to get ranked matches, or browse every creator. Use the bookmark on any profile to save it here."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink to="/match">Find matches</ButtonLink>
              <ButtonLink to="/discover" variant="outline">
                <Search className="size-4" aria-hidden="true" />
                Browse creators
              </ButtonLink>
            </div>
          }
        />
      </div>
    );
  }

  const targeted = hasTargeting(brief);
  const summaryParts = briefSummary(brief);

  return (
    <div className="container-page pb-16">
      {title}
      <PageHeader
        eyebrow="Shortlist"
        title="Your shortlist"
        description={`${plural(results.length, "creator")} saved. Check fit and cost, fit the plan to your budget, then export it.`}
        actions={
          <>
            <Button variant="outline" onClick={() => downloadShortlistCSV(results)}>
              <Download className="size-4" aria-hidden="true" />
              Export CSV
            </Button>
            <Button variant="ghost" className="text-rose-700 hover:bg-rose-50" onClick={clearShortlist}>
              <Trash2 className="size-4" aria-hidden="true" />
              Clear
            </Button>
          </>
        }
      />

      <p className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        {targeted ? (
          <>
            Scored against your brief
            {brief.brandName.trim() ? ` for ${brief.brandName.trim()}` : ""}
            {summaryParts.length > 0 ? `: ${summaryParts.join(" · ")}` : ""}.{" "}
          </>
        ) : (
          <>No campaign described yet, so scores and fees reflect a general reel campaign. </>
        )}
        <Link to="/match" className="font-medium text-brand-700 underline-offset-2 hover:underline">
          {targeted ? "Edit brief" : "Describe your campaign"}
        </Link>
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          {plan ? (
            <OptimisePreview
              ref={previewHeading}
              current={summary}
              plan={plan}
              budgetINR={brief.budgetINR}
              onApply={applyPlan}
              onCancel={closePreview}
            />
          ) : null}
          <ShortlistTable results={results} onRemove={shortlist.remove} />
        </div>
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start" aria-label="Budget">
          <BudgetPanel
            budgetINR={brief.budgetINR}
            creatorsWanted={brief.creatorsWanted}
            summary={summary}
            onBudgetChange={(budgetINR) => updateBrief({ budgetINR })}
            onCreatorsWantedChange={(creatorsWanted) => updateBrief({ creatorsWanted })}
            onOptimise={() => setOptimising(true)}
            canOptimise={canOptimise}
            optimiseRef={optimiseButton}
          />
        </aside>
      </div>
    </div>
  );
}
