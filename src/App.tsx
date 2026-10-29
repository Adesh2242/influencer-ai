import { lazy } from "react";
import { Route, Routes } from "react-router";
import { Layout } from "@/components/layout/Layout";

// Each page is its own chunk; the Layout's <Suspense> shows a loader while one downloads.
const HomePage = lazy(() => import("@/pages/HomePage"));
const MatchPage = lazy(() => import("@/pages/MatchPage"));
const DiscoverPage = lazy(() => import("@/pages/DiscoverPage"));
const CreatorPage = lazy(() => import("@/pages/CreatorPage"));
const ShortlistPage = lazy(() => import("@/pages/ShortlistPage"));
const ForCreatorsPage = lazy(() => import("@/pages/ForCreatorsPage"));
const MethodologyPage = lazy(() => import("@/pages/MethodologyPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="match" element={<MatchPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="creators/:id" element={<CreatorPage />} />
        <Route path="shortlist" element={<ShortlistPage />} />
        <Route path="for-creators" element={<ForCreatorsPage />} />
        <Route path="methodology" element={<MethodologyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
