import React, { useState } from "react";
import { Copy, Check, ExternalLink, FileJson, CheckCircle2, AlertTriangle } from "lucide-react";
import type { ComponentItem } from "../types";

interface ComponentCardProps {
  component: ComponentItem;
  onCopyCommand: (cmd: string) => void;
}

export const ComponentCard: React.FC<ComponentCardProps> = ({ component, onCopyCommand }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(component.install_cmd);
    setCopied(true);
    onCopyCommand(component.install_cmd);
    setTimeout(() => setCopied(false), 2000);
  };

  const isVerified200 = component.install_status === 200;

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-zinc-900/40 hover:bg-zinc-900/80 p-5 transition-all duration-200 hover:border-white/20 hover:shadow-xl hover:shadow-black/40">
      {/* Top Header: Registry & Status Badge */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Registry link */}
          {/* Registry link */}
          {component.homepage && (component.homepage.startsWith("http://") || component.homepage.startsWith("https://")) ? (
            <a
              href={component.homepage}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white hover:border-white/25 transition-colors"
              title={`Visit ${component.registry} homepage`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <span className="truncate max-w-[140px]">{component.registry}</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 border border-white/10 text-xs font-semibold text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
              <span className="truncate max-w-[140px]">{component.registry}</span>
            </span>
          )}

          {/* Status badge */}
          {isVerified200 ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              title="Verified HTTP 200 OK: Valid installable component"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>200 OK</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"
              title={`Status: ${component.install_status || "Auth/Degraded"}`}
            >
              <AlertTriangle className="h-3 w-3" />
              <span>{component.install_status || "Degraded"}</span>
            </span>
          )}
        </div>

        {/* Title & Name */}
        <div className="mb-2">
          <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors tracking-tight">
            {component.title || component.name}
          </h3>
          <span className="text-xs font-mono text-zinc-500">{component.name}</span>
        </div>

        {/* Description */}
        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4 min-h-[32px]">
          {component.description || "No description provided by registry index."}
        </p>
      </div>

      {/* Bottom Section: Command and Links */}
      <div className="pt-3 border-t border-white/5 flex flex-col gap-2.5">
        {/* CLI Command Copy Box */}
        <div
          onClick={handleCopy}
          className="cursor-pointer group/cmd flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-zinc-950/80 border border-white/10 hover:border-zinc-500 text-[11px] font-mono text-zinc-300 hover:text-white transition-all shadow-inner"
          title="Click to copy install command"
        >
          <span className="truncate">{component.install_cmd}</span>
          <button
            type="button"
            className="shrink-0 p-1 rounded hover:bg-zinc-800 text-zinc-400 group-hover/cmd:text-white transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Quick Links: Docs & JSON */}
        <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-800/40">
            {component.type.replace("registry:", "")}
          </span>

          <div className="flex items-center gap-3">
            {(() => {
              const hasValidDoc = component.doc_url && (component.doc_url.startsWith("http://") || component.doc_url.startsWith("https://"));
              const hasValidHome = component.homepage && (component.homepage.startsWith("http://") || component.homepage.startsWith("https://"));
              const targetUrl = hasValidDoc ? component.doc_url : (hasValidHome ? component.homepage : null);
              if (!targetUrl) return null;
              const isDirectDoc = Boolean(hasValidDoc && targetUrl !== component.homepage);
              return (
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-1 text-xs transition-colors ${
                    isDirectDoc
                      ? "text-indigo-400 hover:text-indigo-300 font-medium"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  title={isDirectDoc ? "Open dedicated component documentation page" : "No dedicated component page; opens registry site"}
                >
                  <span>{isDirectDoc ? "Docs" : "Site"}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              );
            })()}
            {component.install_url && (component.install_url.startsWith("http://") || component.install_url.startsWith("https://")) && (
              <a
                href={component.install_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
                title="Open registry installation JSON"
              >
                <span>JSON</span>
                <FileJson className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
