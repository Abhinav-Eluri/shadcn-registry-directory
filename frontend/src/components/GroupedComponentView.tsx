import React, { useState, useMemo } from "react";
import { Search, X, ChevronDown, ChevronUp, Layers, CheckCircle2 } from "lucide-react";
import type { ComponentItem } from "../types";
import { ComponentCard } from "./ComponentCard";

interface GroupedComponentViewProps {
  components: ComponentItem[];
  onCopyCommand: (cmd: string) => void;
}

interface ComponentGroup {
  name: string;
  title: string;
  items: ComponentItem[];
  count: number;
  verifiedCount: number;
  registries: string[];
}

const POPULAR_COMPONENTS = [
  "all",
  "button",
  "input",
  "badge",
  "tabs",
  "accordion",
  "card",
  "tooltip",
  "dialog",
  "select",
  "table",
  "avatar",
  "switch",
  "sidebar",
  "calendar",
  "popover",
];

export const GroupedComponentView: React.FC<GroupedComponentViewProps> = ({
  components,
  onCopyCommand,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuickFilter, setSelectedQuickFilter] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"count" | "name">("count");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [displayCount, setDisplayCount] = useState(24);

  // 1. Group items by canonical component name
  const allGroups = useMemo(() => {
    const map = new Map<string, ComponentItem[]>();

    for (const c of components) {
      const key = c.name.toLowerCase().trim();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.push(c);
      } else {
        map.set(key, [c]);
      }
    }

    const groups: ComponentGroup[] = [];
    for (const [name, items] of map.entries()) {
      const verifiedCount = items.filter((i) => i.install_status === 200).length;
      const registries = Array.from(new Set(items.map((i) => i.registry)));
      const title =
        items[0]?.title && items[0].title !== items[0].name
          ? items[0].title
          : name.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

      groups.push({
        name,
        title,
        items,
        count: items.length,
        verifiedCount,
        registries,
      });
    }

    return groups;
  }, [components]);

  // 2. Filter & Sort Groups
  const filteredGroups = useMemo(() => {
    let result = allGroups;

    // Quick filter
    if (selectedQuickFilter !== "all") {
      result = result.filter(
        (g) => g.name === selectedQuickFilter || g.name.includes(selectedQuickFilter)
      );
    }

    // Verified only filter
    if (verifiedOnly) {
      result = result
        .map((g) => ({
          ...g,
          items: g.items.filter((i) => i.install_status === 200),
        }))
        .filter((g) => g.items.length > 0);
    }

    // Search query (strict title and name matching for component groups!)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const terms = q.split(/\s+/);
      result = result.filter((g) => {
        const text = `${g.name} ${g.title}`.toLowerCase();
        return terms.every((t) => text.includes(t));
      });

      // Boost exact matches
      result = [...result].sort((a, b) => {
        const aExact = a.name === q || a.title.toLowerCase() === q;
        const bExact = b.name === q || b.title.toLowerCase() === q;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return b.items.length - a.items.length;
      });
      return result;
    }

    // Default sorting
    if (sortBy === "count") {
      result = [...result].sort((a, b) => b.items.length - a.items.length);
    } else {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [allGroups, selectedQuickFilter, verifiedOnly, searchQuery, sortBy]);

  const displayedGroups = useMemo(() => {
    return filteredGroups.slice(0, displayCount);
  }, [filteredGroups, displayCount]);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-3">
          <Layers className="h-3.5 w-3.5 text-indigo-400" />
          <span>Canonical Component Segregation</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Browse by Component Type
        </h2>
        <p className="mt-2 text-sm sm:text-base text-zinc-400">
          Compare all available registry implementations for any component side-by-side. E.g. See all 56 variants of Button from @shadcn, @magicui, @aceternity, and @originui.
        </p>
      </div>

      {/* Popular Component Quick Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto px-4">
        {POPULAR_COMPONENTS.map((comp) => {
          const isActive = selectedQuickFilter === comp;
          return (
            <button
              key={comp}
              onClick={() => {
                setSelectedQuickFilter(comp);
                setDisplayCount(24);
              }}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 border capitalize ${
                isActive
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20 scale-105"
                  : "bg-zinc-900/80 text-zinc-400 border-white/10 hover:border-white/20 hover:text-white"
              }`}
            >
              {comp}
            </button>
          );
        })}
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xl shadow-black/20">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setDisplayCount(24);
            }}
            placeholder="Search component types strictly (e.g. 'button', 'dialog', 'avatar', 'table')..."
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
              <CheckCircle2 className={`h-3.5 w-3.5 ${verifiedOnly ? "text-emerald-400" : "text-zinc-500"}`} />
              <span>200 OK Only</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-zinc-400">
            <span className="font-medium text-zinc-300">
              {filteredGroups.length.toLocaleString()} component types
            </span>

            <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="text-zinc-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "count" | "name")}
                className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer pr-1"
              >
                <option value="count" className="bg-zinc-900 text-zinc-200">Most Implementations</option>
                <option value="name" className="bg-zinc-900 text-zinc-200">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Component Groups List */}
      <div className="space-y-6">
        {displayedGroups.map((group) => {
          const isExpanded = expandedGroups[group.name] ?? (group.items.length <= 4 && filteredGroups.length <= 10);
          const previewItems = isExpanded ? group.items : group.items.slice(0, 3);

          return (
            <div
              key={group.name}
              className="rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden transition-all duration-200 hover:border-white/20 shadow-lg"
            >
              {/* Group Header */}
              <div
                onClick={() => toggleGroup(group.name)}
                className="cursor-pointer p-5 flex flex-wrap items-center justify-between gap-4 bg-zinc-900/80 hover:bg-zinc-800/60 transition-colors border-b border-white/5"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-mono font-bold text-sm">
                    {group.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-lg font-bold text-white tracking-tight capitalize">
                        {group.name.replace(/-/g, " ")}
                      </h3>
                      <span className="text-xs font-mono text-zinc-500 px-2 py-0.5 rounded bg-zinc-950 border border-white/10">
                        {group.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                      <span><strong>{group.items.length}</strong> {group.items.length === 1 ? "variant" : "registries"}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-emerald-400">{group.verifiedCount} verified 200 OK</span>
                    </div>
                  </div>
                </div>

                {/* Right: Registries badges & Expand Toggle */}
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-wrap items-center gap-1.5 max-w-md justify-end">
                    {group.registries.slice(0, 5).map((reg) => (
                      <span
                        key={reg}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-800/80 border border-white/10 text-zinc-300"
                      >
                        {reg}
                      </span>
                    ))}
                    {group.registries.length > 5 && (
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/40 text-zinc-500">
                        +{group.registries.length - 5}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/80 border border-white/10 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-700 transition-colors shrink-0"
                  >
                    <span>{isExpanded ? "Collapse" : `View All (${group.items.length})`}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Group Body: Component Variants Grid */}
              <div className="p-5">
                {isExpanded ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.items.map((item) => (
                      <ComponentCard
                        key={item.id}
                        component={item}
                        onCopyCommand={onCopyCommand}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {previewItems.map((item) => (
                        <ComponentCard
                          key={item.id}
                          component={item}
                          onCopyCommand={onCopyCommand}
                        />
                      ))}
                    </div>

                    {group.items.length > 3 && (
                      <div className="pt-2 text-center">
                        <button
                          onClick={() => toggleGroup(group.name)}
                          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1"
                        >
                          <span>+ Show {group.items.length - 3} more {group.name} implementations</span>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {displayedGroups.length === 0 && (
          <div className="py-16 text-center rounded-2xl border border-white/10 bg-zinc-900/30">
            <Layers className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-300 font-medium text-base">No component types matched your criteria.</p>
            <p className="text-zinc-500 text-xs mt-1">Try clearing filters or searching for canonical names like 'button', 'card', or 'table'.</p>
          </div>
        )}

        {/* Load More Button */}
        {displayCount < filteredGroups.length && (
          <div className="pt-6 text-center">
            <button
              onClick={() => setDisplayCount((prev) => prev + 24)}
              className="px-6 py-3 rounded-xl bg-zinc-900 border border-white/15 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors shadow-lg"
            >
              Load 24 More Component Types ({filteredGroups.length - displayCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
