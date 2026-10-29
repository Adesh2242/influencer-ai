import { ArrowRight } from "lucide-react";
import { useId } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { BRAND_FORM } from "@/config/forms";
import { cn } from "@/lib/utils";
import { FormStatusMessage, FormSuccess, HoneypotField, Optional, SubmitButton, useNetlifyForm } from "./netlifyForm";
import { MONTHLY_BUDGET_OPTIONS } from "./options";

/** Early-access sign-up for brands and agencies, collected with Netlify Forms. */
export function BrandEarlyAccessForm({ className }: { className?: string }) {
  const { status, field, onSubmit } = useNetlifyForm(BRAND_FORM);
  const headingId = useId();
  const noteId = useId();

  return (
    <Card className={cn("p-5 sm:p-7", className)}>
      {status === "success" ? (
        <FormSuccess
          title="You're on the early-access list"
          action={
            <ButtonLink to="/match" variant="secondary">
              Try the demo meanwhile
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          }
        >
          Thanks for your interest. We'll email you as early access opens up.
        </FormSuccess>
      ) : (
        <form name={BRAND_FORM.name} method="post" onSubmit={onSubmit} aria-labelledby={headingId} aria-describedby={noteId}>
          <h3 id={headingId} className="text-lg font-semibold text-slate-900">
            Request early access
          </h3>
          <p className="mt-1 text-sm text-slate-500">Only your name and email are required.</p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Your name" htmlFor={field("name").id}>
              <Input {...field("name")} required autoComplete="name" maxLength={100} />
            </Field>
            <Field label="Work email" htmlFor={field("email").id}>
              <Input {...field("email")} type="email" required autoComplete="email" maxLength={254} />
            </Field>
            <Field
              label={
                <>
                  Company or brand
                  <Optional />
                </>
              }
              htmlFor={field("company").id}
            >
              <Input {...field("company")} autoComplete="organization" maxLength={120} />
            </Field>
            <Field
              label={
                <>
                  Your role
                  <Optional />
                </>
              }
              htmlFor={field("role").id}
            >
              <Input {...field("role")} autoComplete="organization-title" placeholder="e.g. Brand manager" maxLength={80} />
            </Field>
            <Field
              label={
                <>
                  Monthly influencer budget
                  <Optional />
                </>
              }
              htmlFor={field("monthlyBudget").id}
              className="sm:col-span-2"
            >
              <Select {...field("monthlyBudget")} defaultValue="">
                <option value="">Select a range</option>
                {MONTHLY_BUDGET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={
                <>
                  What are you planning?
                  <Optional />
                </>
              }
              htmlFor={field("message").id}
              className="sm:col-span-2"
            >
              <Textarea
                {...field("message")}
                rows={4}
                maxLength={2000}
                placeholder="e.g. A festive launch in Tamil and Telugu with 10 micro creators"
              />
            </Field>
          </div>

          <HoneypotField />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SubmitButton submitting={status === "submitting"}>Request early access</SubmitButton>
            <p id={noteId} className="text-xs leading-relaxed text-slate-500 sm:max-w-64 sm:text-right">
              We'll only use these details to contact you about early access.
            </p>
          </div>
        </form>
      )}
      <FormStatusMessage
        status={status}
        successMessage="Thanks, your request was sent. We'll email you as early access opens up."
      />
    </Card>
  );
}
