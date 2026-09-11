import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Globe, ChevronRight, ShieldCheck, Command } from "lucide-react";
import type { ComponentItem } from "../types";

interface SearchViewProps {
  components: ComponentItem[];
  onSelectComponent: (componentName: string, items: ComponentItem[]) => void;
}

const POPULAR_COMPONENTS = [
  "button",
  "dialog",
  "card",
  "accordion",
  "avatar",
  "badge",
  "input",
  "tabs",
  "table",
  "sidebar",
  "calendar",
  "command",
  "tooltip",
  "select",
  "popover",
  "sheet",
  "dropdown-menu",
  "bento-grid",
  "dock",
  "glow",
];

export const SearchView: React.FC<SearchViewProps> = ({
  components,
  onSelectComponent,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Group components by canonical name
  const groupsMap = useMemo(() => {
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
    return map;
  }, [components]);

  const allGroups = useMemo(() => {
    const groups: {
      name: string;
      title: string;
      items: ComponentItem[];
      count: number;
      verifiedCount: number;
    }[] = [];

    for (const [name, items] of groupsMap.entries()) {
      const title =
        items[0]?.title && items[0].title !== items[0].name
          ? items[0].title
          : name.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

      groups.push({
        name,
        title,
        items,
        count: items.length,
        verifiedCount: items.filter((i) => i.install_status === 200).length,
      });
    }

    return groups;
  }, [groupsMap]);

  // Filter components for dropdown
  const dropdownResults = useMemo(() => {
    if (!searchQuery.trim()) {
      // Return popular items if input empty
      return POPULAR_COMPONENTS.map((name) => {
        const items = groupsMap.get(name) || [];
        return {
          name,
          title: name.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          items,
          count: items.length,
          verifiedCount: items.filter((i) => i.install_status === 200).length,
        };
      }).filter((g) => g.count > 0);
    }

    const q = searchQuery.toLowerCase().trim();
    const terms = q.split(/\s+/);

    const matches = allGroups.filter((g) => {
      const text = `${g.name} ${g.title}`.toLowerCase();
      return terms.every((t) => text.includes(t));
    });

    // Rank exact matches first, then startsWith, then count
    return matches.sort((a, b) => {
      const aExact = a.name === q || a.title.toLowerCase() === q;
      const bExact = b.name === q || b.title.toLowerCase() === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = a.name.startsWith(q) || a.title.toLowerCase().startsWith(q);
      const bStarts = b.name.startsWith(q) || b.title.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return b.count - a.count;
    }).slice(0, 15); // Top 15 in dropdown
  }, [searchQuery, allGroups, groupsMap]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen || dropdownResults.length === 0) {
      if (e.key === "ArrowDown") {
        setIsDropdownOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % dropdownResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + dropdownResults.length) % dropdownResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = dropdownResults[selectedIndex];
      if (selected) {
        onSelectComponent(selected.name, selected.items);
        setIsDropdownOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pt-24 sm:pt-36 pb-32">
      {/* Search Input with Attached Dropdown */}
      <div className="relative w-full">
        <div className="relative flex items-center">
          <Search className="absolute left-5 h-6 w-6 text-zinc-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            onKeyDown={handleKeyDown}
            autoFocus
            placeholder="Search component names (e.g. button, dock, bento, accordion)..."
            className="w-full pl-14 pr-24 py-4 sm:py-5 bg-zinc-900/90 hover:bg-zinc-900 border border-white/15 focus:border-indigo-500 rounded-2xl text-base sm:text-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 shadow-2xl transition-all"
          />

          <div className="absolute right-4 flex items-center gap-2">
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[11px] font-mono text-zinc-500 bg-zinc-800/80 px-2 py-1 rounded-md border border-white/10">
              <Command className="h-3 w-3" /> K
            </span>
          </div>
        </div>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-2.5 bg-zinc-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-white/5"
          >
            {/* Dropdown Header */}
            <div className="px-4 py-2.5 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold uppercase tracking-wider text-zinc-300">
                {searchQuery.trim()
                  ? `Components Matching "${searchQuery}" (${dropdownResults.length})`
                  : "Components"}
              </span>
              <span className="text-[11px] text-zinc-500">
                Use <kbd className="font-mono bg-zinc-800 px-1 py-0.5 rounded text-zinc-300">↑</kbd> <kbd className="font-mono bg-zinc-800 px-1 py-0.5 rounded text-zinc-300">↓</kbd> to navigate, <kbd className="font-mono bg-zinc-800 px-1 py-0.5 rounded text-zinc-300">↵</kbd> to view
              </span>
            </div>

            {/* Dropdown List */}
            <div className="max-h-96 overflow-y-auto p-2 space-y-1">
              {dropdownResults.map((group, index) => {
                const isSelected = index === selectedIndex;

                return (
                  <div
                    key={group.name}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => {
                      onSelectComponent(group.name, group.items);
                      setIsDropdownOpen(false);
                    }}
                    className={`cursor-pointer px-4 py-3 rounded-xl transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-indigo-600/20 border border-indigo-500/40 text-white"
                        : "hover:bg-zinc-900/80 text-zinc-200 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase shrink-0 transition-colors ${
                        isSelected ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-400"
                      }`}>
                        {group.name.slice(0, 2)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm capitalize truncate ${isSelected ? "text-indigo-200" : "text-white"}`}>
                            {group.name.replace(/-/g, " ")}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-500">
                            {group.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                        isSelected
                          ? "bg-indigo-500/30 text-indigo-200 border-indigo-400/40"
                          : "bg-zinc-800/80 text-zinc-300 border-white/10"
                      }`}>
                        <Globe className="h-3 w-3" />
                        <span>{group.count} {group.count === 1 ? "website" : "websites"}</span>
                      </span>

                      {group.verifiedCount > 0 && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Verified</span>
                        </span>
                      )}

                      <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? "translate-x-0.5 text-indigo-300" : "text-zinc-600"}`} />
                    </div>
                  </div>
                );
              })}

              {dropdownResults.length === 0 && (
                <div className="py-10 text-center text-zinc-500">
                  <p className="text-sm font-medium text-zinc-400">No components match "{searchQuery}"</p>
                  <p className="text-xs text-zinc-500 mt-1">Try another keyword or switch to the A-Z Directory tab.</p>
                </div>
              )}
            </div>

            {/* Dropdown Footer */}
            <div className="px-4 py-2.5 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500">
              <span>Click a component to view websites & copy CLI commands</span>
              {dropdownResults.length > 0 && (
                <span>Showing top {dropdownResults.length} matches</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
