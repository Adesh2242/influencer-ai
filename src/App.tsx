import { lazy, type ComponentType } from "react";
import { clearChunkReloadFlag, importChunk } from "@/lib/chunk";
import { Route, Routes } from "react-router";
import { Layout } from "@/components/layout/Layout";
import { CreatorProvider } from "@/data/creatorStore";

/** A page chunk that recovers from a deploy landing under an open tab. See lib/chunk.ts. */
function lazyPage(load: () => Promise<{ default: ComponentType<unknown> }>) {
  return lazy(() => importChunk(load));
}

// Each page is its own chunk; the Layout's <Suspense> shows a loader while one downloads.
const HomePage = lazyPage(() => import("@/pages/HomePage"));
const MatchPage = lazyPage(() => import("@/pages/MatchPage"));
const PlanPage = lazyPage(() => import("@/pages/PlanPage"));
const DiscoverPage = lazyPage(() => import("@/pages/DiscoverPage"));
const CreatorPage = lazyPage(() => import("@/pages/CreatorPage"));
const ShortlistPage = lazyPage(() => import("@/pages/ShortlistPage"));
const ForCreatorsPage = lazyPage(() => import("@/pages/ForCreatorsPage"));
const MethodologyPage = lazyPage(() => import("@/pages/MethodologyPage"));
const NotFoundPage = lazyPage(() => import("@/pages/NotFoundPage"));

export default function App() {
  clearChunkReloadFlag();
  return (
    // One fetch of the creator dataset for the whole app, shared by every page that needs it.
    <CreatorProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="match" element={<MatchPage />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="creators/:id" element={<CreatorPage />} />
          <Route path="shortlist" element={<ShortlistPage />} />
          <Route path="for-creators" element={<ForCreatorsPage />} />
          <Route path="methodology" element={<MethodologyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </CreatorProvider>
  );
}
