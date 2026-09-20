import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { QUALITY_CHECK_KEYS, QUALITY_CHECK_LABELS } from "@/lib/assessment/qualityChecks";
import type { PublicShareReport } from "./publicReport";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 28;

const WHITE = rgb(1, 1, 1);
const SLATE_50 = rgb(248 / 255, 250 / 255, 252 / 255);
const SLATE_100 = rgb(241 / 255, 245 / 255, 249 / 255);
const SLATE_200 = rgb(226 / 255, 232 / 255, 240 / 255);
const SLATE_400 = rgb(148 / 255, 163 / 255, 184 / 255);
const SLATE_500 = rgb(100 / 255, 116 / 255, 139 / 255);
const SLATE_700 = rgb(51 / 255, 65 / 255, 85 / 255);
const SLATE_800 = rgb(30 / 255, 41 / 255, 59 / 255);
const SLATE_900 = rgb(15 / 255, 23 / 255, 42 / 255);
const BLUE_50 = rgb(239 / 255, 246 / 255, 255 / 255);
const BLUE_100 = rgb(219 / 255, 234 / 255, 254 / 255);
const BLUE_500 = rgb(59 / 255, 130 / 255, 246 / 255);
const BLUE_600 = rgb(37 / 255, 99 / 255, 235 / 255);
const BLUE_700 = rgb(29 / 255, 78 / 255, 216 / 255);
const EMERALD_50 = rgb(236 / 255, 253 / 255, 245 / 255);
const EMERALD_200 = rgb(167 / 255, 243 / 255, 208 / 255);
const EMERALD_600 = rgb(5 / 255, 150 / 255, 105 / 255);
const EMERALD_700 = rgb(4 / 255, 120 / 255, 87 / 255);
const AMBER_50 = rgb(255 / 255, 251 / 255, 235 / 255);
const AMBER_200 = rgb(253 / 255, 230 / 255, 138 / 255);
const AMBER_500 = rgb(245 / 255, 158 / 255, 11 / 255);
const AMBER_600 = rgb(217 / 255, 119 / 255, 6 / 255);
const AMBER_700 = rgb(180 / 255, 83 / 255, 9 / 255);
const RED_50 = rgb(254 / 255, 242 / 255, 242 / 255);
const RED_200 = rgb(254 / 255, 202 / 255, 202 / 255);
const RED_500 = rgb(239 / 255, 68 / 255, 68 / 255);
const RED_600 = rgb(220 / 255, 38 / 255, 38 / 255);
const RED_700 = rgb(185 / 255, 28 / 255, 28 / 255);

const SCORE_ROWS = [
  { key: "skills_score", label: "Skills" },
  { key: "experience_score", label: "Experience" },
  { key: "years_score", label: "Projects" },
  { key: "education_score", label: "Education" },
  { key: "achievements_score", label: "Achievements" },
  { key: "keyword_score", label: "Focus skills" },
] as const;

function winAnsi(text: string): string {
  return text
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readiness(score: number): { label: string; fill: RGB; border: RGB; text: RGB } {
  if (score >= 75) {
    return { label: "Ready", fill: EMERALD_50, border: EMERALD_200, text: EMERALD_700 };
  }
  if (score >= 50) {
    return { label: "Developing", fill: AMBER_50, border: AMBER_200, text: AMBER_700 };
  }
  return { label: "Needs work", fill: RED_50, border: RED_200, text: RED_700 };
}

function bannerColor(score: number): RGB {
  if (score >= 75) return EMERALD_600;
  if (score >= 50) return AMBER_500;
  return RED_500;
}

function scoreTone(score: number): { text: RGB; bar: RGB } {
  if (score >= 80) return { text: EMERALD_700, bar: EMERALD_600 };
  if (score >= 65) return { text: BLUE_700, bar: BLUE_500 };
  if (score >= 50) return { text: AMBER_700, bar: AMBER_600 };
  return { text: RED_600, bar: RED_500 };
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const cleaned = winAnsi(text);
  if (!cleaned) return [];
  const words = cleaned.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      current = word;
    } else {
      let chunk = "";
      for (const ch of word) {
        const trial = chunk + ch;
        if (font.widthOfTextAtSize(trial, size) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk = trial;
        }
      }
      current = chunk;
    }
  }
  if (current) lines.push(current);
  return lines;
}

type Painter = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
  institution: string;
};

function addPage(p: Painter) {
  p.page = p.doc.addPage([PAGE_W, PAGE_H]);
  p.page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: SLATE_50 });
  p.page.drawRectangle({ x: 0, y: PAGE_H - 36, width: PAGE_W, height: 36, color: WHITE });
  p.page.drawLine({
    start: { x: 0, y: PAGE_H - 36 },
    end: { x: PAGE_W, y: PAGE_H - 36 },
    thickness: 1,
    color: SLATE_200,
  });
  p.page.drawText("Caliber", {
    x: MARGIN,
    y: PAGE_H - 24,
    size: 10,
    font: p.bold,
    color: SLATE_900,
  });
  const continued = p.institution ? `${p.institution}  |  Continued` : "Continued";
  p.page.drawText(winAnsi(continued), {
    x: MARGIN + 52,
    y: PAGE_H - 24,
    size: 9,
    font: p.font,
    color: SLATE_500,
  });
  p.y = PAGE_H - 52;
}

function ensure(p: Painter, height: number) {
  if (p.y - height < FOOTER_Y + 22) {
    addPage(p);
  }
}

function drawFooter(p: Painter) {
  const pages = p.doc.getPages();
  const brand = p.institution ? `${p.institution}  |  Caliber` : "Caliber";
  const note = "Career-readiness feedback, not a hiring decision";
  pages.forEach((page, index) => {
    page.drawLine({
      start: { x: MARGIN, y: 42 },
      end: { x: PAGE_W - MARGIN, y: 42 },
      thickness: 0.6,
      color: SLATE_200,
    });
    page.drawText(winAnsi(brand), {
      x: MARGIN,
      y: FOOTER_Y,
      size: 8,
      font: p.font,
      color: SLATE_500,
    });
    const pageLabel = `${index + 1} / ${pages.length}`;
    const pageW = p.font.widthOfTextAtSize(pageLabel, 8);
    page.drawText(pageLabel, {
      x: PAGE_W - MARGIN - pageW,
      y: FOOTER_Y,
      size: 8,
      font: p.font,
      color: SLATE_400,
    });
    page.drawText(note, {
      x: MARGIN,
      y: FOOTER_Y - 11,
      size: 7,
      font: p.font,
      color: SLATE_400,
    });
  });
}

function card(p: Painter, height: number, opts?: { fill?: RGB }) {
  ensure(p, height);
  const y = p.y - height;
  p.page.drawRectangle({
    x: MARGIN,
    y,
    width: CONTENT_W,
    height,
    color: opts?.fill ?? WHITE,
    borderColor: SLATE_200,
    borderWidth: 1,
  });
  return y;
}

function drawHeader(p: Painter) {
  p.page.drawRectangle({ x: 0, y: PAGE_H - 72, width: PAGE_W, height: 72, color: WHITE });
  p.page.drawLine({
    start: { x: 0, y: PAGE_H - 72 },
    end: { x: PAGE_W, y: PAGE_H - 72 },
    thickness: 1,
    color: SLATE_200,
  });
  p.page.drawRectangle({ x: MARGIN, y: PAGE_H - 58, width: 28, height: 28, color: BLUE_600 });
  const mark = "C";
  const markW = p.bold.widthOfTextAtSize(mark, 14);
  p.page.drawText(mark, {
    x: MARGIN + (28 - markW) / 2,
    y: PAGE_H - 50,
    size: 14,
    font: p.bold,
    color: WHITE,
  });
  p.page.drawText("Caliber", {
    x: MARGIN + 38,
    y: PAGE_H - 42,
    size: 13,
    font: p.bold,
    color: SLATE_900,
  });
  const subtitle = p.institution ? `${p.institution}  |  Student CV report` : "Student CV report";
  p.page.drawText(winAnsi(subtitle), {
    x: MARGIN + 38,
    y: PAGE_H - 56,
    size: 9,
    font: p.font,
    color: SLATE_500,
  });
  p.y = PAGE_H - 88;
}

function drawHero(p: Painter, report: PublicShareReport) {
  const score = report.score ?? 0;
  const rec = readiness(score);
  const kicker = winAnsi(
    [report.goalCode, report.goalTitle ? `GRADED AGAINST ${report.goalTitle.toUpperCase()}` : ""]
      .filter(Boolean)
      .join("  ·  "),
  );
  const nameLines = wrap(p.bold, report.candidateName || "Student", 22, CONTENT_W - 140);
  if (!nameLines.length) nameLines.push("Student");
  const fileLines = wrap(p.font, report.fileName || "", 9, CONTENT_W - 140);
  const height = 28 + nameLines.length * 26 + (fileLines.length ? 14 : 0) + 58;
  ensure(p, height);
  const y = p.y - height;
  p.page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height, color: bannerColor(score) });

  let textY = p.y - 22;
  if (kicker) {
    p.page.drawText(kicker, { x: MARGIN + 18, y: textY, size: 8, font: p.bold, color: rgb(1, 1, 1) });
    textY -= 22;
  }
  for (const line of nameLines) {
    p.page.drawText(line, { x: MARGIN + 18, y: textY, size: 22, font: p.bold, color: WHITE });
    textY -= 24;
  }
  for (const line of fileLines) {
    p.page.drawText(line, { x: MARGIN + 18, y: textY + 6, size: 9, font: p.font, color: rgb(1, 1, 1) });
    textY -= 12;
  }

  const pill = rec.label;
  const pillW = p.bold.widthOfTextAtSize(pill, 10) + 20;
  const pillY = y + (report.grade ? 34 : 18);
  p.page.drawRectangle({
    x: MARGIN + 18,
    y: pillY,
    width: pillW,
    height: 20,
    color: rec.fill,
    borderColor: rec.border,
    borderWidth: 1,
  });
  p.page.drawText(pill, { x: MARGIN + 28, y: pillY + 6, size: 10, font: p.bold, color: rec.text });
  if (report.grade) {
    p.page.drawText(`Grade ${winAnsi(report.grade)}`, {
      x: MARGIN + 18,
      y: y + 18,
      size: 11,
      font: p.bold,
      color: WHITE,
    });
  }

  const scoreLabel = String(score);
  const scoreW = p.bold.widthOfTextAtSize(scoreLabel, 36);
  p.page.drawText(scoreLabel, {
    x: PAGE_W - MARGIN - 22 - scoreW,
    y: y + 28,
    size: 36,
    font: p.bold,
    color: WHITE,
  });
  const unit = "/100 goal grade";
  const unitW = p.font.widthOfTextAtSize(unit, 8);
  p.page.drawText(unit, {
    x: PAGE_W - MARGIN - 22 - unitW,
    y: y + 16,
    size: 8,
    font: p.font,
    color: rgb(1, 1, 1),
  });

  p.y = y - 14;
}

function drawSectionTitle(p: Painter, title: string) {
  p.page.drawText(winAnsi(title).toUpperCase(), {
    x: MARGIN + 16,
    y: p.y,
    size: 8,
    font: p.bold,
    color: SLATE_500,
  });
}

function drawAssessment(p: Painter, reason: string) {
  const lines = wrap(p.font, reason, 10, CONTENT_W - 32);
  if (!lines.length) return;
  const height = 38 + lines.length * 14;
  const y = card(p, height);
  p.y = y + height - 18;
  drawSectionTitle(p, "Assessment");
  p.y -= 16;
  for (const line of lines) {
    p.page.drawText(line, { x: MARGIN + 16, y: p.y, size: 10, font: p.font, color: SLATE_800 });
    p.y -= 14;
  }
  p.y = y - 14;
}

function drawQuality(p: Painter, report: PublicShareReport) {
  if (!report.qualityChecks) return;
  const inset = 16;
  const gap = 8;
  const cols = 5;
  const cardW = (CONTENT_W - inset * 2 - gap * (cols - 1)) / cols;
  const evidenceLines = QUALITY_CHECK_KEYS.map((key) =>
    wrap(p.font, report.qualityChecks?.[key]?.evidence || "", 7.5, cardW - 16).slice(0, 3),
  );
  const maxEvidence = Math.max(...evidenceLines.map((lines) => lines.length), 1);
  const innerH = 78 + maxEvidence * 10;
  const height = 48 + innerH;
  ensure(p, height);
  const y = card(p, height);
  p.page.drawText("PRESENTATION & ATS CHECKS", {
    x: MARGIN + 16,
    y: y + height - 22,
    size: 8,
    font: p.bold,
    color: SLATE_500,
  });
  p.page.drawText("Each check is scored 0-100.", {
    x: MARGIN + 16,
    y: y + height - 34,
    size: 8,
    font: p.font,
    color: SLATE_400,
  });
  if (report.qualityAverage != null) {
    const avg = `Avg  ${report.qualityAverage}`;
    const avgW = p.bold.widthOfTextAtSize(avg, 11);
    p.page.drawText(avg, {
      x: PAGE_W - MARGIN - 16 - avgW,
      y: y + height - 28,
      size: 11,
      font: p.bold,
      color: SLATE_800,
    });
  }

  QUALITY_CHECK_KEYS.forEach((key, i) => {
    const item = report.qualityChecks![key];
    const tone = scoreTone(item.score);
    const x = MARGIN + inset + i * (cardW + gap);
    const boxY = y + 12;
    p.page.drawRectangle({
      x,
      y: boxY,
      width: cardW,
      height: innerH - 8,
      color: SLATE_50,
    });
    p.page.drawText(QUALITY_CHECK_LABELS[key].toUpperCase(), {
      x: x + 8,
      y: boxY + innerH - 26,
      size: 7,
      font: p.bold,
      color: SLATE_500,
    });
    p.page.drawText(String(item.score), {
      x: x + 8,
      y: boxY + innerH - 50,
      size: 22,
      font: p.bold,
      color: tone.text,
    });
    p.page.drawRectangle({
      x: x + 8,
      y: boxY + innerH - 62,
      width: cardW - 16,
      height: 4,
      color: SLATE_200,
    });
    p.page.drawRectangle({
      x: x + 8,
      y: boxY + innerH - 62,
      width: ((cardW - 16) * Math.max(0, Math.min(100, item.score))) / 100,
      height: 4,
      color: tone.bar,
    });
    evidenceLines[i]?.slice(0, 3).forEach((line, li) => {
      p.page.drawText(line, {
        x: x + 8,
        y: boxY + innerH - 78 - li * 10,
        size: 7.5,
        font: p.font,
        color: SLATE_500,
      });
    });
  });
  p.y = y - 14;
}

function drawBreakdown(p: Painter, report: PublicShareReport) {
  if (!report.scores) return;
  const height = 36 + SCORE_ROWS.length * 22;
  const y = card(p, height);
  p.page.drawText("SCORE BREAKDOWN", {
    x: MARGIN + 16,
    y: y + height - 22,
    size: 8,
    font: p.bold,
    color: SLATE_500,
  });
  SCORE_ROWS.forEach((row, i) => {
    const value = report.scores?.[row.key] ?? 0;
    const rowY = y + height - 48 - i * 22;
    p.page.drawText(row.label, { x: MARGIN + 16, y: rowY, size: 9, font: p.font, color: SLATE_700 });
    const barX = MARGIN + 120;
    const barW = CONTENT_W - 168;
    p.page.drawRectangle({ x: barX, y: rowY - 1, width: barW, height: 8, color: SLATE_100 });
    p.page.drawRectangle({
      x: barX,
      y: rowY - 1,
      width: (barW * Math.max(0, Math.min(100, value))) / 100,
      height: 8,
      color: BLUE_500,
    });
    const num = String(value);
    p.page.drawText(num, {
      x: PAGE_W - MARGIN - 16 - p.bold.widthOfTextAtSize(num, 9),
      y: rowY,
      size: 9,
      font: p.bold,
      color: SLATE_800,
    });
  });
  p.y = y - 14;
}

function drawListCard(p: Painter, title: string, items: string[], x: number, width: number) {
  const wrapped = items.slice(0, 6).map((item) => wrap(p.font, item, 9, width - 28));
  const lines = wrapped.reduce((n, w) => n + Math.max(1, w.length), 0);
  const height = 32 + lines * 13 + wrapped.length * 6;
  ensure(p, height);
  const y = p.y - height;
  p.page.drawRectangle({
    x,
    y,
    width,
    height,
    color: WHITE,
    borderColor: SLATE_200,
    borderWidth: 1,
  });
  p.page.drawText(title.toUpperCase(), {
    x: x + 12,
    y: y + height - 20,
    size: 8,
    font: p.bold,
    color: SLATE_500,
  });
  let textY = y + height - 36;
  wrapped.forEach((itemLines) => {
    itemLines.forEach((line, i) => {
      p.page.drawText(i === 0 ? `- ${line}` : `  ${line}`, {
        x: x + 12,
        y: textY,
        size: 9,
        font: p.font,
        color: SLATE_700,
      });
      textY -= 13;
    });
    textY -= 4;
  });
  return { y, height };
}

function drawStrengthsGaps(p: Painter, report: PublicShareReport) {
  const hasH = report.highlights.length > 0;
  const hasG = report.redFlags.length > 0;
  if (!hasH && !hasG) return;
  const gap = 12;
  const colW = hasH && hasG ? (CONTENT_W - gap) / 2 : CONTENT_W;
  if (hasH && hasG) {
    const left = drawListCard(p, "Strengths", report.highlights, MARGIN, colW);
    const right = drawListCard(p, "Gaps", report.redFlags, MARGIN + colW + gap, colW);
    p.y = Math.min(left.y, right.y) - 14;
    return;
  }
  const box = hasH
    ? drawListCard(p, "Strengths", report.highlights, MARGIN, colW)
    : drawListCard(p, "Gaps", report.redFlags, MARGIN, colW);
  p.y = box.y - 14;
}

function drawChips(p: Painter, title: string, matched: string[], missing: string[]) {
  const chips = [
    ...matched.map((label) => ({ label: winAnsi(label), kind: "match" as const })),
    ...missing.map((label) => ({ label: winAnsi(label), kind: "miss" as const })),
  ].filter((c) => c.label);
  const rows: typeof chips[] = [];
  let row: typeof chips = [];
  let rowW = 0;
  for (const chip of chips) {
    const w = p.font.widthOfTextAtSize(chip.label, 8) + 16;
    if (rowW + w > CONTENT_W - 28 && row.length) {
      rows.push(row);
      row = [chip];
      rowW = w + 6;
    } else {
      row.push(chip);
      rowW += w + 6;
    }
  }
  if (row.length) rows.push(row);
  const height = 40 + Math.max(rows.length, 1) * 22;
  const y = card(p, height);
  p.page.drawText(title.toUpperCase(), {
    x: MARGIN + 16,
    y: y + height - 20,
    size: 8,
    font: p.bold,
    color: SLATE_500,
  });
  if (!chips.length) {
    p.page.drawText("No skills listed", {
      x: MARGIN + 16,
      y: y + height - 40,
      size: 9,
      font: p.font,
      color: SLATE_400,
    });
    p.y = y - 14;
    return;
  }
  let chipY = y + height - 48;
  for (const line of rows) {
    let x = MARGIN + 16;
    for (const chip of line) {
      const w = p.font.widthOfTextAtSize(chip.label, 8) + 16;
      const fill = chip.kind === "match" ? BLUE_50 : RED_50;
      const border = chip.kind === "match" ? BLUE_100 : RED_200;
      const text = chip.kind === "match" ? BLUE_700 : RED_700;
      p.page.drawRectangle({
        x,
        y: chipY - 2,
        width: w,
        height: 16,
        color: fill,
        borderColor: border,
        borderWidth: 0.8,
      });
      p.page.drawText(chip.label, { x: x + 8, y: chipY + 2, size: 8, font: p.bold, color: text });
      x += w + 6;
    }
    chipY -= 22;
  }
  p.y = y - 14;
}

function drawRecommendations(p: Painter, report: PublicShareReport) {
  if (!report.recommendations.length) return;
  ensure(p, 20);
  p.page.drawText("RECOMMENDATIONS", {
    x: MARGIN,
    y: p.y,
    size: 8,
    font: p.bold,
    color: SLATE_500,
  });
  p.y -= 14;
  report.recommendations.slice(0, 6).forEach((item, i) => {
    const title = wrap(p.bold, `${i + 1}. ${item.title}`, 11, CONTENT_W - 32);
    const detail = wrap(p.font, item.detail || "", 9, CONTENT_W - 32);
    const height = 36 + title.length * 14 + detail.length * 12;
    const y = card(p, height);
    p.page.drawText(winAnsi(item.priority || "note").toUpperCase(), {
      x: MARGIN + 16,
      y: y + height - 18,
      size: 8,
      font: p.bold,
      color: BLUE_600,
    });
    let textY = y + height - 34;
    for (const line of title) {
      p.page.drawText(line, { x: MARGIN + 16, y: textY, size: 11, font: p.bold, color: SLATE_800 });
      textY -= 14;
    }
    for (const line of detail) {
      p.page.drawText(line, { x: MARGIN + 16, y: textY, size: 9, font: p.font, color: SLATE_500 });
      textY -= 12;
    }
    p.y = y - 10;
  });
}

export async function buildStudentReportPdf(report: PublicShareReport): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const painter: Painter = {
    doc,
    page: doc.addPage([PAGE_W, PAGE_H]),
    font,
    bold,
    y: PAGE_H - 88,
    institution: winAnsi(report.institutionName || ""),
  };
  painter.page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: SLATE_50 });
  drawHeader(painter);
  drawHero(painter, report);
  if (report.reason) drawAssessment(painter, report.reason);
  drawQuality(painter, report);
  drawBreakdown(painter, report);
  drawStrengthsGaps(painter, report);
  drawChips(painter, "Skills", report.matchedSkills, report.missingSkills);
  drawRecommendations(painter, report);
  drawFooter(painter);
  return doc.save();
}
