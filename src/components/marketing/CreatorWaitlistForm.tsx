import { useId } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/form";
import { CREATOR_FORM } from "@/config/forms";
import { cn } from "@/lib/utils";
import { FormStatusMessage, FormSuccess, HoneypotField, Optional, SubmitButton, useNetlifyForm } from "./netlifyForm";
import {
  CITY_OPTION_GROUPS,
  FOLLOWER_OPTIONS,
  LANGUAGE_OPTIONS,
  NICHE_OPTIONS,
  OTHER_CITY_OPTION,
  PLATFORM_OPTIONS,
  type SelectOption,
} from "./options";

function Options({ options }: { options: readonly SelectOption[] }) {
  return (
    <>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </>
  );
}

/** Creator waitlist sign-up, collected with Netlify Forms. */
export function CreatorWaitlistForm({ className }: { className?: string }) {
  const { status, field, onSubmit } = useNetlifyForm(CREATOR_FORM);
  const headingId = useId();
  const noteId = useId();
  const handleHintId = useId();

  return (
    <Card className={cn("p-5 sm:p-7", className)}>
      {status === "success" ? (
        <FormSuccess
          title="You're on the creator waitlist"
          action={
            <ButtonLink to="/methodology" variant="secondary">
              See how matching works
            </ButtonLink>
          }
        >
          Thanks for joining. We'll email you when creator sign-up opens.
        </FormSuccess>
      ) : (
        <form name={CREATOR_FORM.name} method="post" onSubmit={onSubmit} aria-labelledby={headingId} aria-describedby={noteId}>
          <h3 id={headingId} className="text-lg font-semibold text-slate-900">
            Join the creator waitlist
          </h3>
          <p className="mt-1 text-sm text-slate-500">Only name and email are required; the rest helps us match you.</p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Your name" htmlFor={field("name").id}>
              <Input {...field("name")} required autoComplete="name" maxLength={100} />
            </Field>
            <Field label="Email" htmlFor={field("email").id}>
              <Input {...field("email")} type="email" required autoComplete="email" maxLength={254} />
            </Field>
            <Field
              label={
                <>
                  Handle
                  <Optional />
                </>
              }
              htmlFor={field("handle").id}
              hint={<span id={handleHintId}>Your main handle, with or without the @.</span>}
            >
              <Input
                {...field("handle")}
                aria-describedby={handleHintId}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="@yourhandle"
                maxLength={60}
              />
            </Field>
            <Field
              label={
                <>
                  Main platform
                  <Optional />
                </>
              }
              htmlFor={field("platform").id}
            >
              <Select {...field("platform")} defaultValue="">
                <option value="">Select a platform</option>
                <Options options={PLATFORM_OPTIONS} />
              </Select>
            </Field>
            <Field
              label={
                <>
                  Followers on that platform
                  <Optional />
                </>
              }
              htmlFor={field("followers").id}
            >
              <Select {...field("followers")} defaultValue="">
                <option value="">Select a range</option>
                <Options options={FOLLOWER_OPTIONS} />
              </Select>
            </Field>
            <Field
              label={
                <>
                  City
                  <Optional />
                </>
              }
              htmlFor={field("city").id}
            >
              <Select {...field("city")} defaultValue="">
                <option value="">Select your city</option>
                {CITY_OPTION_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    <Options options={group.options} />
                  </optgroup>
                ))}
                <option value={OTHER_CITY_OPTION.value}>{OTHER_CITY_OPTION.label}</option>
              </Select>
            </Field>
            <Field
              label={
                <>
                  Main content language
                  <Optional />
                </>
              }
              htmlFor={field("language").id}
            >
              <Select {...field("language")} defaultValue="">
                <option value="">Select a language</option>
                <Options options={LANGUAGE_OPTIONS} />
              </Select>
            </Field>
            <Field
              label={
                <>
                  Main niche
                  <Optional />
                </>
              }
              htmlFor={field("niche").id}
            >
              <Select {...field("niche")} defaultValue="">
                <option value="">Select a niche</option>
                <Options options={NICHE_OPTIONS} />
              </Select>
            </Field>
          </div>

          <HoneypotField />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SubmitButton submitting={status === "submitting"}>Join the waitlist</SubmitButton>
            <p id={noteId} className="text-xs leading-relaxed text-slate-500 sm:max-w-64 sm:text-right">
              We'll only use these details to contact you about the creator waitlist.
            </p>
          </div>
        </form>
      )}
      <FormStatusMessage status={status} successMessage="Thanks, you've joined the creator waitlist. We'll email you when sign-up opens." />
    </Card>
  );
}
