import { redirect } from "next/navigation";

export default async function EventRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/g/${slug}`);
}
