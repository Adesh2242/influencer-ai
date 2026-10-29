// Number formatting in Indian conventions: rupees use lakh/crore grouping, social counts use K/M.

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const countFormatter = new Intl.NumberFormat("en-IN");

function trimDecimals(value: number): string {
  if (value >= 100) return Math.round(value).toString();
  return value.toFixed(value >= 10 ? 1 : 2).replace(/\.?0+$/, "");
}

/** ₹1,25,000 */
export function formatINR(value: number): string {
  return inrFormatter.format(Math.round(value));
}

/** ₹1.25 L, ₹3.5 Cr, ₹45K */
export function formatINRCompact(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${sign}₹${trimDecimals(abs / 1e7)} Cr`;
  if (abs >= 1e5) return `${sign}₹${trimDecimals(abs / 1e5)} L`;
  if (abs >= 1e3) return `${sign}₹${trimDecimals(abs / 1e3)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

/** 12.4K, 1.2M: social media convention for followers and views. */
export function formatCount(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${sign}${trimDecimals(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}${trimDecimals(abs / 1e3)}K`;
  return `${sign}${Math.round(abs)}`;
}

/** 1,25,000 */
export function formatNumber(value: number): string {
  return countFormatter.format(Math.round(value));
}

/** Formats a value that is already a percentage: 3.42 -> "3.4%". */
export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/** Formats a 0..1 share: 0.42 -> "42%". */
export function formatShare(share: number, digits = 0): string {
  return `${(share * 100).toFixed(digits)}%`;
}
