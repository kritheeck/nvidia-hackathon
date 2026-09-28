"use client";

import React, { useState } from "react";
import { FileCode, Plus, Minus, Check, Copy } from "lucide-react";

interface DiffProps {
  diffData: any;
}

export function DiffViewer({ diffData }: DiffProps) {
  const [copied, setCopied] = useState(false);

  if (!diffData || !diffData.diffs || diffData.diffs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-card/40 border border-border/80 rounded-xl">
        <FileCode className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <span className="text-xs font-mono text-muted-foreground">
          Code Intelligence Ready. Unified patch diff will render here after self-healing repair.
        </span>
      </div>
    );
  }

  const activeDiff = diffData.diffs[0];
  const lines = (activeDiff.diff_text || "").split("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(activeDiff.diff_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-black/90 border border-border/80 rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
      {/* Diff Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted/60 text-foreground font-semibold text-xs border border-border">
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>{activeDiff.file_path}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-emerald-400 flex items-center">
              <Plus className="w-3 h-3" /> {diffData.total_insertions}
            </span>
            <span className="text-rose-400 flex items-center">
              <Minus className="w-3 h-3" /> {diffData.total_deletions}
            </span>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted/40 hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground transition"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? "Copied" : "Copy Diff"}</span>
        </button>
      </div>

      {/* Unified Diff Content */}
      <div className="flex-1 p-4 overflow-y-auto space-y-0.5 select-text bg-[#0a0c10]">
        {lines.map((line: string, idx: number) => {
          let bg = "hover:bg-muted/10";
          let textColor = "text-slate-300";
          let symbol = " ";

          if (line.startsWith("+") && !line.startsWith("+++")) {
            bg = "bg-emerald-500/15 border-l-2 border-emerald-500";
            textColor = "text-emerald-300 font-semibold";
            symbol = "+";
          } else if (line.startsWith("-") && !line.startsWith("---")) {
            bg = "bg-rose-500/15 border-l-2 border-rose-500";
            textColor = "text-rose-300";
            symbol = "-";
          } else if (line.startsWith("@@")) {
            textColor = "text-cyan-400 font-bold bg-cyan-950/30 px-1 rounded";
          }

          return (
            <div
              key={idx}
              className={`flex items-start font-mono leading-relaxed text-[11px] px-2 py-0.5 rounded transition ${bg} ${textColor}`}
            >
              <span className="w-6 text-muted-foreground/60 select-none text-right mr-3 text-[10px]">
                {idx + 1}
              </span>
              <span className="whitespace-pre-wrap break-all flex-1">
                {line}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rationale Footer */}
      <div className="px-4 py-2 bg-muted/15 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>
          Rationale:{" "}
          <strong>
            {diffData?.rationale ||
              activeDiff?.rationale ||
              `Surgical patch applied to ${activeDiff?.file_path || "source files"}.`}
          </strong>
        </span>
        <span className="text-[#76b900] font-semibold">
          {diffData?.diffs?.length || 1} File{(diffData?.diffs?.length || 1) > 1 ? "s" : ""} Surgically Patched
        </span>
      </div>
    </div>
  );
}
