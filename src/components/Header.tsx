"use client";

import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  onBack?: () => void;
  backLabel?: string;
  rightContent?: ReactNode;
  title?: string;
  subtitle?: string;
}

/** Slim top bar for nested pages (sidebar handles main navigation). */
export default function Header({
  onBack,
  backLabel = "Back",
  rightContent,
  title,
  subtitle,
}: Props) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="px-6 h-14 flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">{backLabel}</span>
          </button>
        )}

        {(title || subtitle) && (
          <div className="min-w-0">
            {title && <h1 className="text-sm font-semibold text-slate-900 truncate">{title}</h1>}
            {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
          </div>
        )}

        <div className="flex-1" />

        {rightContent && <div className="flex-shrink-0">{rightContent}</div>}
      </div>
    </header>
  );
}
