import { gradeBadgeClass, letterGradeFromScore, type LetterGrade, LETTER_GRADES } from "@/lib/grading/letterGrade";

function asLetter(grade: string | null | undefined, score?: number | null): LetterGrade {
  if (grade && (LETTER_GRADES as readonly string[]).includes(grade)) return grade as LetterGrade;
  return letterGradeFromScore(score ?? 0);
}

export default function GradeBadge({
  grade,
  score,
  size = "md",
}: {
  grade?: string | null;
  score?: number | null;
  size?: "sm" | "md";
}) {
  const letter = asLetter(grade, score);
  const compact = size === "sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold ${gradeBadgeClass(letter)} ${
        compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      }`}
      title={score != null ? `Grade ${letter} · ${score}/100` : `Grade ${letter}`}
    >
      {letter}
      {score != null && <span className={`font-semibold opacity-80 ${compact ? "text-[10px]" : "text-xs"}`}>{score}</span>}
    </span>
  );
}
