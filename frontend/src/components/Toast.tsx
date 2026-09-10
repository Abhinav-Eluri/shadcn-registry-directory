import React from "react";
import { CheckCircle2 } from "lucide-react";

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-emerald-500/30 text-white shadow-2xl shadow-black/80 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-semibold text-white">CLI Command Copied!</p>
        <p className="text-[11px] font-mono text-zinc-400 truncate max-w-xs">{message}</p>
      </div>
    </div>
  );
};
