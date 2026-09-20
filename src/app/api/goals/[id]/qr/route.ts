import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth/session";
import { appConfig } from "@/lib/config";
import { getGoalById } from "@/lib/db/queries";
import { downloadFileName, fileDownloadResponse } from "@/lib/files/http";

export const runtime = "nodejs";

const PNG_SIZE = 2048;
const QR_COLOR = { dark: "#0f172a", light: "#ffffff" };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const goal = await getGoalById(id, session.institutionId);
  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const url = `${appConfig.appUrl}/g/${goal.public_slug}`;
  const search = new URL(request.url).searchParams;
  const format = search.get("format") === "svg" ? "svg" : "png";
  const inline = search.get("inline") === "1";
  const base = downloadFileName(`${goal.goal_code}-student-qr`);
  const disposition = inline
    ? `inline; filename="${base}.${format}"`
    : `attachment; filename="${base}.${format}"`;

  if (format === "svg") {
    const svg = await QRCode.toString(url, {
      type: "svg",
      margin: 2,
      width: PNG_SIZE,
      color: QR_COLOR,
      errorCorrectionLevel: "H",
    });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const png = await QRCode.toBuffer(url, {
    type: "png",
    margin: 2,
    width: PNG_SIZE,
    color: QR_COLOR,
    errorCorrectionLevel: "H",
  });

  if (inline) {
    return new NextResponse(Buffer.from(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  return fileDownloadResponse({
    bytes: new Uint8Array(png),
    fileName: `${base}.png`,
    mimeType: "image/png",
  });
}
