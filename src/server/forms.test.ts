import { describe, expect, it, vi } from "vitest";
import { handleFormSubmission, type DeliveryPayload } from "./forms";

function post(body: unknown): Request {
  return new Request("http://localhost/api/forms/brand-early-access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const valid = { name: "Asha", email: "asha@example.com", company: "Acme", role: "Marketing" };

describe("handleFormSubmission", () => {
  it("delivers a valid submission", async () => {
    const delivered: DeliveryPayload[] = [];
    const response = await handleFormSubmission(post(valid), "brand-early-access", {
      deliver: async (payload) => void delivered.push(payload),
    });
    expect(response.status).toBe(200);
    expect(delivered).toHaveLength(1);
    expect(delivered[0].fields).toMatchObject({ name: "Asha", email: "asha@example.com" });
  });

  it("reports itself unconfigured rather than silently dropping a sign-up", async () => {
    const response = await handleFormSubmission(post(valid), "brand-early-access", {});
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "forms_not_configured" });
  });

  it("surfaces a delivery failure instead of claiming success", async () => {
    const response = await handleFormSubmission(post(valid), "brand-early-access", {
      deliver: async () => {
        throw new Error("resend down");
      },
    });
    expect(response.status).toBe(502);
  });

  it("rejects an unknown form and a non-POST", async () => {
    expect((await handleFormSubmission(post(valid), "not-a-form", {})).status).toBe(404);
    const get = new Request("http://localhost/api/forms/brand-early-access");
    expect((await handleFormSubmission(get, "brand-early-access", {})).status).toBe(405);
  });

  it("requires a usable email address", async () => {
    const response = await handleFormSubmission(post({ ...valid, email: "nope" }), "brand-early-access", {});
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "invalid_email" });
  });

  it("swallows a honeypot hit without delivering it", async () => {
    const deliver = vi.fn();
    const response = await handleFormSubmission(post({ ...valid, "bot-field": "spam" }), "brand-early-access", { deliver });
    expect(response.status).toBe(200);
    expect(deliver).not.toHaveBeenCalled();
  });

  it("keeps only the fields the form declares", async () => {
    const delivered: DeliveryPayload[] = [];
    await handleFormSubmission(post({ ...valid, sneaky: "injected" }), "brand-early-access", {
      deliver: async (payload) => void delivered.push(payload),
    });
    expect(Object.keys(delivered[0].fields)).not.toContain("sneaky");
  });
});
