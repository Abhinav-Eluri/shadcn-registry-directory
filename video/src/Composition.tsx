import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { KineticCenterBuild } from "./components/remocn/kinetic-center-build";
import { ScaleDownFade } from "./components/remocn/scale-down-fade";
import { TerminalSimulator } from "./components/remocn/terminal-simulator";

export const ShadcnPromo: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill className="bg-[#09090b] text-white font-sans overflow-hidden">
      {/* Dynamic Background Glow */}
      <div
        className="absolute w-[800px] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-20"
        style={{
          top: "20%",
          left: "25%",
          background: "radial-gradient(circle, #6366f1 0%, #10b981 100%)",
          transform: `scale(${interpolate(frame, [0, 450], [0.9, 1.2], { extrapolateRight: "clamp" })})`,
        }}
      />

      {/* SCENE 1: Kinetic Opening Hook (Frames 0 to 120 / 0s - 4s) */}
      <Sequence from={0} durationInFrames={120}>
        <div className="flex flex-col items-center justify-center h-full">
          <KineticCenterBuild
            text="294 Registries. 41,700+ Components."
            fontSize={64}
            color="#ffffff"
            fontWeight={800}
            speed={1.1}
          />
          <div
            style={{
              opacity: interpolate(frame, [35, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `translateY(${interpolate(frame, [35, 60], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}
            className="mt-32 text-xl text-zinc-400 font-medium tracking-wide flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-zinc-900/60 backdrop-blur-md"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>The Unified Shadcn Directory</span>
          </div>
        </div>
      </Sequence>

      {/* SCENE 2: Live Verification & Quality Guarantee (Frames 120 to 225 / 4s - 7.5s) */}
      <Sequence from={120} durationInFrames={105}>
        <div className="flex flex-col items-center justify-center h-full px-12 text-center">
          <ScaleDownFade
            text="100% Live HTTP 200 Validated"
            fontSize={64}
            color="#34d399"
            fontWeight={800}
          />
          <div
            style={{
              opacity: interpolate(frame - 120, [25, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
            className="mt-28 flex flex-wrap items-center justify-center gap-3 max-w-2xl"
          >
            {["Zero 404s", "No Broken Links", "All Install URLs Checked", "Live Status Badges"].map((badge, idx) => (
              <span
                key={idx}
                className="px-4 py-2 rounded-xl bg-zinc-900/90 border border-emerald-500/20 text-emerald-300 text-sm font-semibold shadow-lg shadow-emerald-950/20"
              >
                ✓ {badge}
              </span>
            ))}
          </div>
        </div>
      </Sequence>

      {/* SCENE 3: Terminal CLI Simulation & 1-Click Install (Frames 225 to 345 / 7.5s - 11.5s) */}
      <Sequence from={225} durationInFrames={120}>
        <div className="flex flex-col items-center justify-center h-full px-8">
          <div className="mb-6 text-center">
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              1-Click CLI Installation
            </span>
            <h2 className="text-3xl font-extrabold text-white mt-3">
              Add Any Component in Seconds
            </h2>
          </div>

          <div className="w-[850px] shadow-2xl shadow-indigo-500/10 rounded-2xl overflow-hidden border border-white/10">
            <TerminalSimulator
              lines={[
                { text: "npx shadcn@latest add @magicui/rainbow-button", type: "command", delay: 0 },
                { text: "Checking registry @magicui...", type: "log", delay: 10 },
                { text: "HTTP 200 OK — Verified component package", type: "success", delay: 8 },
                { text: "Installed rainbow-button.tsx successfully!", type: "success", delay: 12 },
              ]}
              fontSize={18}
              background="#121216"
              chromeColor="#18181b"
            />
          </div>
        </div>
      </Sequence>

      {/* SCENE 4: Outro & Call to Action (Frames 345 to 450 / 11.5s - 15s) */}
      <Sequence from={345} durationInFrames={105}>
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <ScaleDownFade
            text="Open Source & Ready"
            fontSize={68}
            color="#ffffff"
            fontWeight={800}
          />
          <div
            style={{
              opacity: interpolate(frame - 345, [25, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `translateY(${interpolate(frame - 345, [25, 45], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}
            className="mt-28 space-y-4"
          >
            <p className="text-xl text-zinc-400 font-mono bg-zinc-900/80 px-6 py-2.5 rounded-xl border border-white/10 inline-block text-indigo-300">
              github.com/Abhinav-Eluri/shadcn-registry-directory
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-zinc-500">
              <span>294 Registries</span>
              <span>•</span>
              <span>Model Context Protocol (MCP) Built-In</span>
              <span>•</span>
              <span>Deployed on Render</span>
            </div>
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
