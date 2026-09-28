"use client";

import React, { useState } from "react";
import { 
  Play, Square, Cpu, Zap, FolderGit2, CheckCircle2, 
  AlertTriangle, Terminal, Stethoscope, FileCode, GitPullRequest, 
  Layers, RefreshCw, Sparkles, Shield, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NexusCore3D } from "./nexus-core-3d";
import { AgentPipeline } from "./agent-pipeline";
import { TerminalView } from "./terminal-view";
import { DiagnosticMatrix } from "./diagnostic-matrix";
import { DiffViewer } from "./diff-viewer";
import { VerificationDeliveryPanel } from "./verification-delivery-panel";

interface MissionControlProps {
  systemState: string;
  scenarios: any[];
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
  taskObjective: string;
  onTaskChange: (val: string) => void;
  onRunMission: () => void;
  onAbortMission: () => void;
  onCommitDelivery: () => Promise<any>;
  plan: any[];
  terminalLines: string[];
  lastExecution: any;
  lastDiagnostic: any;
  diffData: any;
  verificationScore: number;
  prSummary: any;
  iterations: any[];
  telemetry: any;
  architecture: any;
}

export function MissionControlView({
  systemState = "IDLE",
  scenarios = [],
  activeScenarioId = "rbac_guard",
  onSelectScenario,
  taskObjective,
  onTaskChange,
  onRunMission,
  onAbortMission,
  onCommitDelivery,
  plan = [],
  terminalLines = [],
  lastExecution,
  lastDiagnostic,
  diffData,
  verificationScore = 0,
  prSummary,
  iterations = [],
  telemetry = {},
  architecture,
}: MissionControlProps) {
  // Active bottom panel tab: 'terminal' | 'diagnosis' | 'diff' | 'delivery'
  const [activeBottomTab, setActiveBottomTab] = useState<"terminal" | "diagnosis" | "diff" | "delivery">("terminal");

  const isRunning = [
    "CONNECTING", "INGESTING_REPOSITORY", "ANALYZING", "PLANNING", 
    "IMPLEMENTING", "EXECUTING", "TESTING", "DIAGNOSING", "REPAIRING", "RETESTING"
  ].includes(systemState);

  const isRepaired = iterations.length > 1 && iterations[iterations.length - 1]?.passed;

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 1. Top Bar: Scenario Selector & Task Objective Dispatch */}
      <div className="bg-card/70 backdrop-blur-md border border-border/80 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground uppercase font-semibold">
                Target Scenario:
              </span>
              <div className="flex items-center gap-1.5">
                {scenarios.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => onSelectScenario(sc.id)}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition border ${
                      activeScenarioId === sc.id
                        ? "bg-[#76b900]/15 border-[#76b900]/50 text-[#76b900] font-bold"
                        : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {sc.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Intent Input */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase shrink-0">
                Intent:
              </span>
              <input
                type="text"
                value={taskObjective}
                onChange={(e) => onTaskChange(e.target.value)}
                className="w-full bg-black/50 border border-border/70 rounded px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-[#76b900]/60 transition"
                placeholder="Enter autonomous software engineering objective..."
              />
            </div>
          </div>

          {/* Action CTA Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {isRunning ? (
              <Button
                onClick={onAbortMission}
                variant="destructive"
                className="font-mono text-xs uppercase tracking-wider h-10 px-5 gap-2"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Abort Mission
              </Button>
            ) : (
              <Button
                onClick={onRunMission}
                className="bg-gradient-to-r from-[#76b900] to-[#5a8d00] hover:from-[#85cf00] hover:to-[#68a300] text-black font-bold font-mono text-xs uppercase tracking-wider h-10 px-6 gap-2 shadow-lg shadow-[#76b900]/25 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-black" />
                Start Autonomous Mission
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Agent Pipeline Lifecycle Visualizer */}
      <AgentPipeline currentState={systemState} />

      {/* 3. Three-Column Command Center Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Repository Intelligence & Architecture (Col 3) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-card/60 backdrop-blur-md border border-border/80 rounded-xl p-4 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-3">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold uppercase text-foreground">
                  Repo Intelligence
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">AST Engine</span>
            </div>

            {architecture ? (
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Framework & Runner</span>
                  <div className="text-foreground font-semibold">{architecture.framework}</div>
                  <div className="text-[11px] text-cyan-400">{architecture.test_command}</div>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Source Files ({architecture.total_files})</span>
                  <div className="space-y-1 mt-1 max-h-40 overflow-y-auto pr-1">
                    {architecture.files?.map((f: string) => (
                      <div key={f} className="flex items-center justify-between p-1.5 rounded bg-black/40 text-[11px] border border-border/40">
                        <span className="text-slate-300 truncate">{f}</span>
                        {f.includes("test") && (
                          <span className="text-[9px] px-1 rounded bg-purple-500/20 text-purple-300">pytest</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase">Affected Culprits</span>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {(architecture.files || ["auth.py", "test_rbac.py"])
                      .filter((f: string) => !f.includes("pytest.ini"))
                      .map((f: string) => (
                        <span
                          key={f}
                          className={`px-2 py-0.5 rounded text-[11px] border ${
                            f.startsWith("test_")
                              ? "bg-muted border-border text-muted-foreground"
                              : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                          }`}
                        >
                          {f}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs font-mono text-muted-foreground">
                Analyzing repository AST...
              </div>
            )}
          </div>
        </div>

        {/* Center Column: 3D Nexus Core & Real-time Plan (Col 6) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="bg-card/60 backdrop-blur-md border border-border/80 rounded-xl p-4 shadow-xl flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-2 z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#76b900]" />
                <span className="text-xs font-mono font-bold uppercase text-foreground">
                  NEXUS Core Intelligence
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#76b900]/10 border border-[#76b900]/30 text-[#76b900] font-bold">
                {systemState}
              </span>
            </div>

            {/* 3D Core Canvas */}
            <div className="w-full flex items-center justify-center relative">
              <NexusCore3D state={systemState} height={240} interactive={true} />
            </div>

            {/* Live Structured Plan Steps */}
            <div className="mt-2 pt-2 border-t border-border/60 space-y-1.5">
              <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold">
                Autonomous Execution Plan
              </span>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {plan.map((step) => {
                  let badge = "text-muted-foreground bg-muted/40";
                  if (step.status === "completed") badge = "text-[#76b900] bg-[#76b900]/15";
                  if (step.status === "in_progress") badge = "text-cyan-400 bg-cyan-500/15 animate-pulse font-semibold";

                  return (
                    <div
                      key={step.id}
                      className="flex items-center justify-between p-1.5 rounded bg-black/40 text-[11px] font-mono border border-border/40"
                    >
                      <span className="text-foreground/90 truncate mr-2">
                        {step.id}. {step.step}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-mono ${badge}`}>
                        {step.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Telemetry & Infrastructure Proof (Col 3) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-card/60 backdrop-blur-md border border-border/80 rounded-xl p-4 shadow-xl flex-1 flex flex-col font-mono text-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#76b900]" />
                <span className="text-xs font-bold uppercase text-foreground">
                  Telemetry & Infra
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] text-emerald-400 font-semibold">LIVE</span>
              </div>
            </div>

            {/* AI Model Intelligence */}
            <div className="p-2.5 rounded-lg bg-black/40 border border-border/40 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase font-semibold">
                <Cpu className="w-3 h-3 text-[#76b900]" />
                <span>NVIDIA Reasoning Model</span>
              </div>
              <div className="text-foreground font-bold text-xs truncate">
                {telemetry?.last_model || "meta/llama-3.2-11b-vision-instruct"}
              </div>
              <div className="text-[10px] text-cyan-400">
                Provider: {telemetry?.last_provider || "NVIDIA NIM / Nebius"}
              </div>
            </div>

            {/* Nebius Infrastructure */}
            <div className="p-2.5 rounded-lg bg-black/40 border border-border/40 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase font-semibold">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>Nebius Infrastructure</span>
              </div>
              <div className="text-foreground font-bold text-xs">
                GPU Cloud Cluster (EU-West)
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                <span>Inference Latency:</span>
                <span className="text-[#76b900] font-bold">{telemetry?.last_latency_ms || 128}ms</span>
              </div>
            </div>

            {/* Self-Healing Iterations Summary */}
            <div className="p-2.5 rounded-lg bg-black/40 border border-border/40 space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase text-muted-foreground font-semibold">
                <span>Self-Healing Iterations</span>
                <span className="text-foreground">{iterations.length} / 3</span>
              </div>

              {iterations.map((it) => (
                <div key={it.iteration} className="flex items-center justify-between text-[11px] p-1 rounded bg-muted/20 border border-border/30">
                  <span>Attempt {it.iteration}:</span>
                  <span className={it.passed ? "text-emerald-400 font-bold" : "text-rose-400 font-semibold"}>
                    {it.passed ? "✓ VERIFIED (7/7)" : `FAILED (${it.passed_tests}/${it.total_tests})`}
                  </span>
                </div>
              ))}
            </div>

            {/* Confidence Score Gauge */}
            <div className="p-3 rounded-lg bg-[#76b900]/10 border border-[#76b900]/30 text-center space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-semibold">
                Verification Confidence
              </span>
              <div className="text-2xl font-bold font-mono text-[#76b900]">
                {verificationScore.toFixed(1)}%
              </div>
              <span className="text-[9px] text-muted-foreground block">
                Derived from real pytest assertions
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Expandable Multi-View Workspaces */}
      <div className="bg-card/70 backdrop-blur-md border border-border/80 rounded-xl overflow-hidden shadow-2xl">
        {/* Workspace Tab Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b border-border/60">
          <div className="flex items-center gap-2">
            {[
              { id: "terminal", label: "Execution Sandbox Terminal", icon: Terminal, badge: terminalLines.length },
              { id: "diagnosis", label: "Root-Cause Diagnosis", icon: Stethoscope, badge: lastDiagnostic ? "!" : null },
              { id: "diff", label: "Unified Code Diff", icon: FileCode, badge: diffData?.total_insertions ? `+${diffData.total_insertions}` : null },
              { id: "delivery", label: "GitHub PR Delivery", icon: GitPullRequest, badge: prSummary ? "Ready" : null },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeBottomTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveBottomTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition border ${
                    isActive
                      ? "bg-foreground text-background border-foreground shadow-sm"
                      : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      isActive ? "bg-background text-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
            Active Workspace Surface
          </span>
        </div>

        {/* Tab Content Panes (Fixed Height 340px for scannability) */}
        <div className="h-[340px] p-3">
          {activeBottomTab === "terminal" && (
            <TerminalView lines={terminalLines} lastExecution={lastExecution} />
          )}

          {activeBottomTab === "diagnosis" && (
            <DiagnosticMatrix diagnostic={lastDiagnostic} isRepaired={isRepaired} />
          )}

          {activeBottomTab === "diff" && (
            <DiffViewer diffData={diffData} />
          )}

          {activeBottomTab === "delivery" && (
            <VerificationDeliveryPanel
              score={verificationScore}
              prSummary={prSummary}
              onCommitDelivery={onCommitDelivery}
              isDelivered={systemState === "COMPLETED"}
              lastExecution={lastExecution}
            />
          )}
        </div>
      </div>
    </div>
  );
}
