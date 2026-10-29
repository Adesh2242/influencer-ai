import { Menu, Sparkles, X } from "lucide-react";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { ButtonLink } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/misc";
import { NAV_ITEMS, SITE } from "@/config/site";
import { cn } from "@/lib/utils";
import { useShortlist } from "@/state/ShortlistContext";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-extrabold tracking-tight text-slate-900", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-sm">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      <span className="text-lg">{SITE.name}</span>
    </Link>
  );
}

function NavItems({ onNavigate, vertical }: { onNavigate?: () => void; vertical?: boolean }) {
  const { count } = useShortlist();
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              vertical && "w-full",
              isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )
          }
        >
          {item.label}
          {item.to === "/shortlist" && count > 0 ? (
            <span className="rounded-full bg-saffron-500 px-1.5 text-xs font-bold text-white tabular-nums" aria-label={`${count} creators`}>
              {count}
            </span>
          ) : null}
        </NavLink>
      ))}
    </>
  );
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          <NavItems />
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink to="/match" size="sm" className="hidden sm:inline-flex">
            Find creators
          </ButtonLink>
          <button
            type="button"
            className="grid size-10 cursor-pointer place-items-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-slate-200 bg-white lg:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            <NavItems vertical onNavigate={() => setOpen(false)} />
            <ButtonLink to="/match" className="mt-2 sm:hidden">
              Find creators
            </ButtonLink>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-page flex flex-col gap-8 py-10 md:flex-row md:justify-between">
        <div className="max-w-sm space-y-3">
          <Logo />
          <p className="text-sm text-slate-500">{SITE.tagline}</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className="text-slate-600 hover:text-brand-700">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-slate-100">
        <p className="container-page py-4 text-xs text-slate-500">
          Demo build: every creator profile, statistic and brand collaboration shown here is fictional sample data generated for
          demonstration. © {new Date().getFullYear()} {SITE.name}.
        </p>
      </div>
    </footer>
  );
}

/** Scrolls to the top on every navigation, like a multi-page site would. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <SiteHeader />
      <main id="main" className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

export interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Consistent title block at the top of app pages. */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 py-8 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-3xl space-y-2">
        {eyebrow ? <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{eyebrow}</p> : null}
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        {description ? <p className="text-base text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
