import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "mammoth", "postgres", "pdfjs-dist", "unpdf", "resend"],
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
