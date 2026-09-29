"use client";

import React, { useEffect, useState } from "react";
import {
  History, CheckCircle2, XCircle, Clock, Cpu, GitPullRequest,
  RotateCcw, ChevronDown, ChevronRight, BarChart2, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface IterationRow {
  iteration: number;
  passed: boolean;
  passed_tests: number;
  failed_tests: number;
  total_tests: number;
  exit_code: number;
  duration_ms: number;
  action: string;
}

interface MissionSummary {
  id: string;
  scenario_id: string;
  objective: string;
  status: string;
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  verification_score?: number;
  tests_passed?: number;
  tests_failed?: number;
  total_tests?: number;
  iterations_count?: number;
  pr_url?: string;
  branch_name?: string;
}

interface PlatformStats {
  total_missions: number;
  completed_missions: number;
  success_rate: number;
  avg_verification_score: number;
}

interface RunsViewProps {
  iterations: IterationRow[];
  scenarioId: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    COMPLETED: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
    ERROR: "text-rose-400 bg-rose-500/15 border-rose-500/30",
    RUNNING: "text-amber-400 bg-amber-500/15 border-amber-500/30 animate-pulse",
    STOPPED: "text-slate-400 bg-slate-500/15 border-slate-500/30",
  };
  return (
    <span
      className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded border ${
        map[status] ?? "text-slate-400 bg-muted border-border"
      }`}
    >
      {status}
    </span>
  );
}

export function RunsView({ iterations = [], scenarioId }: RunsViewProps) {
  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/missions")
      .then((r) => r.json())
      .then((d) => {
        setMissions(d.missions ?? []);
        setStats(d.stats ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleReplay = async (missionId: string) => {
    setReplayingId(missionId);
    try {
      await fetch(`/api/missions/${missionId}/replay`, { method: "POST" });
    } finally {
      setTimeout(() => setReplayingId(null), 2000);
    }
  };

  const fmt = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso + "Z").toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-lg font-bold font-mono text-foreground">Mission History</h2>
            <p className="text-xs text-muted-foreground font-mono">
              Persistent mission records — full audit trail with replay capability
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="font-mono text-xs gap-2"
          onClick={() => {
            setLoading(true);
            fetch("/api/missions")
              .then((r) => r.json())
              .then((d) => { setMissions(d.missions ?? []); setStats(d.stats ?? null); })
              .finally(() => setLoading(false));
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* ── Platform Stats ─────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Missions", value: stats.total_missions, icon: BarChart2, color: "text-cyan-400" },
            { label: "Completed", value: stats.completed_missions, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Success Rate", value: `${stats.success_rate}%`, icon: Zap, color: "text-[#76b900]" },
            { label: "Avg Verification", value: `${stats.avg_verification_score}%`, icon: Cpu, color: "text-purple-400" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-card/60 border border-border/80 rounded-xl p-4 flex flex-col gap-1"
            >
              <div className="flex items-center gap-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-[10px] font-mono text-muted-foreground uppercase">{s.label}</span>
              </div>
              <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Current Session Iterations ─────────────────────────────────── */}
      {iterations.length > 0 && (
        <div className="bg-card/60 border border-border/80 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#76b900]" />
            <span className="font-mono text-xs font-bold uppercase text-foreground">
              Current Session — Self-Healing Iterations
            </span>
          </div>
          <div className="divide-y divide-border/40">
            {iterations.map((it) => (
              <div
                key={it.iteration}
                className="flex items-center justify-between px-4 py-3 font-mono text-xs"
              >
                <div className="flex items-center gap-3">
                  {it.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-foreground font-semibold">
                      Attempt {it.iteration}: {it.action}
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                      {it.passed_tests}/{it.total_tests} tests passed · Exit {it.exit_code} · {it.duration_ms}ms
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    it.passed
                      ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
                      : "text-rose-400 bg-rose-500/15 border-rose-500/30"
                  }`}
                >
                  {it.passed ? "VERIFIED" : "FAILED"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Persistent Mission History ──────────────────────────────────── */}
      <div className="bg-card/60 border border-border/80 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs font-bold uppercase text-foreground">
            All Missions — SQLite Persistence
          </span>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
            {missions.length} record{missions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-muted-foreground animate-pulse">
            Loading mission history...
          </div>
        ) : missions.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-muted-foreground">
            No missions persisted yet. Run your first mission to build history.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {missions.map((m) => (
              <div key={m.id}>
                {/* Row */}
                <button
                  onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition font-mono text-xs text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {expanded === m.id ? (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-foreground font-semibold truncate">
                        {m.scenario_id} — {m.objective?.slice(0, 60)}...
                      </div>
                      <div className="text-muted-foreground text-[10px] mt-0.5">
                        {fmt(m.start_time)} · {m.iterations_count ?? 0} iteration{(m.iterations_count ?? 0) !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {m.verification_score != null && (
                      <span className="text-[#76b900] font-bold">{m.verification_score.toFixed(1)}%</span>
                    )}
                    <StatusBadge status={m.status} />
                  </div>
                </button>

                {/* Expanded Detail */}
                {expanded === m.id && (
                  <div className="px-10 pb-4 space-y-3 bg-muted/10 border-t border-border/40 font-mono text-xs">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3">
                      {[
                        { label: "Tests", value: `${m.tests_passed ?? 0}/${m.total_tests ?? 0}` },
                        { label: "Duration", value: m.duration_ms ? `${m.duration_ms}ms` : "—" },
                        { label: "Branch", value: m.branch_name ?? "—" },
                        { label: "ID", value: m.id.slice(0, 8) + "…" },
                      ].map((f) => (
                        <div key={f.label} className="bg-black/30 rounded p-2">
                          <div className="text-[9px] uppercase text-muted-foreground">{f.label}</div>
                          <div className="text-foreground font-semibold truncate">{f.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] font-mono gap-1.5"
                        onClick={() => handleReplay(m.id)}
                        disabled={replayingId === m.id}
                      >
                        <RotateCcw className={`w-3 h-3 ${replayingId === m.id ? "animate-spin" : ""}`} />
                        {replayingId === m.id ? "Replaying…" : "Replay Events"}
                      </Button>

                      {m.pr_url && (
                        <a
                          href={m.pr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 h-7 px-2 text-[10px] font-mono text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/10 transition"
                        >
                          <GitPullRequest className="w-3 h-3" />
                          View PR
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
