// Replaces Netlify Forms for the two sign-up forms.
//
// Netlify detected forms at deploy time and collected submissions itself. Railway has no such
// thing, and the old client posted to "/" — which on this server would hit the SPA fallback and
// return 200, so the form would show its success panel and the sign-up would vanish. This endpoint
// exists so that can never happen: a submission is either delivered or it fails loudly.
//
// Delivery is by email through Resend. Set RESEND_API_KEY and FORMS_TO_EMAIL to turn it on. With
// neither set the endpoint reports itself unconfigured instead of pretending to have worked.
import { BRAND_FORM, CREATOR_FORM, HONEYPOT_FIELD } from "../config/forms";

const FORMS = [BRAND_FORM, CREATOR_FORM];
const MAX_FIELD_LENGTH = 2000;
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export interface FormDeps {
  apiKey?: string;
  to?: string;
  from?: string;
  /** Injected by tests; defaults to the real Resend call. */
  deliver?: (payload: DeliveryPayload) => Promise<void>;
}

export interface DeliveryPayload {
  formName: string;
  fields: Record<string, string>;
  receivedAt: string;
}

async function deliverByEmail(payload: DeliveryPayload, deps: Required<Pick<FormDeps, "apiKey" | "to" | "from">>): Promise<void> {
  const lines = Object.entries(payload.fields).map(([key, value]) => `${key}: ${value}`);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${deps.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: deps.from,
      to: [deps.to],
      subject: `InfluencerAI: new ${payload.formName} submission`,
      text: `${lines.join("\n")}\n\nReceived: ${payload.receivedAt}`,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend rejected the submission: ${response.status} ${(await response.text()).slice(0, 200)}`);
  }
}

export async function handleFormSubmission(req: Request, formName: string, deps: FormDeps = {}): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const form = FORMS.find((candidate) => candidate.name === formName);
  if (!form) return json(404, { error: "unknown_form" });

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return json(400, { error: "invalid_request" });
  }

  // Spam trap: real people never see this field, so anything in it is a bot. Answer 200 so the bot
  // cannot tell it was caught, but deliver nothing.
  if (typeof body[HONEYPOT_FIELD] === "string" && body[HONEYPOT_FIELD].trim() !== "") {
    return json(200, { ok: true });
  }

  const fields: Record<string, string> = {};
  for (const name of form.fields) {
    const value = body[name];
    if (typeof value === "string") fields[name] = value.trim().slice(0, MAX_FIELD_LENGTH);
  }

  if (!fields.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.email)) {
    return json(400, { error: "invalid_email", message: "Enter an email address we can reach you on." });
  }

  const apiKey = deps.apiKey ?? process.env.RESEND_API_KEY;
  const to = deps.to ?? process.env.FORMS_TO_EMAIL;
  const from = deps.from ?? process.env.FORMS_FROM_EMAIL ?? "InfluencerAI <onboarding@resend.dev>";

  const deliver =
    deps.deliver ?? (apiKey && to ? (payload: DeliveryPayload) => deliverByEmail(payload, { apiKey, to, from }) : undefined);

  if (!deliver) {
    // Nowhere to put it. Say so rather than dropping it: the UI shows its error state and the
    // person can try another way of getting in touch.
    console.error(`Form "${formName}" submitted but no delivery is configured (set RESEND_API_KEY and FORMS_TO_EMAIL).`);
    return json(503, {
      error: "forms_not_configured",
      message: "Sign-ups aren't switched on yet. Please try again later.",
    });
  }

  try {
    await deliver({ formName, fields, receivedAt: new Date().toISOString() });
    return json(200, { ok: true });
  } catch (error) {
    console.error(`Form "${formName}" delivery failed:`, error);
    return json(502, { error: "delivery_failed", message: "Couldn't submit right now. Please try again in a moment." });
  }
}
