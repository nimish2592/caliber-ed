import SharedReportClient from "@/components/SharedReportClient";

export default async function SharedCvPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedReportClient token={token} />;
}
