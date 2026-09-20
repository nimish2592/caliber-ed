/** Strip characters that break Postgres text/jsonb storage (e.g. null bytes, lone surrogates). */

export function sanitizeTextForDb(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\u0000/g, "")
    .replace(/[\uD800-\uDFFF]/g, "");
}

export function sanitizeStringArray(values: string[] | null | undefined): string[] {
  return (values ?? []).map((value) => sanitizeTextForDb(value));
}

export function sanitizeJsonValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return sanitizeTextForDb(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(sanitizeJsonValue);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeJsonValue(nested);
    }
    return out;
  }
  return value;
}

export function isUnicodeStorageError(error: { message?: string } | null): boolean {
  const msg = (error?.message ?? "").toLowerCase();
  return (
    msg.includes("unicode escape") ||
    msg.includes("invalid byte sequence") ||
    msg.includes("character with byte sequence") ||
    msg.includes("invalid input syntax for type json")
  );
}
