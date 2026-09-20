import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Caliber — Higher education career readiness",
  description:
    "Score student CVs against campus goals. Students scan a QR code or staff upload CVs for internship and placement readiness.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className={`${inter.className} min-h-full bg-slate-50 text-slate-900`}>{children}</body>
    </html>
  );
}
