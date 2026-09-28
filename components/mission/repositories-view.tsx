"use client";

import React, { useState, useEffect } from "react";
import { FolderGit2, FileText, Code2, RefreshCw, Server } from "lucide-react";

interface RepositoriesProps {
  treeData: any;
  architecture: any;
  onOpenFile?: (path: string) => void;
}

export function RepositoriesView({
  treeData,
  architecture,
  onOpenFile,
}: RepositoriesProps) {
  const [selectedFile, setSelectedFile] = useState<string>("auth.py");
  const [fileContent, setFileContent] = useState<string>("");
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Derive file list from live backend architecture or fallback to scenario defaults
  const fileList: string[] =
    architecture?.files?.length
      ? architecture.files
      : ["auth.py", "app.py", "test_rbac.py", "pytest.ini"];

  const fetchFileContent = async (fileName: string) => {
    setIsLoadingFile(true);
    setFileContent("");
    setFileError(null);
    try {
      const res = await fetch(
        `/api/repo/file?path=${encodeURIComponent(fileName)}`
      );
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content || "");
      } else {
        const errData = await res.json().catch(() => ({}));
        setFileError(
          errData.detail ||
            `Backend returned HTTP ${res.status} for ${fileName}`
        );
      }
    } catch (e: any) {
      setFileError(`Network error loading ${fileName}: ${e?.message || e}`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Fetch file whenever selection changes
  useEffect(() => {
    fetchFileContent(selectedFile);
  }, [selectedFile]);

  const handleSelect = (fileName: string) => {
    if (fileName !== selectedFile) {
      setSelectedFile(fileName);
    }
  };

  // Active repo path from architecture or treeData
  const activeRepo =
    architecture?.active_repo_path ||
    treeData?.root ||
    "scenarios/rbac_guard";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-white">
            Repository Intelligence
          </h2>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Live source files, AST topology, symbol extraction, and dependency
            relationships.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-[#76b900]">
          <FolderGit2 className="w-4 h-4" />
          <span className="truncate max-w-[280px]">
            Active:{" "}
            {activeRepo.includes("scenarios")
              ? activeRepo.split("scenarios")[1]?.replace(/\\/g, "/") ||
                activeRepo
              : activeRepo}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* File Tree & AST Symbols (Col 4) */}
        <div className="lg:col-span-4 bg-card/60 backdrop-blur-md border border-border/80 rounded-xl p-4 shadow-xl space-y-4">
          <div className="text-xs font-mono font-bold uppercase text-foreground pb-2 border-b border-border/60">
            Source Tree &amp; Symbols
          </div>

          <div className="space-y-1 font-mono text-xs">
            {fileList.map((f) => (
              <button
                key={f}
                onClick={() => handleSelect(f)}
                className={`w-full flex items-center justify-between p-2 rounded text-left transition ${
                  selectedFile === f
                    ? "bg-[#76b900]/15 text-[#76b900] border border-[#76b900]/40 font-bold"
                    : "bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>{f}</span>
                </div>
                {f === "auth.py" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 shrink-0">
                    Patched
                  </span>
                )}
                {f.startsWith("test_") && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 shrink-0">
                    pytest
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* AST Symbol Table */}
          <div className="pt-3 border-t border-border/60 space-y-2 font-mono text-xs">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">
              AST Extracted Symbols ({selectedFile})
            </span>
            <div className="p-2.5 rounded bg-black/40 border border-border/40 space-y-1 text-[11px]">
              {selectedFile === "auth.py" && (
                <>
                  <div>
                    <strong className="text-cyan-400">Classes:</strong>{" "}
                    UserContext
                  </div>
                  <div>
                    <strong className="text-emerald-400">Functions:</strong>{" "}
                    authenticate_token, check_permission
                  </div>
                  <div>
                    <strong className="text-purple-400">Imports:</strong>{" "}
                    typing.Optional, typing.Dict
                  </div>
                </>
              )}
              {selectedFile === "app.py" && (
                <>
                  <div>
                    <strong className="text-cyan-400">Classes:</strong>{" "}
                    MockResponse
                  </div>
                  <div>
                    <strong className="text-emerald-400">Functions:</strong>{" "}
                    handle_request
                  </div>
                  <div>
                    <strong className="text-purple-400">Imports:</strong> auth
                    (authenticate_token, check_permission)
                  </div>
                </>
              )}
              {selectedFile.startsWith("test_") && (
                <>
                  <div>
                    <strong className="text-cyan-400">Test Cases:</strong> 7
                    assertions
                  </div>
                  <div>
                    <strong className="text-emerald-400">Framework:</strong>{" "}
                    pytest 9.x
                  </div>
                  <div>
                    <strong className="text-purple-400">Imports:</strong> pytest,
                    app.handle_request
                  </div>
                </>
              )}
              {selectedFile === "pytest.ini" && (
                <>
                  <div>
                    <strong className="text-cyan-400">Config:</strong> pytest.ini
                  </div>
                  <div>
                    <strong className="text-emerald-400">Patterns:</strong>{" "}
                    test_*.py
                  </div>
                </>
              )}
            </div>

            {/* Framework Info from Backend */}
            {architecture && (
              <div className="p-2.5 rounded bg-black/40 border border-border/40 space-y-1 text-[11px]">
                <div>
                  <strong className="text-muted-foreground">Framework:</strong>{" "}
                  <span className="text-foreground">
                    {architecture.framework || "Python"}
                  </span>
                </div>
                <div>
                  <strong className="text-muted-foreground">Runner:</strong>{" "}
                  <span className="text-cyan-400">
                    {architecture.test_command || "pytest -v"}
                  </span>
                </div>
                <div>
                  <strong className="text-muted-foreground">Files:</strong>{" "}
                  <span className="text-foreground">
                    {architecture.total_files || fileList.length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Source Code Viewer (Col 8) */}
        <div className="lg:col-span-8 bg-black/90 border border-border/80 rounded-xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b border-border/60 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-foreground">{selectedFile}</span>
            </div>
            <div className="flex items-center gap-3">
              {isLoadingFile && (
                <RefreshCw className="w-3 h-3 text-muted-foreground animate-spin" />
              )}
              <div className="flex items-center gap-1.5">
                <Server className="w-3 h-3 text-[#76b900]" />
                <span className="text-[10px] text-muted-foreground">
                  Live from Backend API
                </span>
              </div>
            </div>
          </div>

          {isLoadingFile ? (
            <div className="p-4 font-mono text-xs text-muted-foreground text-center py-12">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#76b900]/60" />
              Loading {selectedFile} from active repository...
            </div>
          ) : fileError ? (
            <div className="p-4 font-mono text-xs text-rose-400 py-12 text-center">
              <p className="font-bold mb-1">Could not load file</p>
              <p className="text-muted-foreground text-[11px]">{fileError}</p>
              <p className="text-muted-foreground text-[11px] mt-2">
                Run a mission first to provision the scenario repository.
              </p>
            </div>
          ) : (
            <pre className="p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[460px] leading-relaxed whitespace-pre-wrap break-words">
              {fileContent ||
                `# ${selectedFile} — No content returned from backend. Run a mission to populate the scenario.`}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
