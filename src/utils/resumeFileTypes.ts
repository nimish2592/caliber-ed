/** Resume/CV upload extensions supported across portal upload and Drive sync. */

export const RESUME_UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const RESUME_UPLOAD_LABEL = "PDF, DOC, or DOCX";

const RESUME_EXT_RE = /\.(pdf|docx?)$/i;

export function isResumeUploadFileName(fileName: string): boolean {
  return RESUME_EXT_RE.test(fileName.trim());
}

export function isResumeUploadFile(file: File): boolean {
  return isResumeUploadFileName(file.name);
}

export function resumeExtensionFromFileName(fileName: string): ".pdf" | ".doc" | ".docx" {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".docx")) return ".docx";
  if (lower.endsWith(".doc")) return ".doc";
  return ".pdf";
}

export function mimeTypeForResumeFileName(fileName: string): string {
  const ext = resumeExtensionFromFileName(fileName);
  if (ext === ".docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (ext === ".doc") return "application/msword";
  return "application/pdf";
}

export function filterResumeUploadFiles(files: FileList | File[]): {
  accepted: File[];
  skipped: number;
} {
  const incoming = Array.from(files);
  const accepted = incoming.filter(isResumeUploadFile);
  return { accepted, skipped: incoming.length - accepted.length };
}
