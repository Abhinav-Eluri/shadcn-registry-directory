import React, { useState } from "react";
import { X, ExternalLink, Check, Globe, ShieldCheck, Terminal, Search } from "lucide-react";
import type { ComponentItem } from "../types";

interface ComponentWebsitesModalProps {
  componentName: string;
  items: ComponentItem[];
  isOpen: boolean;
  onClose: () => void;
  onCopyCommand: (cmd: string) => void;
}

export const ComponentWebsitesModal: React.FC<ComponentWebsitesModalProps> = ({
  componentName,
  items,
  isOpen,
  onClose,
  onCopyCommand,
}) => {
  const [searchFilter, setSearchFilter] = useState("");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (cmd: string) => {
    onCopyCommand(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const filteredItems = items.filter((item) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.registry.toLowerCase().includes(q) ||
      item.title?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q)
    );
  });

  const verifiedCount = items.filter((i) => i.install_status === 200).length;
  const displayName =
    componentName.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-zinc-900/50 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {displayName}
              </h2>
              <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-white/10">
                {componentName}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-zinc-400 flex items-center gap-2 flex-wrap">
              <span>Available in <strong className="text-white font-semibold">{items.length}</strong> {items.length === 1 ? "website / registry" : "websites / registries"}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                {verifiedCount} Verified HTTP 200
              </span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-search bar inside modal */}
        {items.length > 4 && (
          <div className="px-6 py-3 border-b border-white/5 bg-zinc-950/80">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter registries (e.g. magicui, aceternity, originui)..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-zinc-900/90 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>
        )}

        {/* Registry Cards List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 divide-y divide-white/5">
          {filteredItems.map((item, idx) => {
            const isCopied = copiedCmd === item.install_cmd;
            const targetDoc = item.doc_url || item.homepage || item.install_url;

            return (
              <div
                key={`${item.registry}-${idx}`}
                className={`pt-4 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl transition-all ${
                  idx % 2 === 0 ? "bg-zinc-900/30" : "bg-transparent"
                } hover:bg-zinc-900/60 border border-transparent hover:border-white/10`}
              >
                {/* Left: Registry Info & Details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-base font-bold text-indigo-300 font-mono">
                      {item.registry}
                    </span>

                    {item.install_status === 200 ? (
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Live 200 OK
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        Status {item.install_status}
                      </span>
                    )}

                    <span className="text-xs text-zinc-500 font-medium px-2 py-0.5 rounded bg-zinc-800/80 border border-white/5">
                      {(item.type || "component").replace("registry:", "")}
                    </span>
                  </div>

                  {item.title && item.title !== item.name && (
                    <p className="text-sm font-medium text-zinc-200">
                      Variant: {item.title}
                    </p>
                  )}

                  {item.description ? (
                    <p className="text-xs text-zinc-400 line-clamp-2 max-w-xl">
                      {item.description}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500 italic">
                      Standard registry implementation.
                    </p>
                  )}

                  {/* CLI Command snippet */}
                  <div className="pt-1 flex items-center gap-2">
                    <code className="text-xs font-mono text-zinc-300 bg-zinc-950 px-2.5 py-1 rounded border border-white/10 truncate max-w-md">
                      {item.install_cmd}
                    </code>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
                  {/* Copy CLI Button */}
                  <button
                    type="button"
                    onClick={() => handleCopy(item.install_cmd)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                      isCopied
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-zinc-800 text-white hover:bg-zinc-700 border border-white/10"
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Copy CLI</span>
                      </>
                    )}
                  </button>

                  {/* Visit Website / Docs Link */}
                  {targetDoc && (
                    <a
                      href={targetDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>Visit Website</span>
                      <ExternalLink className="h-3 w-3 opacity-80" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <p className="text-sm">No registries matched "{searchFilter}".</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500">
          <span>Click "Copy CLI" to install directly into your project via the shadcn CLI.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
