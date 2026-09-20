/** Platform SaaS admins — only these emails can open /admin. */
export const PLATFORM_ADMIN_EMAILS = [
  "nimish.khandelwal25@gmail.com",
  "nimish.khandelwal2592@gmail.com",
] as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPlatformAdminEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return PLATFORM_ADMIN_EMAILS.some((e) => e === normalized);
}
