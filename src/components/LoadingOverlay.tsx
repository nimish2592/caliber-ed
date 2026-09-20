"use client";

interface Props {
  message?: string;
  subMessage?: string;
}

export default function LoadingOverlay({ message = "Processing...", subMessage }: Props) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-800">{message}</p>
          {subMessage && (
            <p className="text-sm text-slate-500 mt-1">{subMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
