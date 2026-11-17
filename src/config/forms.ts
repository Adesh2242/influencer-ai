// Sign-up form definitions, shared by the React forms and the server endpoint that receives them.
// The field lists are the contract between the two: the server only stores fields named here.

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
 * POSTs a submission to this app's own form endpoint. Resolves on success and throws otherwise, so
 * the form shows its error state rather than a success panel.
 *
 * The old Netlify version posted to "/" and treated any non-error response as a win. On a server
 * that answers unknown paths with the SPA shell that reads as a 200, which would have shown every
 * visitor a cheerful confirmation while the sign-up was discarded.
 */
export async function submitForm(formName: string, data: Record<string, string>): Promise<void> {
  const response = await fetch(`/api/forms/${encodeURIComponent(formName)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Form submission failed with status ${response.status}`);
  }
}
