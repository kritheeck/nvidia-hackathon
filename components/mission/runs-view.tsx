"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, Clock, Terminal, Wrench, ShieldCheck, GitBranch } from "lucide-react";

interface RunsProps {
  iterations: any[];
  scenarioId: string;
}

export function RunsView({ iterations = [], scenarioId = "rbac_guard" }: RunsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-white">
            Self-Healing Run History
          </h2>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Audit trail of execution attempts, real test failures, root-cause repairs, and verification.
          </p>
        </div>
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#76b900]/10 border border-[#76b900]/30 text-[#76b900] font-bold">
          Verified Working State
        </span>
      </div>

      <div className="space-y-4">
        {iterations.length === 0 ? (
          <div className="p-8 text-center bg-card/40 border border-border/80 rounded-xl font-mono text-xs text-muted-foreground">
            No execution runs recorded in current session. Launch a mission in Mission Control to trigger real runs.
          </div>
        ) : (
          iterations.map((it) => (
            <div
              key={it.iteration}
              className={`p-5 rounded-xl border backdrop-blur-md transition-all shadow-xl ${
                it.passed
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-rose-500/10 border-rose-500/30"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40 font-mono">
                <div className="flex items-center gap-2.5">
                  {it.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  )}
                  <div>
                    <span className="text-sm font-bold text-foreground">
                      Iteration {it.iteration}: {it.action}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      Target: scenarios/{scenarioId}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" /> {it.duration_ms}ms
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    it.passed
                      ? "bg-emerald-400/20 text-emerald-300"
                      : "bg-rose-400/20 text-rose-300"
                  }`}>
                    {it.passed ? "ALL TESTS PASSED" : "FAILED ASSERTIONS"}
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
                <div className="p-2.5 rounded bg-black/40 border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase">Tests Passed</span>
                  <div className="text-base font-bold text-foreground mt-0.5">
                    {it.passed_tests} / {it.total_tests}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-black/40 border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase">Exit Code</span>
                  <div className={`text-base font-bold mt-0.5 ${it.exit_code === 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {it.exit_code}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-black/40 border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase">Runner Environment</span>
                  <div className="text-foreground font-semibold mt-0.5">
                    Pytest 8.x (Subprocess)
                  </div>
                </div>

                <div className="p-2.5 rounded bg-black/40 border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase">Action Taken</span>
                  <div className="text-cyan-400 font-semibold mt-0.5">
                    {it.iteration === 1 ? "Observed Failure" : "Applied Surgical Fix"}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
