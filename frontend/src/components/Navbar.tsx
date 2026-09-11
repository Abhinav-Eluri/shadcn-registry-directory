import React from "react";
import { ShieldCheck, Layers } from "lucide-react";

interface NavbarProps {
  activeView: "search" | "a2z";
  onViewChange: (view: "search" | "a2z") => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onViewChange,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-950 border border-white/15 flex items-center justify-center shadow-inner">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white tracking-tight text-base">ComponentHub</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Verified
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">Unified Registry & Component Explorer</p>
          </div>
        </div>

        {/* View Switcher Tabs: Search (First tab) vs A-Z Directory (Second tab) */}
        <div className="flex items-center bg-zinc-900/90 border border-white/10 rounded-xl p-1 shadow-inner">
          <button
            type="button"
            onClick={() => onViewChange("search")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === "search"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => onViewChange("a2z")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeView === "a2z"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>A-Z Directory</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-200">
              A → Z
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
