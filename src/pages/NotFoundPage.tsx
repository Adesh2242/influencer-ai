import { Compass, House, Sparkles } from "lucide-react";
import { useLocation } from "react-router";
import { ButtonLink } from "@/components/ui/Button";
import { SITE } from "@/config/site";

export default function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-16">
      <title>{"Page not found · " + SITE.name}</title>
      <meta name="robots" content="noindex" />
      <div className="flex max-w-lg flex-col items-center text-center">
        <span className="grid size-14 place-items-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
          <Compass className="size-7" aria-hidden="true" />
        </span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-brand-600">Error 404</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">We couldn't find that page</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Nothing lives at{" "}
          <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-sm break-all text-slate-800">{pathname}</code>. The
          link may be mistyped, or the page may have moved.
        </p>
        <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <ButtonLink to="/" variant="outline" size="lg">
            <House className="size-4" aria-hidden="true" />
            Back to home
          </ButtonLink>
          <ButtonLink to="/match" size="lg">
            <Sparkles className="size-4" aria-hidden="true" />
            Start matching
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
