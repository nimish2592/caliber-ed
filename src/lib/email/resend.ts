import { Resend } from "resend";
import { appConfig } from "@/lib/config";

export function isResendConfigured(): boolean {
  return Boolean(appConfig.resendApiKey && appConfig.resendFromEmail);
}

export async function sendStudentReportEmail(params: {
  to: string;
  studentName: string;
  goalTitle: string;
  goalCode: string;
  institutionName: string;
  grade: string | null;
  score: number | null;
  shareUrl: string;
}): Promise<void> {
  if (!appConfig.resendApiKey) {
    throw new Error("Email is not configured. Set RESEND_API_KEY.");
  }
  if (!appConfig.resendFromEmail) {
    throw new Error("Email is not configured. Set RESEND_FROM_EMAIL.");
  }

  const resend = new Resend(appConfig.resendApiKey);
  const name = params.studentName.trim() || "Student";
  const campus = params.institutionName.trim() || "your campus";
  const goalLabel = [params.goalCode, params.goalTitle].filter(Boolean).join(" · ") || "career readiness";
  const scoreLine =
    params.score != null
      ? params.grade
        ? `Your goal grade is <strong>${params.grade}</strong> (${params.score}/100).`
        : `Your goal score is <strong>${params.score}/100</strong>.`
      : "Your career-readiness report is ready.";

  const { error } = await resend.emails.send({
    from: appConfig.resendFromEmail,
    to: params.to,
    subject: `${campus}: your CV report for ${params.goalTitle || "career readiness"}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; line-height: 1.5; max-width: 560px;">
        <p style="margin: 0 0 16px;">Hi ${escapeHtml(name)},</p>
        <p style="margin: 0 0 16px;">
          ${escapeHtml(campus)} reviewed your CV against <strong>${escapeHtml(goalLabel)}</strong>.
          ${scoreLine}
        </p>
        <p style="margin: 0 0 16px;">
          Open your shareable report (includes your score breakdown and CV download):
        </p>
        <p style="margin: 0 0 24px;">
          <a href="${escapeAttr(params.shareUrl)}"
             style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">
            View your report
          </a>
        </p>
        <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">
          Or copy this link:<br/>
          <a href="${escapeAttr(params.shareUrl)}" style="color:#2563eb;word-break:break-all;">${escapeHtml(params.shareUrl)}</a>
        </p>
        <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">
          Sent via Caliber for ${escapeHtml(campus)}. This is career-readiness feedback, not a hiring decision.
        </p>
      </div>
    `.trim(),
    text: [
      `Hi ${name},`,
      "",
      `${campus} reviewed your CV against ${goalLabel}.`,
      params.score != null
        ? params.grade
          ? `Your goal grade is ${params.grade} (${params.score}/100).`
          : `Your goal score is ${params.score}/100.`
        : "Your career-readiness report is ready.",
      "",
      `View your report (includes CV download):`,
      params.shareUrl,
      "",
      `Sent via Caliber for ${campus}.`,
    ].join("\n"),
  });

  if (error) {
    throw new Error(error.message || "Could not send email via Resend.");
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
