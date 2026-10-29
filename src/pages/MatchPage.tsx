import { PageHeader } from "@/components/layout/Layout";
import { BriefPanel } from "@/components/match/BriefPanel";
import { ResultsPanel } from "@/components/match/ResultsPanel";
import { SITE } from "@/config/site";

export default function MatchPage() {
  return (
    <div className="container-page pb-16">
      <title>{"Match creators · " + SITE.name}</title>
      <PageHeader
        eyebrow="Match workspace"
        title="Find creators for your campaign"
        description="Describe the campaign in your own words or set the details yourself. Every creator gets an explainable 0-100 match score, with cost and reach estimated in rupees. All creators shown are fictional demo profiles."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* Sticky below the 4rem site header, scrolling on its own when the editor is taller than the screen. */}
        <aside aria-label="Campaign brief" className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:rounded-2xl">
          <BriefPanel />
        </aside>
        <ResultsPanel />
      </div>
    </div>
  );
}
