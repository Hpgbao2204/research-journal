"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MockDataNotice } from "@/components/mock-data-notice";
import { MAX_ABSTRACT_LENGTH } from "@/lib/schemas";

/**
 * Client-side form schema. Keywords/indexing are entered as comma-separated
 * text and split before submission. Mirrors AnalyzeRequestSchema constraints.
 */
const FormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  abstract: z
    .string()
    .trim()
    .min(1, "Abstract is required")
    .max(MAX_ABSTRACT_LENGTH, `Abstract must be at most ${MAX_ABSTRACT_LENGTH} characters`),
  keywords: z.string().optional(),
  field: z.string().optional(),
  preferredVenueType: z.enum(["", "JOURNAL", "CONFERENCE", "SPECIAL_ISSUE"]).optional(),
  preferredIndexing: z.string().optional(),
  openAccess: z.enum(["", "true", "false"]).optional(),
});

type FormValues = z.infer<typeof FormSchema>;

function splitList(s: string | undefined): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function AnalyzePage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { preferredVenueType: "", openAccess: "" },
  });

  const abstractValue = watch("abstract") ?? "";

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const payload = {
      title: values.title,
      abstract: values.abstract,
      keywords: splitList(values.keywords),
      field: values.field?.trim() || undefined,
      preferredVenueType: values.preferredVenueType || undefined,
      preferredIndexing: splitList(values.preferredIndexing),
      openAccess:
        values.openAccess === "true" ? true : values.openAccess === "false" ? false : undefined,
    };

    try {
      const res = await fetch("/api/analyze-abstract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error === "validation"
            ? "Please check your inputs."
            : "Analysis failed. Please try again.",
        );
      }
      const result = (await res.json()) as { id: string };
      router.push(`/recommendations/${result.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Analysis failed.");
    }
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Analyze your abstract</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Paste your title and abstract. PaperScout matches them against the
          venues in its database and recommends where to submit. Works without an
          AI key using a deterministic rule-based matcher.
        </p>
      </div>

      <MockDataNotice />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Field label="Paper title" error={errors.title?.message} required>
          <input
            {...register("title")}
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            placeholder="e.g. Communication-Efficient Federated Learning"
          />
        </Field>

        <Field
          label="Abstract"
          error={errors.abstract?.message}
          required
          hint={`${abstractValue.length}/${MAX_ABSTRACT_LENGTH}`}
        >
          <textarea
            {...register("abstract")}
            rows={8}
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            placeholder="Paste your abstract here…"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Keywords (comma-separated)" error={errors.keywords?.message}>
            <input
              {...register("keywords")}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              placeholder="federated learning, privacy"
            />
          </Field>

          <Field label="Research field" error={errors.field?.message}>
            <input
              {...register("field")}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              placeholder="Machine Learning"
            />
          </Field>

          <Field label="Preferred venue type">
            <select
              {...register("preferredVenueType")}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              <option value="JOURNAL">Journal</option>
              <option value="CONFERENCE">Conference</option>
              <option value="SPECIAL_ISSUE">Special issue</option>
            </select>
          </Field>

          <Field label="Preferred indexing (comma-separated)">
            <input
              {...register("preferredIndexing")}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              placeholder="Scopus, IEEE"
            />
          </Field>

          <Field label="Open access preference">
            <select
              {...register("openAccess")}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            >
              <option value="">No preference</option>
              <option value="true">Open access</option>
              <option value="false">Subscription</option>
            </select>
          </Field>
        </div>

        {submitError && (
          <p className="rounded-[var(--radius)] border border-[var(--warning)] bg-[var(--warning-bg)] px-3 py-2 text-sm text-[var(--warning)]">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-fit rounded-[var(--radius)] bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-60"
        >
          {isSubmitting ? "Analyzing…" : "Get recommendations"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  error,
  required,
  hint,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-sm font-medium">
        <span>
          {label}
          {required && <span className="text-[var(--warning)]"> *</span>}
        </span>
        {hint && <span className="text-xs text-[var(--muted-foreground)]">{hint}</span>}
      </span>
      {children}
      {error && <span className="text-xs text-[var(--warning)]">{error}</span>}
    </label>
  );
}
