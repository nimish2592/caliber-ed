function fileNameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const utf = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1]);
    } catch {
      return utf[1];
    }
  }
  const ascii = header.match(/filename="([^"]+)"/i) || header.match(/filename=([^;]+)/i);
  return ascii?.[1]?.trim() || fallback;
}

export async function downloadFromApi(url: string, fallbackName = "download"): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Download failed.");
  }
  const blob = await res.blob();
  const fileName = fileNameFromDisposition(res.headers.get("Content-Disposition"), fallbackName);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
