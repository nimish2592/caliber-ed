function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ");
}

function wrapTextLines(text: string, maxLen = 92): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxLen) {
        if (current) lines.push(current);
        current = word.length > maxLen ? word.slice(0, maxLen) : word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

/** Minimal multi-page PDF from plain text. */
export function buildTextPdfBytes(text: string, linesPerPage = 55): Uint8Array {
  const allLines = wrapTextLines(text);
  const pageGroups: string[][] = [];
  for (let offset = 0; offset < allLines.length; offset += linesPerPage) {
    pageGroups.push(allLines.slice(offset, offset + linesPerPage));
  }
  if (pageGroups.length === 0) {
    pageGroups.push(["No content available."]);
  }

  const pageCount = pageGroups.length;
  const fontId = 3 + pageCount * 2;
  const objectBodies: string[] = new Array(fontId);

  objectBodies[0] = "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj";
  const kids = Array.from({ length: pageCount }, (_, i) => `${3 + i * 2} 0 R`).join(" ");
  objectBodies[1] = `2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>endobj`;

  for (let i = 0; i < pageCount; i++) {
    const pageId = 3 + i * 2;
    const contentId = pageId + 1;
    const pageLines = pageGroups[i]!;
    const streamParts = ["BT", "/F1 10 Tf", "50 760 Td"];
    for (let j = 0; j < pageLines.length; j++) {
      if (j > 0) streamParts.push("0 -13 Td");
      streamParts.push(`(${escapePdfText(pageLines[j] ?? "")}) Tj`);
    }
    streamParts.push("ET");
    const stream = streamParts.join("\n");
    objectBodies[contentId - 1] =
      `${contentId} 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj`;
    objectBodies[pageId - 1] =
      `${pageId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>endobj`;
  }

  objectBodies[fontId - 1] =
    `${fontId} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objectBodies) {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${fontId + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${fontId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}
