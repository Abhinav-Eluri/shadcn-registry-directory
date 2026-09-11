import React, { useState, useMemo, useEffect } from "react";
import { Search, X, Globe, ShieldCheck, ChevronRight, Layers } from "lucide-react";
import type { ComponentItem } from "../types";

interface A2ZDirectoryProps {
  components: ComponentItem[];
  onSelectComponent: (componentName: string, items: ComponentItem[]) => void;
}

export interface ComponentNameGroup {
  name: string;
  title: string;
  letter: string;
  items: ComponentItem[];
  count: number;
  verifiedCount: number;
  registries: string[];
}

const ALPHABET = [
  "ALL",
  "#",
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
];

export const A2ZDirectory: React.FC<A2ZDirectoryProps> = ({
  components,
  onSelectComponent,
}) => {
  const [selectedLetter, setSelectedLetter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"alpha" | "count">("alpha");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [displayCount, setDisplayCount] = useState(120);

  // 1. Group components by canonical name
  const allGroups = useMemo(() => {
    const map = new Map<string, ComponentItem[]>();

    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      const key = c.name?.toLowerCase().trim();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.push(c);
      } else {
        map.set(key, [c]);
      }
    }

    const groups: ComponentNameGroup[] = [];
    for (const [name, items] of map.entries()) {
      const firstChar = name.charAt(0).toUpperCase();
      const letter = /^[A-Z]$/.test(firstChar) ? firstChar : "#";
      const verifiedCount = items.filter((item) => item.install_status === 200).length;
      const registries = Array.from(new Set(items.map((item) => item.registry)));

      const title =
        items[0]?.title && items[0].title !== items[0].name
          ? items[0].title
          : name.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

      groups.push({
        name,
        title,
        letter,
        items,
        count: items.length,
        verifiedCount,
        registries,
      });
    }

    return groups;
  }, [components]);

  // 2. Compute count of component names per letter
  const letterCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: allGroups.length, "#": 0 };
    for (const l of "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")) {
      counts[l] = 0;
    }

    for (const g of allGroups) {
      if (counts[g.letter] !== undefined) {
        counts[g.letter]++;
      } else {
        counts["#"]++;
      }
    }
    return counts;
  }, [allGroups]);

  // 3. Filter groups
  const filteredGroups = useMemo(() => {
    let result = allGroups;

    // Filter by Letter
    if (selectedLetter !== "ALL") {
      result = result.filter((g) => g.letter === selectedLetter);
    }

    // Filter by Verified Only
    if (verifiedOnly) {
      result = result
        .map((g) => ({
          ...g,
          items: g.items.filter((i) => i.install_status === 200),
        }))
        .filter((g) => g.items.length > 0);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const terms = q.split(/\s+/);
      result = result.filter((g) => {
        const text = `${g.name} ${g.title}`.toLowerCase();
        return terms.every((t) => text.includes(t));
      });

      // Rank exact matches first
      result = [...result].sort((a, b) => {
        const aExact = a.name === q || a.title.toLowerCase() === q;
        const bExact = b.name === q || b.title.toLowerCase() === q;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = a.name.startsWith(q) || a.title.toLowerCase().startsWith(q);
        const bStarts = b.name.startsWith(q) || b.title.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return b.items.length - a.items.length;
      });
      return result;
    }

    // Sort
    if (sortBy === "count") {
      result = [...result].sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name));
    } else {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [allGroups, selectedLetter, verifiedOnly, searchQuery, sortBy]);

  // Reset pagination when filter changes
  useEffect(() => {
    setDisplayCount(120);
  }, [selectedLetter, searchQuery, verifiedOnly, sortBy]);

  const displayedGroups = useMemo(() => {
    return filteredGroups.slice(0, displayCount);
  }, [filteredGroups, displayCount]);

  return (
    <div className="space-y-6 pt-2">
      {/* Sticky A-Z Alphabet Navigation Bar */}
      <div className="sticky top-16 z-30 bg-zinc-950/90 backdrop-blur-xl border-y border-white/10 py-3 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
          {ALPHABET.map((letter) => {
            const count = letterCounts[letter] || 0;
            const isSelected = selectedLetter === letter;
            const isDisabled = count === 0 && letter !== "ALL";

            return (
              <button
                key={letter}
                disabled={isDisabled}
                onClick={() => {
                  setSelectedLetter(letter);
                  setSearchQuery("");
                }}
                className={`shrink-0 flex flex-col items-center justify-center min-w-[36px] sm:min-w-[42px] h-11 px-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105 border border-indigo-400"
                    : isDisabled
                    ? "opacity-30 text-zinc-600 cursor-not-allowed"
                    : "bg-zinc-900/70 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5"
                }`}
                title={count > 0 ? `${count} components starting with ${letter}` : `No components`}
              >
                <span className="text-sm">{letter}</span>
                <span className={`text-[9px] font-mono font-normal ${isSelected ? "text-indigo-200" : "text-zinc-500"}`}>
                  {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Secondary Controls */}
      <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xl shadow-black/20">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search component names strictly (e.g. 'accordion', 'button', 'calendar', 'dock', 'macbook')..."
            className="w-full pl-12 pr-12 py-3.5 bg-zinc-950/80 border border-white/10 rounded-xl text-sm sm:text-base text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            {/* Verified 200 Only Toggle */}
            <button
              type="button"
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                verifiedOnly
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold"
                  : "bg-zinc-950/60 border-white/10 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ShieldCheck className={`h-3.5 w-3.5 ${verifiedOnly ? "text-emerald-400" : "text-zinc-500"}`} />
              <span>200 OK Verified Only</span>
            </button>

            {selectedLetter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                Letter: <strong>{selectedLetter}</strong>
                <button
                  onClick={() => setSelectedLetter("ALL")}
                  className="ml-1 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-zinc-400">
            <span className="font-medium text-zinc-300">
              {filteredGroups.length.toLocaleString()} components found
            </span>

            <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="text-zinc-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "alpha" | "count")}
                className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer pr-1"
              >
                <option value="alpha" className="bg-zinc-900 text-zinc-200">Name (A → Z)</option>
                <option value="count" className="bg-zinc-900 text-zinc-200">Most Registries (Popular)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Component Names Grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {displayedGroups.map((group) => {
            const hasMultiple = group.items.length > 1;

            return (
              <div
                key={group.name}
                onClick={() => onSelectComponent(group.name, group.items)}
                className="group relative cursor-pointer flex flex-col justify-between p-4 rounded-xl bg-zinc-900/50 hover:bg-zinc-800/80 border border-white/5 hover:border-indigo-500/40 transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5"
              >
                <div>
                  {/* Top row: Name & Letter badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-white group-hover:text-indigo-300 text-sm sm:text-base tracking-tight line-clamp-1 transition-colors capitalize">
                      {group.name.replace(/-/g, " ")}
                    </h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-white/5 shrink-0">
                      {group.letter}
                    </span>
                  </div>

                  {/* Canonical slug */}
                  <p className="text-xs font-mono text-zinc-400 truncate mb-3">
                    {group.name}
                  </p>
                </div>

                {/* Bottom row: Registry count pill & Click indicator */}
                <div className="pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full transition-colors ${
                        hasMultiple
                          ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 group-hover:bg-indigo-500/25"
                          : "bg-zinc-800/80 text-zinc-400 border border-white/5 group-hover:text-zinc-200"
                      }`}
                    >
                      <Globe className="h-3 w-3" />
                      <span>
                        {group.items.length} {group.items.length === 1 ? "website" : "websites"}
                      </span>
                    </span>

                    {group.verifiedCount > 0 && (
                      <span className="hidden group-hover:inline-flex text-[11px] text-emerald-400 items-center">
                        <ShieldCheck className="h-3 w-3" />
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-medium text-zinc-500 group-hover:text-indigo-300 inline-flex items-center gap-0.5 transition-colors">
                    <span>View</span>
                    <ChevronRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredGroups.length === 0 && (
          <div className="py-20 text-center rounded-2xl border border-white/10 bg-zinc-900/30 p-8">
            <Layers className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">
              No component names found
            </h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
              {searchQuery
                ? `No components matched "${searchQuery}". Try a broader term or reset letter filter.`
                : `No components found starting with letter "${selectedLetter}".`}
            </p>
            <button
              onClick={() => {
                setSelectedLetter("ALL");
                setSearchQuery("");
                setVerifiedOnly(false);
              }}
              className="px-4 py-2 rounded-lg bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition-colors"
            >
              Reset to All Components
            </button>
          </div>
        )}

        {/* Load More Button for large letters */}
        {filteredGroups.length > displayedGroups.length && (
          <div className="pt-8 pb-4 text-center">
            <button
              onClick={() => setDisplayCount((prev) => prev + 120)}
              className="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-sm font-semibold text-white transition-all shadow-lg hover:border-white/25"
            >
              Load More Components (Showing {displayedGroups.length} of {filteredGroups.length.toLocaleString()})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
