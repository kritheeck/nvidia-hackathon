"use client";

import React from "react";
import { AlertTriangle, Stethoscope, Lightbulb, Wrench, ShieldAlert, CheckCircle2 } from "lucide-react";

interface DiagnosticProps {
  diagnostic: any;
  isRepaired?: boolean;
}

export function DiagnosticMatrix({ diagnostic, isRepaired = false }: DiagnosticProps) {
  if (!diagnostic) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-card/40 border border-border/80 rounded-xl">
        <Stethoscope className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <span className="text-xs font-mono text-muted-foreground">
          Diagnostic Engine Ready. Awaiting execution evidence.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-md border border-border/80 rounded-xl p-5 space-y-4 shadow-xl overflow-y-auto">
      {/* Category Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
            Root-Cause Diagnostic Matrix
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-400">
          {diagnostic.failure_category || "FAULT_DETECTED"}
        </span>
      </div>

      {/* Root Cause Card */}
      <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/25 space-y-1.5">
        <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-semibold uppercase">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Root Cause Diagnosis</span>
        </div>
        <p className="text-xs text-foreground/90 font-mono leading-relaxed">
          {diagnostic.root_cause}
        </p>
      </div>

      {/* Hypothesis */}
      <div className="p-3.5 rounded-lg bg-purple-500/10 border border-purple-500/25 space-y-1.5">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-mono font-semibold uppercase">
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Engineering Hypothesis</span>
        </div>
        <p className="text-xs text-foreground/90 font-mono leading-relaxed">
          {diagnostic.hypothesis}
        </p>
      </div>

      {/* Concrete Evidence */}
      {diagnostic.evidence && (
        <div className="p-3 rounded-lg bg-black/60 border border-border/60 space-y-1">
          <div className="text-[11px] font-mono text-muted-foreground uppercase flex items-center justify-between">
            <span>Execution Evidence (Pytest Traceback)</span>
            <span className="text-[10px] text-cyan-400">auth.py:test_admin_inherits_member</span>
          </div>
          <pre className="text-[11px] text-rose-300 font-mono p-2 overflow-x-auto whitespace-pre-wrap leading-tight bg-black/40 rounded">
            {diagnostic.evidence}
          </pre>
        </div>
      )}

      {/* Proposed / Applied Repair */}
      <div className={`p-3.5 rounded-lg border space-y-1.5 transition-all ${
        isRepaired 
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
          : "bg-amber-500/10 border-amber-500/30 text-amber-400"
      }`}>
        <div className="flex items-center justify-between text-xs font-mono font-semibold uppercase">
          <div className="flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5" />
            <span>{isRepaired ? "Repair Applied & Retested" : "Targeted Repair Strategy"}</span>
          </div>
          {isRepaired && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> VERIFIED FIX
            </span>
          )}
        </div>
        <p className="text-xs text-foreground/90 font-mono leading-relaxed">
          {diagnostic.proposed_repair}
        </p>
      </div>
    </div>
  );
}
