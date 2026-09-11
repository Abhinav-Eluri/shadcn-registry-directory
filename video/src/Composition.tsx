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
        className="absolute w-[900px] h-[600px] rounded-full blur-[150px] pointer-events-none opacity-25"
        style={{
          top: "15%",
          left: "25%",
          background: "radial-gradient(circle, #6366f1 0%, #10b981 100%)",
          transform: `scale(${interpolate(frame, [0, 450], [0.9, 1.25], { extrapolateRight: "clamp" })})`,
        }}
      />

      {/* Ambient Grid Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* SCENE 1: Kinetic Opening Hook (Frames 0 to 120 / 0s - 4s) */}
      <Sequence from={0} durationInFrames={120}>
        <div className="relative w-full h-full">
          <KineticCenterBuild
            text="294 Registries. 41,700+ Components."
            fontSize={64}
            color="#ffffff"
            fontWeight={800}
            speed={1.1}
            offsetY={-70}
          />

          <div
            style={{
              opacity: interpolate(frame, [35, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `translateX(-50%) translateY(${interpolate(frame, [35, 55], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}
            className="absolute left-1/2 top-[580px] text-xl text-zinc-300 font-medium tracking-wide flex items-center gap-3 px-6 py-2.5 rounded-full border border-white/10 bg-zinc-900/80 backdrop-blur-md shadow-2xl"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>The Unified Shadcn Directory</span>
          </div>
        </div>
      </Sequence>

      {/* SCENE 2: Live Verification & Quality Guarantee (Frames 120 to 225 / 4s - 7.5s) */}
      <Sequence from={120} durationInFrames={105}>
        <div className="relative w-full h-full">
          <ScaleDownFade
            text="100% Live HTTP 200 Validated"
            fontSize={64}
            color="#34d399"
            fontWeight={800}
            offsetY={-80}
          />

          <div
            style={{
              opacity: interpolate(frame - 120, [25, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `translateX(-50%) translateY(${interpolate(frame - 120, [25, 45], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}
            className="absolute left-1/2 top-[570px] w-full max-w-3xl flex flex-wrap items-center justify-center gap-3.5"
          >
            {["Zero 404s", "No Broken Links", "All Install URLs Checked", "Live Status Badges"].map((badge, idx) => (
              <span
                key={idx}
                className="px-5 py-2.5 rounded-xl bg-zinc-900/90 border border-emerald-500/30 text-emerald-300 text-base font-semibold shadow-lg shadow-emerald-950/25 backdrop-blur-md"
              >
                ✓ {badge}
              </span>
            ))}
          </div>
        </div>
      </Sequence>

      {/* SCENE 3: Terminal CLI Simulation & 1-Click Install (Frames 225 to 345 / 7.5s - 11.5s) */}
      <Sequence from={225} durationInFrames={120}>
        <div className="relative w-full h-full">
          {/* Section Heading positioned cleanly above the terminal */}
          <div
            style={{
              opacity: interpolate(frame - 225, [5, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `translateX(-50%) translateY(${interpolate(frame - 225, [5, 20], [-15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}
            className="absolute left-1/2 top-[100px] text-center w-full max-w-2xl flex flex-col items-center z-10"
          >
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20 mb-3">
              1-Click CLI Installation
            </span>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">
              Add Any Component in Seconds
            </h2>
            <p className="text-zinc-400 text-sm mt-1">
              Supports vanilla shadcn, Magic UI, Aceternity, and 290+ community registries
            </p>
          </div>

          {/* Terminal centered vertically slightly lower to balance with the header */}
          <TerminalSimulator
            title="~/projects/shadcn-directory"
            lines={[
              { text: "npx shadcn@latest add @magicui/rainbow-button", type: "command", delay: 0 },
              { text: "Checking registry @magicui...", type: "log", delay: 10 },
              { text: "HTTP 200 OK — Verified component package", type: "success", delay: 8 },
              { text: "Installed rainbow-button.tsx successfully!", type: "success", delay: 12 },
            ]}
            fontSize={18}
            background="#121216"
            chromeColor="#18181b"
            className="translate-y-14"
          />
        </div>
      </Sequence>

      {/* SCENE 4: Outro & Call to Action (Frames 345 to 450 / 11.5s - 15s) */}
      <Sequence from={345} durationInFrames={105}>
        <div className="relative w-full h-full">
          <ScaleDownFade
            text="Open Source & Ready"
            fontSize={68}
            color="#ffffff"
            fontWeight={800}
            offsetY={-120}
          />

          <div
            style={{
              opacity: interpolate(frame - 345, [25, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `translateX(-50%) translateY(${interpolate(frame - 345, [25, 45], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}
            className="absolute left-1/2 top-[540px] text-center flex flex-col items-center space-y-5 w-full max-w-4xl"
          >
            <p className="text-xl text-indigo-300 font-mono bg-zinc-900/90 px-8 py-3.5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md whitespace-nowrap">
              github.com/Abhinav-Eluri/shadcn-registry-directory
            </p>

            <div className="flex items-center justify-center gap-4 text-base text-zinc-400 font-medium">
              <span>294 Registries</span>
              <span>•</span>
              <span>Model Context Protocol (MCP) Built-In</span>
              <span>•</span>
              <span>Live on Render</span>
            </div>

            <div className="pt-2">
              <span className="px-6 py-2.5 rounded-full bg-white text-zinc-900 font-bold text-sm shadow-xl shadow-white/10">
                ⭐ Star on GitHub
              </span>
            </div>
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
