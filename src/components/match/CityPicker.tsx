import { X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Input, Label } from "@/components/ui/form";
import { CITIES, CITY_BY_ID } from "@/data/taxonomy";
import { cn } from "@/lib/utils";
import type { City } from "@/types";

const MAX_RESULTS = 8;

function searchCities(query: string, exclude: readonly string[]): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const rank = (city: City) => {
    const names = [city.name.toLowerCase(), ...city.aliases];
    if (names.some((n) => n.startsWith(q))) return 0;
    if (names.some((n) => n.includes(q))) return 1;
    if (city.state.toLowerCase().includes(q)) return 2;
    return -1;
  };
  return CITIES.filter((c) => !exclude.includes(c.id))
    .map((city) => ({ city, r: rank(city) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.city.tier - b.city.tier || a.city.name.localeCompare(b.city.name))
    .slice(0, MAX_RESULTS)
    .map((x) => x.city);
}

/** Combobox for picking cities by name, old name or state; selections show as removable chips. */
export function CityPicker({ value, onChange }: { value: readonly string[]; onChange: (ids: string[]) => void }) {
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => searchCities(query, value), [query, value]);
  const open = results.length > 0;

  function pick(city: City) {
    onChange([...value, city.id]);
    setQuery("");
    setActive(0);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Specific cities</Label>
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${listId}-${results[active]?.id}` : undefined}
          autoComplete="off"
          placeholder="Search e.g. Indore, Bangalore, Kerala"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (!open) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((i) => (i + 1) % results.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((i) => (i - 1 + results.length) % results.length);
            } else if (event.key === "Enter") {
              event.preventDefault();
              const city = results[active];
              if (city) pick(city);
            } else if (event.key === "Escape") {
              setQuery("");
            }
          }}
        />
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching cities"
          hidden={!open}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lift"
        >
          {results.map((city, index) => (
            <li
              key={city.id}
              id={`${listId}-${city.id}`}
              role="option"
              aria-selected={index === active}
              // mousedown keeps focus in the input; click alone would blur it first.
              onMouseDown={(event) => {
                event.preventDefault();
                pick(city);
              }}
              onMouseEnter={() => setActive(index)}
              className={cn("flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 text-sm", index === active ? "bg-brand-50 text-brand-800" : "text-slate-700")}
            >
              <span className="font-medium">{city.name}</span>
              <span className="truncate text-xs text-slate-500">
                {city.state} · Tier {city.tier}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected cities">
          {value.map((cityId) => {
            const name = CITY_BY_ID[cityId]?.name ?? cityId;
            return (
              <li key={cityId}>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-0.5 pl-2.5 pr-1 text-sm font-medium text-brand-800 ring-1 ring-inset ring-brand-200">
                  {name}
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((v) => v !== cityId))}
                    className="grid size-5 cursor-pointer place-items-center rounded-full hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-brand-500"
                    aria-label={`Remove ${name}`}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">Optional. Leave empty to rely on regions and city tiers.</p>
      )}
    </div>
  );
}
