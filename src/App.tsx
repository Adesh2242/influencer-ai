import { lazy, type ComponentType } from "react";
import { Route, Routes } from "react-router";
import { Layout } from "@/components/layout/Layout";
import { CreatorProvider } from "@/data/creatorStore";

/**
 * A page chunk that recovers from a deploy landing under an open tab.
 *
 * Each page is a separate chunk named by content hash, so deploying replaces every filename. A tab
 * opened beforehand still asks for the old one, and a failed import inside lazy() surfaces as a
 * rejected promise that React has no boundary for: the route renders nothing and the user gets a
 * blank white page with no error. Reloading picks up the new index.html and fixes it, so do that
 * once, automatically. The sessionStorage flag means a genuinely broken build fails visibly rather
 * than reloading forever.
 */
function lazyPage(load: () => Promise<{ default: ComponentType<unknown> }>) {
  return lazy(() =>
    load().catch((error: unknown) => {
      const KEY = "chunk-reload";
      if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, "1");
        window.location.reload();
        // Never resolves; the reload takes over before React renders anything.
        return new Promise<{ default: ComponentType<unknown> }>(() => {});
      }
      throw error;
    }),
  );
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
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("chunk-reload");
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
