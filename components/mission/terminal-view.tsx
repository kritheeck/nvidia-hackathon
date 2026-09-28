"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal as TerminalIcon, Play, AlertCircle, CheckCircle, Copy, Check } from "lucide-react";

interface TerminalProps {
  lines: string[];
  lastExecution?: any;
}

export function TerminalView({ lines = [], lastExecution }: TerminalProps) {
  const [filter, setFilter] = useState<"all" | "cmd" | "errors" | "tests">("all");
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const filteredLines = lines.filter((l) => {
    if (filter === "cmd") return l.includes("[CMD]") || l.includes("$");
    if (filter === "errors") return l.includes("[STDERR]") || l.includes("FAILED") || l.includes("ERROR");
    if (filter === "tests") return l.includes("test_") || l.includes("passed") || l.includes("failed");
    return true;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-black/90 border border-border/80 rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b border-border/60">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-foreground/90 tracking-wide text-[11px] uppercase">
            Execution Sandbox Terminal
          </span>
          <span className="text-[10px] text-muted-foreground">
            (Native Subprocess Isolation)
          </span>
        </div>

        {/* Filter Pills & Copy */}
        <div className="flex items-center gap-1.5">
          {(["all", "cmd", "tests", "errors"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-2 py-0.5 rounded text-[10px] uppercase font-medium transition ${
                filter === t
                  ? "bg-foreground text-background font-semibold"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}

          <button
            onClick={handleCopy}
            className="ml-2 p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition"
            title="Copy Terminal Logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-1 select-text">
        {filteredLines.length === 0 ? (
          <div className="text-muted-foreground/60 italic py-6 text-center">
            No terminal output captured yet. Run a mission to stream real execution logs.
          </div>
        ) : (
          filteredLines.map((line, idx) => {
            let color = "text-slate-300";
            if (line.includes("[CMD]") || line.includes("$ pytest")) {
              color = "text-cyan-400 font-bold";
            } else if (line.includes("FAILED") || line.includes("[STDERR]") || line.includes("AssertionError")) {
              color = "text-rose-400 font-semibold";
            } else if (line.includes("PASSED") || line.includes("passed in")) {
              color = "text-emerald-400 font-medium";
            } else if (line.includes("===")) {
              color = "text-amber-400";
            } else if (line.includes("ROOT CAUSE") || line.includes("HYPOTHESIS")) {
              color = "text-purple-400 font-semibold";
            }

            return (
              <div key={idx} className={`leading-relaxed whitespace-pre-wrap break-all ${color}`}>
                {line}
              </div>
            );
          })
        )}
      </div>

      {/* Terminal Footer Status */}
      {lastExecution && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-muted/10 border-t border-border/40 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>Duration: <strong className="text-foreground">{lastExecution.duration_ms}ms</strong></span>
            <span>Exit Code: <strong className={lastExecution.exit_code === 0 ? "text-emerald-400" : "text-rose-400"}>{lastExecution.exit_code}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span>Tests: <strong className="text-foreground">{lastExecution.passed_tests}/{lastExecution.total_tests}</strong></span>
            {lastExecution.passed ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> VERIFIED
              </span>
            ) : (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> FAILED
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
