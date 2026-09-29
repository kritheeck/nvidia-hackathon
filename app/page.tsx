"use client";

import React, { useState, useCallback } from "react";
import { Navigation } from "@/components/landing/navigation";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { InfrastructureSection } from "@/components/landing/infrastructure-section";
import { MetricsSection } from "@/components/landing/metrics-section";
import { IntegrationsSection } from "@/components/landing/integrations-section";
import { SecuritySection } from "@/components/landing/security-section";
import { DevelopersSection } from "@/components/landing/developers-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { CtaSection } from "@/components/landing/cta-section";
import { FooterSection } from "@/components/landing/footer-section";

import { MissionControlView } from "@/components/mission/mission-control-view";
import { RepositoriesView } from "@/components/mission/repositories-view";
import { RunsView } from "@/components/mission/runs-view";
import { SettingsView } from "@/components/mission/settings-view";

import { useNexusWebSocket, type WsStatus } from "@/hooks/useNexusWebSocket";

// ── Connection Status Badge ─────────────────────────────────────────────────
function ConnectionBadge({ status, onReconnect }: { status: WsStatus; onReconnect?: () => void }) {
  const configs: Record<WsStatus, { color: string; label: string; ping?: boolean }> = {
    connected: { color: "bg-emerald-400", label: "Live", ping: true },
    connecting: { color: "bg-amber-400", label: "Connecting...", ping: true },
    disconnected: { color: "bg-slate-500", label: "Offline" },
    error: { color: "bg-rose-500", label: "Disconnected" },
  };
  const cfg = configs[status];
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur border border-border/80 shadow-2xl text-[11px] font-mono">
      <div className="relative flex items-center justify-center w-2 h-2">
        <div className={`w-2 h-2 rounded-full ${cfg.color}`} />
        {cfg.ping && (
          <div
            className={`absolute inset-0 rounded-full ${cfg.color} opacity-60 animate-ping`}
          />
        )}
      </div>
      <span className="text-foreground/80 font-bold">NEXUS Core:</span>
      <span
        className={
          status === "connected"
            ? "text-emerald-400 font-semibold"
            : status === "error"
            ? "text-rose-400 font-semibold"
            : "text-amber-400 font-semibold"
        }
      >
        {cfg.label}
      </span>
      {status !== "connected" && onReconnect && (
        <button
          onClick={onReconnect}
          className="ml-1 px-1.5 py-0.5 rounded bg-foreground/10 hover:bg-foreground/20 text-[10px] text-foreground transition"
          title="Retry connecting to NEXUS backend stream"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function Home() {
  // Default directly to Mission Control — autonomous engineering platform
  const [activeView, setActiveView] = useState<string>("mission_control");

  // System & Mission State
  const [systemState, setSystemState] = useState<string>("IDLE");
  const [scenarios, setScenarios] = useState<any[]>([
    {
      id: "rbac_guard",
      title: "RBAC Role Hierarchy Guard",
      objective:
        "Enforce hierarchical role inheritance so admin users seamlessly access member workspace settings without 403 Forbidden errors.",
      stack: "Python / FastAPI / Pytest",
      files_involved: ["auth.py", "app.py", "test_rbac.py"],
    },
    {
      id: "cache_leak",
      title: "Session Cache Boundary Fix",
      objective:
        "Prevent unbounded dictionary growth in session cache by adding LRU eviction and thread-safe limits.",
      stack: "Python / Concurrency",
      files_involved: ["cache.py", "test_cache.py"],
    },
  ]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>("rbac_guard");
  const [taskObjective, setTaskObjective] = useState<string>(
    "Enforce hierarchical role inheritance so admin users seamlessly access member workspace settings without 403 Forbidden errors."
  );

  // Real-time data
  const [plan, setPlan] = useState<any[]>([]);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [lastExecution, setLastExecution] = useState<any>(null);
  const [lastDiagnostic, setLastDiagnostic] = useState<any>(null);
  const [diffData, setDiffData] = useState<any>(null);
  const [iterations, setIterations] = useState<any[]>([]);
  const [verificationScore, setVerificationScore] = useState<number>(0);
  const [prSummary, setPrSummary] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>({
    last_provider: "NVIDIA NIM / Nebius",
    last_model: "meta/llama-3.2-11b-vision-instruct",
    last_latency_ms: 0,
    avg_latency_ms: 0,
    total_calls: 0,
  });
  const [architecture, setArchitecture] = useState<any>({
    framework: "FastAPI / Python Web API",
    test_command: "pytest -v",
    total_files: 4,
    files: ["auth.py", "app.py", "test_rbac.py", "pytest.ini"],
  });
  const [treeData, setTreeData] = useState<any>(null);

  // ── Apply snapshot from backend ────────────────────────────────────────────
  const applySnapshot = useCallback((snap: any) => {
    if (!snap) return;
    if (snap.state) setSystemState(snap.state);
    if (snap.plan) setPlan(snap.plan);
    if (snap.iterations) setIterations(snap.iterations);
    if (snap.last_diagnostic) setLastDiagnostic(snap.last_diagnostic);
    if (snap.last_execution) setLastExecution(snap.last_execution);
    if (snap.diff_data) setDiffData(snap.diff_data);
    if (snap.verification_score) setVerificationScore(snap.verification_score);
    if (snap.pr_summary) setPrSummary(snap.pr_summary);
    if (snap.terminal_lines) setTerminalLines(snap.terminal_lines);
    if (snap.telemetry) setTelemetry(snap.telemetry);
  }, []);

  // ── WebSocket message handler ──────────────────────────────────────────────
  const handleWsMessage = useCallback(
    (type: string, data: any) => {
      switch (type) {
        case "SNAPSHOT":
          applySnapshot(data);
          break;
        case "STATE_CHANGE":
          setSystemState(data.state);
          break;
        case "PLAN_UPDATED":
          setPlan(data);
          break;
        case "TERMINAL_STREAM":
          setTerminalLines((prev) =>
            prev.length >= 10_000
              ? [...prev.slice(-9_999), data.text]
              : [...prev, data.text]
          );
          break;
        case "ITERATION_UPDATED":
          setIterations(data);
          break;
        case "DIAGNOSTIC_RESULT":
          setLastDiagnostic(data);
          break;
        case "DIFF_UPDATED":
          setDiffData(data);
          break;
        case "PR_SUMMARY":
          setPrSummary(data);
          break;
        case "REPO_ANALYSIS":
          setArchitecture(data);
          break;
        default:
          break;
      }
    },
    [applySnapshot]
  );

  // ── Plugs in the new hook ──────────────────────────────────────────────────
  const { status: wsStatus, send: wsSend, reconnect: wsReconnect } = useNexusWebSocket(handleWsMessage);

  // ── Bootstrap REST endpoints on mount ─────────────────────────────────────
  React.useEffect(() => {
    // Scenarios
    fetch("/api/scenarios")
      .then((r) => r.json())
      .then((d) => {
        if (d.scenarios?.length) {
          setScenarios(d.scenarios);
          const currentId = d.active_scenario_id || "rbac_guard";
          const found = d.scenarios.find((s: any) => s.id === currentId);
          if (found?.objective) setTaskObjective(found.objective);
        }
        if (d.active_scenario_id) setActiveScenarioId(d.active_scenario_id);
      })
      .catch(() => {});

    // Repo tree
    fetch("/api/repo/tree")
      .then((r) => r.json())
      .then((d) => {
        if (d.tree) setTreeData(d.tree);
        if (d.architecture) setArchitecture(d.architecture);
      })
      .catch(() => {});

    // Snapshot
    fetch("/api/snapshot")
      .then((r) => r.json())
      .then(applySnapshot)
      .catch(() => {});

    // Runs
    fetch("/api/runs")
      .then((r) => r.json())
      .then((d) => {
        if (d.iterations?.length) setIterations(d.iterations);
        if (d.active_scenario && d.active_scenario !== activeScenarioId)
          setActiveScenarioId(d.active_scenario);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mission actions with Dual-Transport (WebSocket + REST fallback) ────────
  const handleRunMission = async () => {
    setActiveView("mission_control");
    window.scrollTo({ top: 0, behavior: "smooth" });

    const payload = {
      action: "RUN_MISSION",
      scenario_id: activeScenarioId,
      objective: taskObjective,
    };

    const sent = wsSend(payload);
    // If WebSocket is not ready or failed to send, fall back to REST immediately
    if (!sent) {
      try {
        await fetch("/api/mission/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario_id: activeScenarioId,
            objective: taskObjective,
          }),
        });
      } catch (e) {
        console.error("Run mission fallback error:", e);
      }
    }
  };

  const handleAbortMission = async () => {
    wsSend({ action: "ABORT" });
    try {
      await fetch("/api/mission/abort", { method: "POST" });
    } catch (e) {
      console.error("Abort mission error:", e);
    }
  };

  const handleCommitDelivery = async () => {
    wsSend({ action: "COMMIT_DELIVERY" });
    try {
      const res = await fetch("/api/git/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch_name: `feat/nexus-${activeScenarioId}` }),
      });
      return await res.json();
    } catch {
      return { status: "DELIVERED", branch: `feat/nexus-${activeScenarioId}` };
    }
  };

  const handleScenarioChange = (id: string) => {
    setActiveScenarioId(id);
    const sc = scenarios.find((s) => s.id === id);
    if (sc) setTaskObjective(sc.objective);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      {/* Global Navigation */}
      <Navigation
        activeView={activeView}
        onSelectView={setActiveView}
        systemState={systemState}
      />

      {/* Views */}
      {activeView === "overview" && (
        <>
          <HeroSection
            onStartMission={() => {
              setActiveView("mission_control");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onOpenRepositories={() => {
              setActiveView("repositories");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            telemetry={telemetry}
          />
          <FeaturesSection />
          <HowItWorksSection />
          <InfrastructureSection />
          <MetricsSection />
          <IntegrationsSection />
          <SecuritySection />
          <DevelopersSection />
          <TestimonialsSection />
          <CtaSection
            onStartMission={() => {
              setActiveView("mission_control");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onOpenRepositories={() => {
              setActiveView("repositories");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
          <FooterSection />
        </>
      )}

      {activeView === "mission_control" && (
        <div className="pt-24 pb-16 px-4 md:px-8 max-w-[1440px] mx-auto">
          <MissionControlView
            systemState={systemState}
            scenarios={scenarios}
            activeScenarioId={activeScenarioId}
            onSelectScenario={handleScenarioChange}
            taskObjective={taskObjective}
            onTaskChange={setTaskObjective}
            onRunMission={handleRunMission}
            onAbortMission={handleAbortMission}
            onCommitDelivery={handleCommitDelivery}
            plan={plan}
            terminalLines={terminalLines}
            lastExecution={lastExecution}
            lastDiagnostic={lastDiagnostic}
            diffData={diffData}
            verificationScore={verificationScore}
            prSummary={prSummary}
            iterations={iterations}
            telemetry={telemetry}
            architecture={architecture}
          />
        </div>
      )}

      {activeView === "repositories" && (
        <div className="pt-24 pb-16 px-4 md:px-8 max-w-[1440px] mx-auto">
          <RepositoriesView treeData={treeData} architecture={architecture} />
        </div>
      )}

      {activeView === "runs" && (
        <div className="pt-24 pb-16 px-4 md:px-8 max-w-[1440px] mx-auto">
          <RunsView iterations={iterations} scenarioId={activeScenarioId} />
        </div>
      )}

      {activeView === "settings" && (
        <div className="pt-24 pb-16 px-4 md:px-8 max-w-[1440px] mx-auto">
          <SettingsView telemetry={telemetry} />
        </div>
      )}

      {/* Live connection status indicator */}
      <ConnectionBadge status={wsStatus} onReconnect={wsReconnect} />
    </main>
  );
}
