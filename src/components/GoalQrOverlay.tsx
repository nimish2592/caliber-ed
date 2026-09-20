"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSearch, Maximize, Minimize, X } from "lucide-react";

export default function GoalQrOverlay({
  goalId,
  goalTitle,
  onClose,
}: {
  goalId: string;
  goalTitle: string;
  onClose?: () => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  const close = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    window.close();
    window.location.assign(`/goals/${goalId}`);
  }, [goalId, onClose]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen();
  }

  return (
    <div className="fixed inset-0 z-50 h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 flex-shrink-0">
            <FileSearch className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-none">Caliber</p>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{goalTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 pb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Scan to upload your CV</p>
        <h1 className="mt-2 max-w-3xl text-2xl sm:text-4xl font-bold">{goalTitle}</h1>
        <p className="mt-2 text-slate-400 text-sm max-w-md">
          Point your camera at this code. Your CV is scored against this campus goal.
        </p>
        <div className="mt-5 bg-white rounded-3xl p-4 sm:p-6 shadow-2xl shadow-blue-950/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/goals/${goalId}/qr?inline=1`}
            alt={`QR code for ${goalTitle}`}
            className="w-[min(58vmin,26rem)] h-[min(58vmin,26rem)] object-contain"
          />
        </div>
      </main>
    </div>
  );
}
