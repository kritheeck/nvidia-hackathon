"use client";

import React, { useState, useEffect } from "react";
import {
  FolderGit2,
  FileText,
  Code2,
  RefreshCw,
  Server,
  Plus,
  GitBranch,
  Github,
  HardDrive,
  Check,
  Save,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RepositoriesProps {
  treeData?: any;
  architecture?: any;
  onOpenFile?: (path: string) => void;
  onSelectRepo?: (repoId: string) => void;
}

export function RepositoriesView({
  treeData,
  architecture,
  onOpenFile,
  onSelectRepo,
}: RepositoriesProps) {
  const [repositories, setRepositories] = useState<any[]>([]);
  const [activeRepoId, setActiveRepoId] = useState<string>("rbac-service");
  const [selectedFile, setSelectedFile] = useState<string>("auth.py");
  const [fileContent, setFileContent] = useState<string>("");
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Connect Dialog State
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectType, setConnectType] = useState<"github" | "local">("github");
  const [repoUrlOrPath, setRepoUrlOrPath] = useState("");
  const [repoCustomName, setRepoCustomName] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Load repositories on mount
  const fetchRepositories = async () => {
    try {
      const res = await fetch("/api/repos");
      if (res.ok) {
        const data = await res.json();
        setRepositories(data.repositories || []);
        if (data.active_repo_id) {
          setActiveRepoId(data.active_repo_id);
        }
      }
    } catch (e) {
      console.error("Failed to load repositories:", e);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  const activeRepo = repositories.find((r) => r.id === activeRepoId) || {
    id: activeRepoId,
    name: "RBAC Role Hierarchy API",
    path: architecture?.repo_path || "repos/rbac-service",
    framework: architecture?.framework || "FastAPI",
    branch: "main",
    source_type: "starter",
  };

  // Derive file list from live backend architecture or active repo files
  const fileList: string[] =
    architecture?.files?.length
      ? architecture.files
      : activeRepo?.files?.length
      ? activeRepo.files
      : ["auth.py", "app.py", "test_rbac.py", "pytest.ini"];

  // Set default selected file when fileList changes
  useEffect(() => {
    if (fileList.length > 0 && (!selectedFile || !fileList.includes(selectedFile))) {
      setSelectedFile(fileList[0]);
    }
  }, [fileList]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFileContent = async (fileName: string) => {
    if (!fileName) return;
    setIsLoadingFile(true);
    setFileContent("");
    setFileError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/repo/file?path=${encodeURIComponent(fileName)}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content || "");
      } else {
        const errData = await res.json().catch(() => ({}));
        setFileError(errData.detail || `Backend returned HTTP ${res.status}`);
      }
    } catch (e: any) {
      setFileError(`Network error loading ${fileName}: ${e?.message || e}`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  useEffect(() => {
    fetchFileContent(selectedFile);
  }, [selectedFile, activeRepoId]);

  const handleSaveFile = async () => {
    setIsSavingFile(true);
    setFileError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/repo/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: selectedFile,
          content: fileContent,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        const err = await res.json().catch(() => ({}));
        setFileError(err.detail || "Failed to save file.");
      }
    } catch (e: any) {
      setFileError(`Save failed: ${e?.message || e}`);
    } finally {
      setIsSavingFile(false);
    }
  };

  const handleSelectRepo = async (repoId: string) => {
    if (repoId === activeRepoId) return;
    try {
      const res = await fetch("/api/repos/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repoId }),
      });
      if (res.ok) {
        setActiveRepoId(repoId);
        fetchRepositories();
        if (onSelectRepo) onSelectRepo(repoId);
      }
    } catch (e) {
      console.error("Failed to select repo:", e);
    }
  };

  const handleConnectRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrlOrPath.trim()) return;

    setIsConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/repos/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: connectType,
          url_or_path: repoUrlOrPath.trim(),
          name: repoCustomName.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        await fetchRepositories();
        if (data.repo?.id) {
          setActiveRepoId(data.repo.id);
        }
        setShowConnectModal(false);
        setRepoUrlOrPath("");
        setRepoCustomName("");
      } else {
        const err = await res.json().catch(() => ({}));
        setConnectError(err.detail || "Failed to connect repository.");
      }
    } catch (e: any) {
      setConnectError(e?.message || "Network error connecting repository.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Extract live AST symbols for selected file
  const fileSymbols = architecture?.symbols?.[selectedFile] || null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white flex items-center gap-2">
            <FolderGit2 className="w-6 h-6 text-[#76b900]" />
            Real Repository Intelligence
          </h2>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Connect any real GitHub repository or local directory. Inspect live AST topology, symbols, and test suites.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowConnectModal(true)}
            className="bg-[#76b900]/15 hover:bg-[#76b900]/25 text-[#76b900] border border-[#76b900]/40 font-mono text-xs gap-1.5 h-9"
          >
            <Plus className="w-3.5 h-3.5" />
            Connect Repository
          </Button>

          <Button
            variant="outline"
            onClick={fetchRepositories}
            className="h-9 px-3 border-border font-mono text-xs gap-1.5"
            title="Refresh repository list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Connected Repositories Ribbon */}
      <div className="bg-card/70 backdrop-blur-md border border-border/80 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
          <span className="text-[11px] font-mono font-bold uppercase text-foreground flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
            Connected Repositories ({repositories.length})
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            Click to switch active AI target
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {repositories.map((r) => {
            const isSelected = r.id === activeRepoId;
            return (
              <div
                key={r.id}
                onClick={() => handleSelectRepo(r.id)}
                className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#76b900]/10 border-[#76b900]/60 ring-1 ring-[#76b900]/40"
                    : "bg-muted/20 border-border/60 hover:bg-muted/40 hover:border-border"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-foreground truncate">
                      {r.name}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold shrink-0 ${
                        r.source_type === "github"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : r.source_type === "local"
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {r.source_type}
                    </span>
                  </div>

                  <p className="text-[11px] font-mono text-muted-foreground mt-1 line-clamp-1">
                    {r.description || r.path}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground">{r.framework || "Python"}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">{r.total_files || 4} files</span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[#76b900] font-bold">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: File Tree + AST Symbols (Col 4) & Code Viewer / Editor (Col 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: File Tree & AST Analysis */}
        <div className="lg:col-span-4 bg-card/60 backdrop-blur-md border border-border/80 rounded-xl p-4 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <span className="text-xs font-mono font-bold uppercase text-foreground">
              Repository Files ({fileList.length})
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              {activeRepo.branch || "main"}
            </span>
          </div>

          {/* File List */}
          <div className="space-y-1 font-mono text-xs max-h-72 overflow-y-auto pr-1">
            {fileList.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFile(f)}
                className={`w-full flex items-center justify-between p-2 rounded text-left transition ${
                  selectedFile === f
                    ? "bg-[#76b900]/15 text-[#76b900] border border-[#76b900]/40 font-bold"
                    : "bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{f}</span>
                </div>
                {f.includes("test") && (
                  <span className="text-[9px] px-1 rounded bg-purple-500/20 text-purple-300 shrink-0">
                    pytest
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Real AST Symbol Table */}
          <div className="pt-3 border-t border-border/60 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#76b900]" />
                Live AST Symbols ({selectedFile})
              </span>
              <span className="text-[9px] text-muted-foreground">ast.parse</span>
            </div>

            <div className="p-2.5 rounded bg-black/40 border border-border/40 space-y-1.5 text-[11px]">
              {fileSymbols ? (
                <>
                  {fileSymbols.classes && fileSymbols.classes.length > 0 && (
                    <div>
                      <strong className="text-cyan-400">Classes:</strong>{" "}
                      <span className="text-slate-300">
                        {fileSymbols.classes.join(", ")}
                      </span>
                    </div>
                  )}

                  {fileSymbols.functions && fileSymbols.functions.length > 0 && (
                    <div>
                      <strong className="text-emerald-400">Functions:</strong>{" "}
                      <span className="text-slate-300">
                        {fileSymbols.functions.join(", ")}
                      </span>
                    </div>
                  )}

                  {fileSymbols.imports && fileSymbols.imports.length > 0 && (
                    <div>
                      <strong className="text-purple-400">Imports:</strong>{" "}
                      <span className="text-slate-300">
                        {fileSymbols.imports.join(", ")}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground text-[10px] py-1">
                  {selectedFile.endsWith(".py")
                    ? "Standalone module or configuration file."
                    : `${selectedFile.split(".").pop()?.toUpperCase()} configuration asset.`}
                </div>
              )}
            </div>

            {/* Framework Runner info */}
            {architecture && (
              <div className="p-2.5 rounded bg-black/40 border border-border/40 space-y-1 text-[11px]">
                <div>
                  <strong className="text-muted-foreground">Framework:</strong>{" "}
                  <span className="text-foreground">
                    {architecture.framework || "Python Web API"}
                  </span>
                </div>
                <div>
                  <strong className="text-muted-foreground">Test Runner:</strong>{" "}
                  <span className="text-cyan-400 font-semibold">
                    {architecture.test_command || "pytest -v"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Code Viewer / Editor */}
        <div className="lg:col-span-8 bg-card/60 backdrop-blur-md border border-border/80 rounded-xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2 font-mono text-xs">
              <Code2 className="w-4 h-4 text-[#76b900]" />
              <span className="text-foreground font-bold">{selectedFile}</span>
              <span className="text-muted-foreground text-[11px]">
                ({fileContent.split("\n").length} lines)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Saved
                </span>
              )}
              {fileError && (
                <span className="text-[11px] font-mono text-rose-400 truncate max-w-xs" title={fileError}>
                  {fileError}
                </span>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchFileContent(selectedFile)}
                className="h-8 px-2.5 text-xs font-mono gap-1"
                title="Reload file from disk"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>

              <Button
                size="sm"
                onClick={handleSaveFile}
                disabled={isSavingFile || isLoadingFile}
                className="h-8 px-3 text-xs font-mono bg-[#76b900] hover:bg-[#68a300] text-black font-bold gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingFile ? "Saving..." : "Save File"}
              </Button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="relative font-mono text-xs rounded-lg overflow-hidden border border-border/60 bg-black/80">
            {isLoadingFile ? (
              <div className="h-96 flex items-center justify-center text-muted-foreground gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#76b900]" />
                Reading file from repository sandbox...
              </div>
            ) : (
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                rows={24}
                spellCheck={false}
                className="w-full h-[520px] bg-transparent p-4 font-mono text-xs text-slate-200 focus:outline-none resize-none leading-relaxed"
                placeholder="File contents will appear here..."
              />
            )}
          </div>
        </div>
      </div>

      {/* Connect Repository Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/80 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-[#76b900]" />
                Connect Real Repository
              </h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConnectRepo} className="space-y-4">
              <div className="flex rounded-lg p-1 bg-black/40 border border-border/60">
                <button
                  type="button"
                  onClick={() => setConnectType("github")}
                  className={`flex-1 py-1.5 text-xs font-mono rounded flex items-center justify-center gap-1.5 transition ${
                    connectType === "github"
                      ? "bg-[#76b900]/20 text-[#76b900] font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Github className="w-3.5 h-3.5" />
                  GitHub Clone
                </button>
                <button
                  type="button"
                  onClick={() => setConnectType("local")}
                  className={`flex-1 py-1.5 text-xs font-mono rounded flex items-center justify-center gap-1.5 transition ${
                    connectType === "local"
                      ? "bg-[#76b900]/20 text-[#76b900] font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  Local Path
                </button>
              </div>

              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase font-semibold block mb-1">
                  {connectType === "github" ? "GitHub Repository URL" : "Local Directory Absolute Path"}
                </label>
                <input
                  type="text"
                  required
                  value={repoUrlOrPath}
                  onChange={(e) => setRepoUrlOrPath(e.target.value)}
                  placeholder={
                    connectType === "github"
                      ? "https://github.com/owner/repository"
                      : "C:\\Users\\...\\my-project"
                  }
                  className="w-full bg-black/50 border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-[#76b900]"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase font-semibold block mb-1">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={repoCustomName}
                  onChange={(e) => setRepoCustomName(e.target.value)}
                  placeholder="e.g. My Production API"
                  className="w-full bg-black/50 border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-[#76b900]"
                />
              </div>

              {connectError && (
                <div className="p-2.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{connectError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConnectModal(false)}
                  className="font-mono text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isConnecting}
                  className="bg-[#76b900] hover:bg-[#68a300] text-black font-bold font-mono text-xs"
                >
                  {isConnecting ? "Connecting..." : connectType === "github" ? "Clone & Connect" : "Link Local Repo"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
