import React from "react";
import { Search, X, Filter, CheckCircle2, SlidersHorizontal, RotateCcw } from "lucide-react";

interface SearchAndFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedRegistry: string;
  onRegistryChange: (reg: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  verifiedOnly: boolean;
  onVerifiedToggle: (v: boolean) => void;
  searchInDescription: boolean;
  onSearchInDescriptionChange: (v: boolean) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  registriesList: string[];
  typesList: string[];
  resultsCount: number;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedRegistry,
  onRegistryChange,
  selectedType,
  onTypeChange,
  verifiedOnly,
  onVerifiedToggle,
  searchInDescription,
  onSearchInDescriptionChange,
  sortBy,
  onSortChange,
  registriesList,
  typesList,
  resultsCount,
  onResetFilters,
  hasActiveFilters,
}) => {
  return (
    <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl mb-8 shadow-xl shadow-black/20">
      {/* Top Search Line */}
      <div className="relative flex items-center">
        <Search className="absolute left-4 h-5 w-5 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by component name, title, keywords (e.g. 'button', 'calendar', 'agent', 'avatar')..."
          className="w-full pl-12 pr-12 py-3.5 bg-zinc-950/80 border border-white/10 rounded-xl text-sm sm:text-base text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 transition-all"
        />
        {searchQuery ? (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-4 p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex absolute right-4 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 border border-white/10 text-zinc-400">
            ⌘K
          </kbd>
        )}
      </div>

      {/* Filter Row */}
      <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Registry Select */}
          <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-white/10 rounded-lg px-2.5 py-1.5">
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={selectedRegistry}
              onChange={(e) => onRegistryChange(e.target.value)}
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer pr-1 text-xs"
            >
              <option value="all" className="bg-zinc-900 text-zinc-200">All Registries ({registriesList.length})</option>
              {registriesList.map((reg) => (
                <option key={reg} value={reg} className="bg-zinc-900 text-zinc-200">
                  {reg}
                </option>
              ))}
            </select>
          </div>

          {/* Type Select */}
          <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-white/10 rounded-lg px-2.5 py-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value)}
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer pr-1 text-xs"
            >
              <option value="all" className="bg-zinc-900 text-zinc-200">All Types</option>
              {typesList.map((t) => (
                <option key={t} value={t} className="bg-zinc-900 text-zinc-200">
                  {t.replace("registry:", "")}
                </option>
              ))}
            </select>
          </div>

          {/* Verified Toggle */}
          <button
            type="button"
            onClick={() => onVerifiedToggle(!verifiedOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
              verifiedOnly
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold"
                : "bg-zinc-950/60 border-white/10 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <CheckCircle2 className={`h-3.5 w-3.5 ${verifiedOnly ? "text-emerald-400" : "text-zinc-500"}`} />
            <span>200 OK Only</span>
          </button>

          {/* Search In Description Toggle */}
          <label
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer select-none transition-all ${
              searchInDescription
                ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300 font-medium"
                : "bg-zinc-950/60 border-white/10 text-zinc-400 hover:text-zinc-200"
            }`}
            title="When off, searches strictly in component name & title so descriptions don't pollute results."
          >
            <input
              type="checkbox"
              checked={searchInDescription}
              onChange={(e) => onSearchInDescriptionChange(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-indigo-500 focus:ring-0 h-3.5 w-3.5 accent-indigo-500"
            />
            <span>Search descriptions</span>
          </label>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Results count & Sort */}
        <div className="flex items-center gap-3 text-zinc-400">
          <span className="font-medium text-zinc-300">
            {resultsCount.toLocaleString()} {resultsCount === 1 ? "component" : "components"}
          </span>

          <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-white/10 rounded-lg px-2 py-1.5 text-xs">
            <span className="text-zinc-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer pr-1"
            >
              <option value="relevance" className="bg-zinc-900 text-zinc-200">Relevance</option>
              <option value="name_asc" className="bg-zinc-900 text-zinc-200">Name (A-Z)</option>
              <option value="registry_asc" className="bg-zinc-900 text-zinc-200">Registry</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
