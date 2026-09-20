"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Loader2, X } from "lucide-react";
import { downloadFromApi } from "@/utils/downloadFromApi";

export default function TextViewerModal({
  title,
  subtitle,
  text,
  onClose,
  downloadUrl,
  downloadFileName,
}: {
  title: string;
  subtitle?: string;
  text: string;
  onClose: () => void;
  downloadUrl?: string;
  downloadFileName?: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const downloadOriginal = async () => {
    if (!downloadUrl) return;
    setDownloading(true);
    setDownloadError("");
    try {
      await downloadFromApi(downloadUrl, downloadFileName || "download");
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  const downloadTxt = () => {
    const blob = new Blob([text || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(downloadFileName || title || "document").replace(/\.[^.]+$/, "")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <h2 className="text-sm font-semibold text-slate-900 truncate">{title}</h2>
            </div>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {downloadUrl && (
              <button
                type="button"
                onClick={() => void downloadOriginal()}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-700 text-xs font-medium rounded-lg"
              >
                {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Download
              </button>
            )}
            {text?.trim() && (
              <button
                type="button"
                onClick={downloadTxt}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
              >
                .txt
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {downloadError && (
          <p className="px-6 py-2 text-xs text-red-700 bg-red-50 border-b border-red-100">{downloadError}</p>
        )}
        <pre className="flex-1 overflow-y-auto p-6 text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
          {text || "No extracted text."}
        </pre>
      </div>
    </div>
  );
}
