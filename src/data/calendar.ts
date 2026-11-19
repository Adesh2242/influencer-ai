// Maharashtra's commercial calendar, which is not the national one.
//
// Ganesh Chaturthi is the single largest regional commerce moment in the state and barely registers
// in a pan-India media plan. Gudi Padwa is the auspicious buying day for gold, vehicles and
// property here while the rest of the country is doing nothing. Ashadhi Ekadashi moves rural
// Western Maharashtra and Marathwada in a way no national calendar captures.
//
// Rates and availability move with this. Creator inventory around Ganpati and Diwali sells out
// weeks ahead and prices rise sharply, so the useful output is not "this festival exists" but
// "you have N days before the booking window closes".
//
// DATES: the solar festivals below (Makar Sankranti, Shiv Jayanti) fall on fixed dates. The rest
// follow the Hindu lunisolar calendar and shift by weeks each year, so they are given as the window
// they reliably fall inside rather than a specific date this file would get wrong. Confirm the
// exact date for the year you are planning before committing to a booking deadline.
import type { Niche } from "../types";
import type { SubRegion } from "../lib/regional";

export interface Festival {
  id: string;
  name: string;
  marathiName?: string;
  /** Inclusive month/day window the festival falls inside. Months are 1-12. */
  window: { fromMonth: number; fromDay: number; toMonth: number; toDay: number };
  /** True when the date is solar and therefore stable year to year. */
  fixedDate: boolean;
  /** What the festival actually sells. */
  categories: Niche[];
  /** Typical multiple on creator rates inside the booking run-up. */
  rateMultiplier: number;
  /** Weeks before the festival by which good creators are usually committed. */
  bookingLeadWeeks: number;
  /** Where it matters most; empty means statewide. */
  strongestIn: SubRegion[];
  why: string;
}

export const MH_FESTIVALS: Festival[] = [
  {
    id: "ganesh-chaturthi",
    name: "Ganesh Chaturthi",
    marathiName: "गणेश चतुर्थी",
    window: { fromMonth: 8, fromDay: 20, toMonth: 9, toDay: 20 },
    fixedDate: false,
    categories: ["food", "devotional", "fashion", "entertainment", "lifestyle"],
    rateMultiplier: 2.4,
    bookingLeadWeeks: 8,
    strongestIn: [],
    why: "Ten days of household and public celebration across the whole state. The largest regional commerce window in Maharashtra and the one a national plan most often misses.",
  },
  {
    id: "gudi-padwa",
    name: "Gudi Padwa",
    marathiName: "गुढी पाडवा",
    window: { fromMonth: 3, fromDay: 18, toMonth: 4, toDay: 18 },
    fixedDate: false,
    categories: ["automotive", "finance", "fashion", "food", "lifestyle"],
    rateMultiplier: 1.8,
    bookingLeadWeeks: 5,
    strongestIn: [],
    why: "The Marathi new year and the state's auspicious buying day: vehicles, gold, property and electronics. Largely invisible outside Maharashtra.",
  },
  {
    id: "diwali-padwa",
    name: "Diwali and Bhaubeej",
    marathiName: "दिवाळी",
    window: { fromMonth: 10, fromDay: 15, toMonth: 11, toDay: 20 },
    fixedDate: false,
    categories: ["fashion", "beauty", "food", "tech", "lifestyle", "automotive"],
    rateMultiplier: 2.2,
    bookingLeadWeeks: 7,
    strongestIn: [],
    why: "The national peak, with Maharashtra-specific days either side. Inventory is tightest here of any point in the year.",
  },
  {
    id: "ashadhi-ekadashi",
    name: "Ashadhi Ekadashi and the Wari",
    marathiName: "आषाढी एकादशी",
    window: { fromMonth: 6, fromDay: 25, toMonth: 7, toDay: 25 },
    fixedDate: false,
    categories: ["devotional", "food", "travel"],
    rateMultiplier: 1.5,
    bookingLeadWeeks: 4,
    strongestIn: ["western", "marathwada"],
    why: "The Pandharpur pilgrimage draws hundreds of thousands on foot through Western Maharashtra. Enormous in rural and devotional audiences, absent from metro plans.",
  },
  {
    id: "makar-sankranti",
    name: "Makar Sankranti",
    marathiName: "मकर संक्रांत",
    window: { fromMonth: 1, fromDay: 13, toMonth: 1, toDay: 16 },
    fixedDate: true,
    categories: ["food", "fashion", "lifestyle"],
    rateMultiplier: 1.4,
    bookingLeadWeeks: 3,
    strongestIn: [],
    why: "Tilgul and haldi-kunku gatherings. A solar festival, so the date barely moves — the one window that can be planned a year ahead with confidence.",
  },
  {
    id: "shiv-jayanti",
    name: "Shiv Jayanti",
    marathiName: "शिव जयंती",
    window: { fromMonth: 2, fromDay: 19, toMonth: 2, toDay: 19 },
    fixedDate: true,
    categories: ["entertainment", "education", "lifestyle"],
    rateMultiplier: 1.3,
    bookingLeadWeeks: 3,
    strongestIn: ["western", "vidarbha", "marathwada"],
    why: "Chhatrapati Shivaji Maharaj's birth anniversary, observed on a fixed date and strongly in the interior districts. Brand work here needs care: the sentiment is civic, not commercial.",
  },
  {
    id: "navratri",
    name: "Navratri",
    marathiName: "नवरात्र",
    window: { fromMonth: 9, fromDay: 20, toMonth: 10, toDay: 20 },
    fixedDate: false,
    categories: ["fashion", "beauty", "devotional", "entertainment"],
    rateMultiplier: 1.6,
    bookingLeadWeeks: 5,
    strongestIn: [],
    why: "Nine nights of garba and devotional programming, running straight into the Diwali build-up.",
  },
];

/** Midpoint of a festival's window in the given year, as a date. */
function windowMidpoint(festival: Festival, year: number): Date {
  const from = Date.UTC(year, festival.window.fromMonth - 1, festival.window.fromDay);
  const to = Date.UTC(
    festival.window.toMonth < festival.window.fromMonth ? year + 1 : year,
    festival.window.toMonth - 1,
    festival.window.toDay,
  );
  return new Date((from + to) / 2);
}

export interface UpcomingFestival {
  festival: Festival;
  /** Days until the middle of the window. Approximate for lunar festivals. */
  daysAway: number;
  /** Days until creators in demand are typically committed. Negative means the window has passed. */
  daysToBook: number;
  /** True when the booking window is open now. */
  bookNow: boolean;
  /** True when the lead time has already run out. */
  tooLate: boolean;
}

/**
 * Festivals ahead of a given date, soonest first. Distances are approximate for everything except
 * the two solar festivals, because the lunar dates shift year to year.
 */
export function upcomingFestivals(from: Date = new Date(), withinDays = 365): UpcomingFestival[] {
  const out: UpcomingFestival[] = [];
  for (const festival of MH_FESTIVALS) {
    // Try this year and next, and take whichever midpoint is next in the future.
    const candidates = [windowMidpoint(festival, from.getUTCFullYear()), windowMidpoint(festival, from.getUTCFullYear() + 1)];
    const next = candidates.find((date) => date.getTime() >= from.getTime());
    if (!next) continue;

    const daysAway = Math.round((next.getTime() - from.getTime()) / 86_400_000);
    if (daysAway > withinDays) continue;

    const daysToBook = daysAway - festival.bookingLeadWeeks * 7;
    out.push({
      festival,
      daysAway,
      daysToBook,
      bookNow: daysToBook <= 21 && daysToBook > 0,
      tooLate: daysToBook <= 0,
    });
  }
  return out.sort((a, b) => a.daysAway - b.daysAway);
}

/** The festivals a given niche should be planned around. */
export function festivalsForNiche(niche: Niche): Festival[] {
  return MH_FESTIVALS.filter((festival) => festival.categories.includes(niche));
}
