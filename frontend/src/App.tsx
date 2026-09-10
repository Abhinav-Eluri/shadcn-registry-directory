import { useState, useEffect, useMemo } from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { SearchAndFilterBar } from "./components/SearchAndFilterBar";
import { ComponentCard } from "./components/ComponentCard";
import { GroupedComponentView } from "./components/GroupedComponentView";
import { Toast } from "./components/Toast";
import type { ComponentItem, CatalogMetadata } from "./types";
import { Loader2, AlertCircle } from "lucide-react";

export function App() {
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [metadata, setMetadata] = useState<CatalogMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // View Navigation: "all" components grid vs "grouped" by canonical component
  const [activeView, setActiveView] = useState<"all" | "grouped">("all");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInDescription, setSearchInDescription] = useState(false);
  const [selectedRegistry, setSelectedRegistry] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");

  // Pagination / Display limit
  const [displayCount, setDisplayCount] = useState(60);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Initial Fast Load: Fetch metadata and featured components
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [metaRes, featuredRes] = await Promise.all([
          fetch("/metadata.json"),
          fetch("/featured.json"),
        ]);

        if (metaRes.ok) {
          const metaData: CatalogMetadata = await metaRes.json();
          setMetadata(metaData);
        }

        if (featuredRes.ok) {
          const featuredData: ComponentItem[] = await featuredRes.json();
          setComponents(featuredData);
          setIsLoading(false);
        }

        // 2. Background Load Full Catalog (all 44,900+ components)
        const fullRes = await fetch("/catalog.json");
        if (fullRes.ok) {
          const fullData: ComponentItem[] = await fullRes.json();
          setComponents(fullData);
        }
      } catch (err) {
        console.error("Failed to load component data:", err);
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        window.scrollTo({ top: 350, behavior: "smooth" });
        const input = document.querySelector('input[type="text"]') as HTMLInputElement;
        input?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered & Sorted Components
  const filteredComponents = useMemo(() => {
    let result = components;

    // 1. Category Filter from Hero pills
    if (activeCategory !== "all") {
      result = result.filter((c) => {
        const n = c.name.toLowerCase();
        const t = c.title.toLowerCase();
        if (activeCategory === "button") return n.includes("button") || t.includes("button");
        if (activeCategory === "card") return n.includes("card") || t.includes("card") || n.includes("bento");
        if (activeCategory === "dialog") return n.includes("dialog") || n.includes("modal") || n.includes("sheet") || n.includes("drawer");
        if (activeCategory === "chart") return n.includes("chart") || n.includes("graph") || n.includes("stat");
        if (activeCategory === "nav") return n.includes("nav") || n.includes("menu") || n.includes("header") || n.includes("sidebar");
        if (activeCategory === "ai") return n.includes("ai") || n.includes("chat") || n.includes("agent") || n.includes("prompt");
        if (activeCategory === "auth") return n.includes("auth") || n.includes("login") || n.includes("sign");
        if (activeCategory === "block") return c.type.includes("block");
        return true;
      });
    }

    // 2. Registry Filter
    if (selectedRegistry !== "all") {
      result = result.filter((c) => c.registry === selectedRegistry);
    }

    // 3. Type Filter
    if (selectedType !== "all") {
      result = result.filter((c) => c.type === selectedType);
    }

    // 4. Verified 200 Only
    if (verifiedOnly) {
      result = result.filter((c) => c.install_status === 200);
    }

    // 5. Search Query: Strict title/name by default, prevents description pollution
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const terms = q.split(/\s+/);
      result = result.filter((c) => {
        const nameText = `${c.name} ${c.title}`.toLowerCase();
        const regText = c.registry.toLowerCase();
        if (searchInDescription) {
          const fullText = `${nameText} ${c.description} ${regText}`.toLowerCase();
          return terms.every((term) => fullText.includes(term));
        } else {
          // Strict name, title, or registry match
          return terms.every((term) => nameText.includes(term) || regText.includes(term));
        }
      });

      // Rank exact name/title matches at the very top
      result = [...result].sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();

        const aExact = aName === q || aTitle === q;
        const bExact = bName === q || bTitle === q;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = aName.startsWith(q) || aTitle.startsWith(q);
        const bStarts = bName.startsWith(q) || bTitle.startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return 0;
      });
    }

    // 6. Sort
    if (sortBy === "name_asc") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "registry_asc") {
      result = [...result].sort((a, b) => a.registry.localeCompare(b.registry));
    }

    return result;
  }, [components, activeCategory, selectedRegistry, selectedType, verifiedOnly, searchQuery, searchInDescription, sortBy]);

  // Sliced items for smooth rendering performance
  const displayedComponents = useMemo(() => {
    return filteredComponents.slice(0, displayCount);
  }, [filteredComponents, displayCount]);

  const handleCopyToast = (cmd: string) => {
    setToastMessage(cmd);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedRegistry("all");
    setSelectedType("all");
    setVerifiedOnly(false);
    setActiveCategory("all");
    setSortBy("relevance");
    setDisplayCount(60);
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedRegistry !== "all" ||
    selectedType !== "all" ||
    verifiedOnly ||
    activeCategory !== "all";

  const registriesList = useMemo(() => {
    if (metadata) {
      return Object.keys(metadata.registries).sort();
    }
    const set = new Set(components.map((c) => c.registry));
    return Array.from(set).sort();
  }, [metadata, components]);

  const typesList = useMemo(() => {
    if (metadata) return metadata.types;
    const set = new Set(components.map((c) => c.type));
    return Array.from(set).sort();
  }, [metadata, components]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      <Navbar
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-20">
        {activeView === "grouped" ? (
          <GroupedComponentView
            components={components}
            onCopyCommand={handleCopyToast}
          />
        ) : (
          <>
            <Hero
              activeCategory={activeCategory}
              onSelectCategory={(cat) => {
                setActiveCategory(cat);
                setDisplayCount(60);
              }}
            />

            <SearchAndFilterBar
              searchQuery={searchQuery}
              onSearchChange={(q) => {
                setSearchQuery(q);
                setDisplayCount(60);
              }}
              searchInDescription={searchInDescription}
              onSearchInDescriptionChange={setSearchInDescription}
              selectedRegistry={selectedRegistry}
              onRegistryChange={(reg) => {
                setSelectedRegistry(reg);
                setDisplayCount(60);
              }}
              selectedType={selectedType}
              onTypeChange={(t) => {
                setSelectedType(t);
                setDisplayCount(60);
              }}
              verifiedOnly={verifiedOnly}
              onVerifiedToggle={(v) => {
                setVerifiedOnly(v);
                setDisplayCount(60);
              }}
              sortBy={sortBy}
              onSortChange={setSortBy}
              registriesList={registriesList}
              typesList={typesList}
              resultsCount={filteredComponents.length}
              onResetFilters={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
            />

        {/* Component Grid */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-zinc-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <p className="text-sm font-medium">Indexing shadcn component directory...</p>
          </div>
        ) : filteredComponents.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-white/5 bg-zinc-900/30 p-8">
            <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">No components match your search</h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
              Try adjusting your query, removing active registry filters, or clearing the 200 OK verified toggle.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-lg bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {displayedComponents.map((comp, idx) => (
                <ComponentCard
                  key={`${comp.id}-${idx}`}
                  component={comp}
                  onCopyCommand={handleCopyToast}
                />
              ))}
            </div>

            {/* Load More Button */}
            {filteredComponents.length > displayedComponents.length && (
              <div className="mt-12 text-center">
                <button
                  onClick={() => setDisplayCount((prev) => prev + 60)}
                  className="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-sm font-medium text-white transition-all shadow-lg hover:border-white/25"
                >
                  Load More Components (Showing {displayedComponents.length} of {filteredComponents.length.toLocaleString()})
                </button>
              </div>
            )}
          </>
        )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-zinc-950 py-8 text-xs text-zinc-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Shadcn Registry Explorer. Open Registry Catalog.</p>
          <div className="flex items-center gap-4">
            <span>Powered by official shadcn registry index</span>
            <span>•</span>
            <a href="https://ui.shadcn.com" target="_blank" rel="noreferrer" className="hover:text-zinc-300">shadcn/ui</a>
          </div>
        </div>
      </footer>

      {/* Toast Feedback */}
      <Toast message={toastMessage} />
    </div>
  );
}

export default App;
