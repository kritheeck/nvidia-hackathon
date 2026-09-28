"use client";

import React from "react";
import { 
  FolderGit2, Binary, ListOrdered, Code2, Play, 
  AlertTriangle, Stethoscope, Wrench, CheckCircle2, GitPullRequest 
} from "lucide-react";

interface PipelineProps {
  currentState: string;
}

const STAGES = [
  { id: "INGESTING_REPOSITORY", label: "Repo Ingest", icon: FolderGit2, desc: "Topology & AST Scan" },
  { id: "ANALYZING", label: "Analyzer", icon: Binary, desc: "Framework & Symbols" },
  { id: "PLANNING", label: "Planner", icon: ListOrdered, desc: "NVIDIA Reasoning" },
  { id: "IMPLEMENTING", label: "Implementer", icon: Code2, desc: "Patch Synthesis" },
  { id: "EXECUTING", label: "Sandbox", icon: Play, desc: "Subprocess Runner" },
  { id: "TESTING", label: "Testing", icon: Play, desc: "Native Pytest Suite" },
  { id: "DIAGNOSING", label: "Diagnosis", icon: Stethoscope, desc: "Root Cause Engine" },
  { id: "REPAIRING", label: "Repair Loop", icon: Wrench, desc: "Self-Healing Patch" },
  { id: "VERIFYING", label: "Verification", icon: CheckCircle2, desc: "Regression Guard" },
  { id: "READY_FOR_DELIVERY", label: "Delivery", icon: GitPullRequest, desc: "GitHub PR & Branch" },
];

export function AgentPipeline({ currentState }: PipelineProps) {
  // Determine progress index
  const currentIndex = STAGES.findIndex(s => s.id === currentState);
  const isFailed = currentState === "FAILED";

  return (
    <div className="w-full bg-card/60 backdrop-blur-md border border-border/80 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#76b900] animate-pulse" />
          <span className="text-xs font-mono font-semibold tracking-wider uppercase text-foreground">
            Autonomous Pipeline Lifecycle
          </span>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
          STATE: <strong className="text-foreground">{currentState}</strong>
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isActive = stage.id === currentState || (stage.id === "TESTING" && isFailed);
          const isDone = currentIndex > idx && !isFailed;
          const isFailureNode = isFailed && (stage.id === "TESTING" || stage.id === "EXECUTING");

          let nodeStyle = "border-border/60 bg-muted/30 text-muted-foreground";
          let iconColor = "text-muted-foreground";

          if (isDone) {
            nodeStyle = "border-[#76b900]/40 bg-[#76b900]/10 text-foreground";
            iconColor = "text-[#76b900]";
          } else if (isFailureNode) {
            nodeStyle = "border-destructive/80 bg-destructive/15 text-destructive animate-pulse";
            iconColor = "text-destructive";
          } else if (isActive) {
            nodeStyle = "border-sky-500/80 bg-sky-500/15 text-sky-400 ring-2 ring-sky-500/30 shadow-lg";
            iconColor = "text-sky-400";
          }

          return (
            <div
              key={stage.id}
              className={`relative flex flex-col items-center text-center p-2 rounded-lg border transition-all duration-300 ${nodeStyle}`}
            >
              <div className="p-1.5 rounded-md mb-1.5 bg-background/50">
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <span className="text-[11px] font-mono font-medium leading-tight truncate w-full">
                {stage.label}
              </span>
              <span className="text-[9px] text-muted-foreground/80 truncate w-full mt-0.5">
                {stage.desc}
              </span>

              {isDone && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#76b900]" />
              )}
              {isFailureNode && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive animate-ping" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
