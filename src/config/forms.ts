// Netlify Forms collect sign-ups without a database. Netlify detects forms at deploy time from the
// static copies in index.html, so the field names below must stay in sync with that file.

export const BRAND_FORM = {
  name: "brand-early-access",
  fields: ["name", "email", "company", "role", "monthlyBudget", "message"],
} as const;

export const CREATOR_FORM = {
  name: "creator-waitlist",
  fields: ["name", "email", "handle", "platform", "followers", "city", "language", "niche"],
} as const;

/** Honeypot field: real users never see or fill it. */
export const HONEYPOT_FIELD = "bot-field";

/**
 * POSTs a form submission to Netlify. Resolves on success and throws on failure, including when
 * the site is not on Netlify (e.g. `npm run dev`) or form detection is disabled for the site.
 */
export async function submitNetlifyForm(formName: string, data: Record<string, string>): Promise<void> {
  const body = new URLSearchParams({ "form-name": formName, ...data });
  const response = await fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new Error(`Form submission failed with status ${response.status}`);
  }
}
