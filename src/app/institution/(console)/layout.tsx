import { redirect } from "next/navigation";

export default function InstitutionConsoleRedirect({ children }: { children: React.ReactNode }) {
  redirect("/");
}
