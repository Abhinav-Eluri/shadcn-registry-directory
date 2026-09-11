import React from "react";
import { Sparkles } from "lucide-react";

interface HeroProps {
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
}

const POPULAR_CATEGORIES = [
  { id: "all", label: "All Components" },
  { id: "button", label: "Buttons & Actions" },
  { id: "card", label: "Cards & Bento" },
  { id: "dialog", label: "Dialogs & Modals" },
  { id: "chart", label: "Data & Charts" },
  { id: "nav", label: "Nav & Menus" },
  { id: "ai", label: "AI & Agents" },
  { id: "auth", label: "Auth & Login" },
  { id: "block", label: "Full Blocks" },
];

export const Hero: React.FC<HeroProps> = ({ activeCategory, onSelectCategory }) => {
  return (
    <div className="relative pt-12 pb-8 overflow-hidden text-center">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[280px] bg-indigo-500/10 blur-[120px] pointer-events-none -z-10 rounded-full" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[180px] bg-emerald-500/10 blur-[100px] pointer-events-none -z-10 rounded-full" />

      {/* Pill header */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-zinc-900/60 backdrop-blur-md text-xs text-zinc-300 mb-6 shadow-sm">
        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        <span>Discover alternative shadcn styles & implementations</span>
        <span className="text-zinc-600">•</span>
        <span className="text-emerald-400 font-medium">100% Live Validated</span>
      </div>

      {/* Main Title */}
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
        ComponentHub <br className="hidden sm:inline" />
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400">
          The Unified Shadcn Registry Directory
        </span>
      </h1>

      {/* Subtitle */}
      <p className="mt-4 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto font-normal">
        Instant search across 294 independent registries, verified HTTP 200 URLs, and direct 1-click CLI installation commands.
      </p>

      {/* Quick Category Badges */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto px-4">
        {POPULAR_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 border ${
                isActive
                  ? "bg-white text-zinc-950 border-white shadow-md shadow-white/10 scale-105"
                  : "bg-zinc-900/80 text-zinc-400 border-white/5 hover:border-white/20 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
