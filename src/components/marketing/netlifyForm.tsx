import { CircleAlert, CircleCheck } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type SubmitEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/misc";
import { HONEYPOT_FIELD, submitNetlifyForm } from "@/config/forms";
import { cn } from "@/lib/utils";

export type SubmitStatus = "idle" | "submitting" | "success" | "error";

export const SUBMIT_ERROR_MESSAGE = "Couldn't submit right now. Please try again in a moment.";

export interface NetlifyFormConfig<F extends string> {
  name: string;
  fields: readonly F[];
}

/**
 * Submission state for a Netlify form built from uncontrolled inputs. Only the configured fields
 * (plus the honeypot) are sent, so the payload always matches the static form in index.html.
 */
export function useNetlifyForm<F extends string>(form: NetlifyFormConfig<F>) {
  const idPrefix = useId();
  const [status, setStatus] = useState<SubmitStatus>("idle");
  // A ref rather than state: two quick submits can land before React re-renders.
  const inFlight = useRef(false);

  /** id and name props for a field, typed to the form's field names. */
  const field = useCallback((name: F) => ({ id: `${idPrefix}${name}`, name }), [idPrefix]);

  const onSubmit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (inFlight.current) return;

      const formData = new FormData(event.currentTarget);
      const data: Record<string, string> = { [HONEYPOT_FIELD]: String(formData.get(HONEYPOT_FIELD) ?? "") };
      for (const name of form.fields) {
        data[name] = String(formData.get(name) ?? "").trim();
      }

      inFlight.current = true;
      setStatus("submitting");
      try {
        await submitNetlifyForm(form.name, data);
        setStatus("success");
      } catch {
        setStatus("error");
      } finally {
        inFlight.current = false;
      }
    },
    [form],
  );

  return { status, field, onSubmit };
}

/** Spam trap: hidden from people and assistive tech, left empty by real users. */
export function HoneypotField() {
  return (
    <div className="sr-only" aria-hidden="true">
      <label>
        Leave this field empty
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

/** Muted "(optional)" suffix for field labels. */
export function Optional() {
  return <span className="font-normal text-slate-500"> (optional)</span>;
}

export interface FormStatusMessageProps {
  status: SubmitStatus;
  successMessage: string;
  errorMessage?: string;
}

/**
 * The live region that announces every state change. Keep it mounted for the form's whole life
 * (outside the <form>, which is swapped for a success panel) so announcements are not lost.
 * Only the error is shown visually; the button and success panel cover the other states.
 */
export function FormStatusMessage({ status, successMessage, errorMessage = SUBMIT_ERROR_MESSAGE }: FormStatusMessageProps) {
  const message =
    status === "submitting" ? "Sending your details…" : status === "success" ? successMessage : status === "error" ? errorMessage : "";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        status === "error"
          ? "mt-4 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-inset ring-rose-200"
          : "sr-only",
      )}
    >
      {status === "error" ? <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : null}
      <span>{message}</span>
    </div>
  );
}

export interface SubmitButtonProps {
  submitting: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Stays focusable while sending (aria-disabled instead of disabled) so keyboard focus is not
 * dropped to the page; useNetlifyForm ignores repeat submits.
 */
export function SubmitButton({ submitting, children, className }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      size="lg"
      aria-disabled={submitting || undefined}
      className={cn("w-full sm:w-auto", submitting && "cursor-wait opacity-80", className)}
    >
      {submitting ? (
        <>
          <Spinner className="size-4 text-white" />
          Sending…
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export interface FormSuccessProps {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}

/** Replaces a submitted form. Takes focus on mount so keyboard users are not left on a removed button. */
export function FormSuccess({ title, children, action }: FormSuccessProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">
        <CircleCheck className="size-6" aria-hidden="true" />
      </span>
      <h3 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-slate-900 outline-none">
        {title}
      </h3>
      <div className="max-w-sm text-sm leading-relaxed text-slate-600">{children}</div>
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
