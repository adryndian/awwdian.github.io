// src/components/chat/CostToast.tsx
"use client";

interface CostToastProps {
  cost: number;
}

export function CostToast({ cost }: CostToastProps) {
  return (
    <div className="fixed bottom-24 right-4 z-50 animate-slide-up">
      <div
        className="
          flex items-center gap-2 px-3 py-2
          bg-black/80 backdrop-blur-xl
          border border-orange-500/15 rounded-xl
          shadow-lg shadow-black/30
        "
      >
        <div className="w-5 h-5 rounded-md bg-orange-500/15 flex items-center justify-center">
          <svg
            className="w-3 h-3 text-orange-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <p className="text-[10px] text-white/40 leading-none">Estimasi biaya</p>
          <p className="text-xs font-semibold text-orange-400 mt-0.5">
            ${cost.toFixed(6)}
          </p>
        </div>
      </div>
    </div>
  );
}