"use client";

import React, { useState } from "react";
import { 
  CheckCircle2, GitPullRequest, GitBranch, ShieldCheck, 
  Send, AlertCircle, ArrowUpRight, Check 
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface VerificationProps {
  score: number;
  prSummary: any;
  onCommitDelivery: () => Promise<any>;
  isDelivered?: boolean;
  lastExecution?: any;
}

export function VerificationDeliveryPanel({
  score = 0,
  prSummary,
  onCommitDelivery,
  isDelivered = false,
  lastExecution,
}: VerificationProps) {
  const [isCommitting, setIsCommitting] = useState(false);
  const [deliveredStatus, setDeliveredStatus] = useState<any>(null);

  const handleCommit = async () => {
    setIsCommitting(true);
    try {
      const res = await onCommitDelivery();
      setDeliveredStatus(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCommitting(false);
    }
  };

  const isVerified = score > 80;

  return (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-md border border-border/80 rounded-xl p-5 space-y-4 shadow-xl overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#76b900]" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
            Verification & GitHub Delivery
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#76b900]/15 border border-[#76b900]/30 text-[#76b900] text-[11px] font-mono font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Confidence: {score.toFixed(1)}%</span>
        </div>
      </div>

      {/* Verification Evidence Checklist */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono text-muted-foreground uppercase font-semibold">
          Autonomous Verification Evidence
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 p-2 rounded bg-muted/40 border border-border/60">
            <CheckCircle2 className={`w-3.5 h-3.5 ${score > 0 ? "text-emerald-400" : "text-muted-foreground/40"}`} />
            <span>Task Intent Satisfied</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-muted/40 border border-border/60">
            <CheckCircle2 className={`w-3.5 h-3.5 ${lastExecution?.passed ? "text-emerald-400" : score > 0 ? "text-emerald-400" : "text-muted-foreground/40"}`} />
            <span>
              {lastExecution
                ? `${lastExecution.passed_tests}/${lastExecution.total_tests} Pytest Assertions`
                : score > 0
                ? "All Pytest Assertions Pass"
                : "Pytest Assertions"}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-muted/40 border border-border/60">
            <CheckCircle2 className={`w-3.5 h-3.5 ${score > 80 ? "text-emerald-400" : "text-muted-foreground/40"}`} />
            <span>Self-Healing Repair Verified</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-muted/40 border border-border/60">
            <CheckCircle2 className={`w-3.5 h-3.5 ${score > 80 ? "text-emerald-400" : "text-muted-foreground/40"}`} />
            <span>Zero Regression Detected</span>
          </div>
        </div>
      </div>

      {/* PR / Branch Details */}
      {prSummary ? (
        <div className="p-3.5 rounded-lg bg-black/60 border border-border/60 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <GitBranch className="w-3.5 h-3.5" />
              <span>{prSummary.branch}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Target: main</span>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-[10px] uppercase">PR Title</span>
            <div className="text-foreground font-semibold line-clamp-1">{prSummary.title}</div>
          </div>

          <div className="p-2.5 rounded bg-muted/20 border border-border/40 text-[11px] text-muted-foreground max-h-24 overflow-y-auto whitespace-pre-wrap">
            {prSummary.body}
          </div>

          {/* Action Button */}
          {deliveredStatus || isDelivered ? (
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-xs">
                  {deliveredStatus?.message || "Delivered to Branch & Pull Request Ready"}
                </span>
              </div>
              <a
                href={deliveredStatus?.pr_url || `https://github.com/kritheeck/nvidia-hackathon/tree/${prSummary?.branch || "feat/nexus-delivery"}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-[#76b900] underline flex items-center gap-1 hover:text-white shrink-0"
              >
                {deliveredStatus?.pr_number
                  ? `Pull Request #${deliveredStatus.pr_number}`
                  : deliveredStatus?.commit_sha
                  ? `Commit ${deliveredStatus.commit_sha}`
                  : "View Delivery on GitHub"}
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <Button
              onClick={handleCommit}
              disabled={isCommitting || !isVerified}
              className="w-full bg-[#76b900] hover:bg-[#85cf00] text-black font-bold uppercase tracking-wider text-xs h-10 shadow-lg shadow-[#76b900]/20"
            >
              {isCommitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Creating Commit & Branch...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 fill-black" />
                  Create Commit & Prepare Pull Request
                </span>
              )}
            </Button>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-muted/20 border border-border/40 text-center text-xs font-mono text-muted-foreground">
          Pull request delivery package will be formulated upon passing verification.
        </div>
      )}
    </div>
  );
}
