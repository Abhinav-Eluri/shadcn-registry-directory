import { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { SearchView } from "./components/SearchView";
import { A2ZDirectory } from "./components/A2ZDirectory";
import { ComponentWebsitesModal } from "./components/ComponentWebsitesModal";
import { Toast } from "./components/Toast";
import type { ComponentItem, CatalogMetadata } from "./types";
import { Loader2 } from "lucide-react";

export function App() {
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [, setMetadata] = useState<CatalogMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // View Navigation: "search" (Tab 1) vs "a2z" (Tab 2)
  const [activeView, setActiveView] = useState<"search" | "a2z">("search");

  // Active Component Modal
  const [selectedComponentForModal, setSelectedComponentForModal] = useState<{
    name: string;
    items: ComponentItem[];
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Initial Load: Fetch metadata and featured components, then full catalog in background
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

        // Background Load Full Catalog
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

  // Keyboard shortcut: Cmd+K / Ctrl+K to switch to search tab and focus input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setActiveView("search");
        setTimeout(() => {
          const input = document.querySelector('input[type="text"]') as HTMLInputElement;
          input?.focus();
        }, 50);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCopyToast = (cmd: string) => {
    setToastMessage(cmd);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      <Navbar
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {isLoading ? (
          <div className="py-32 flex flex-col items-center justify-center text-zinc-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <p className="text-sm font-medium">Indexing 34,000+ components across registries...</p>
          </div>
        ) : activeView === "search" ? (
          <SearchView
            components={components}
            onSelectComponent={(name, items) => {
              setSelectedComponentForModal({ name, items });
            }}
          />
        ) : (
          <div className="py-6">
            <A2ZDirectory
              components={components}
              onSelectComponent={(name, items) => {
                setSelectedComponentForModal({ name, items });
              }}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-zinc-950 py-8 text-xs text-zinc-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 ComponentHub. Open Registry Catalog.</p>
          <div className="flex items-center gap-4 text-zinc-500">
            <span>294 Registries</span>
            <span>•</span>
            <span>34,000+ Components</span>
          </div>
        </div>
      </footer>

      {/* Component Websites Availability Modal */}
      <ComponentWebsitesModal
        isOpen={selectedComponentForModal !== null}
        componentName={selectedComponentForModal?.name ?? ""}
        items={selectedComponentForModal?.items ?? []}
        onClose={() => setSelectedComponentForModal(null)}
        onCopyCommand={handleCopyToast}
      />

      {/* Toast Feedback */}
      <Toast message={toastMessage} />
    </div>
  );
}

export default App;
