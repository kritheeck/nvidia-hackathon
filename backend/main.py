"""
NEXUS Backend API Server
FastAPI application with WebSocket streaming for Engineering Mission Control.
Security: path traversal protection, command isolation, secret scrubbing, CORS.
Persistence: SQLite mission history with full event stream and replay capability.
"""
import asyncio
import json
import os
import sys
import time
from typing import Any, Dict, Optional, Set, List

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from orchestrator import EngineeringOrchestrator, OrchestratorState, AutonomyMode
from repository_intel import RepositoryIntel
from repo_manager import RepositoryManager
from model_client import get_telemetry
from mission_store import MissionStore
from security import validate_repo_path

app = FastAPI(
    title="NEXUS Autonomous Engineering Platform API",
    description=(
        "Autonomous Software Engineering Intelligence Platform — "
        "powered by NVIDIA NIM & Nebius Infrastructure"
    ),
    version="2.5.0",
)

# ── CORS — restrict to localhost origins only (hackathon/local dev) ───────────
# For public deployment: replace with your actual frontend domain.
_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)


# ── Connection Manager ─────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, event_type: str, data: Any):
        if not self.active_connections:
            return
        payload = json.dumps({"type": event_type, "data": data})
        stale = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                stale.append(connection)
        for s in stale:
            self.disconnect(s)


manager = ConnectionManager()
orchestrator = EngineeringOrchestrator(broadcast_fn=manager.broadcast)
mission_store = MissionStore()


# ── Request Models ─────────────────────────────────────────────────────────────

class MissionRunRequest(BaseModel):
    scenario_id: Optional[str] = None
    repo_id: Optional[str] = None
    objective: Optional[str] = None
    autonomy_mode: Optional[str] = "AUTONOMOUS"


class CommitRequest(BaseModel):
    branch_name: Optional[str] = None
    commit_message: Optional[str] = None


class ConnectRepoRequest(BaseModel):
    type: str  # "github" | "local"
    url_or_path: str
    name: Optional[str] = None


class SelectRepoRequest(BaseModel):
    repo_id: str


class SaveFileRequest(BaseModel):
    path: str
    content: str


# ── Health & Telemetry ─────────────────────────────────────────────────────────

@app.get("/api/health")
async def get_health():
    """Returns real system health, model info, and telemetry."""
    telem = get_telemetry()
    stats = mission_store.get_stats()
    return {
        "status": "HEALTHY",
        "python_version": sys.version.split()[0],
        "api_version": "2.5.0",
        "active_repo": orchestrator.active_repo_path,
        "active_scenario": orchestrator.active_scenario_id,
        "active_mission_id": orchestrator.active_mission_id,
        "nebius_infrastructure": "Nebius GPU Cluster (Europe-West / US)",
        "nvidia_inference_status": "CONNECTED" if telem.get("api_key_configured") else "OFFLINE_MODE",
        "default_model": telem.get("last_model", "meta/llama-3.2-11b-vision-instruct"),
        "sandbox_runner": "Native Subprocess Sandbox (isolated pytest, shell=False)",
        "websocket_clients": len(manager.active_connections),
        "mission_history": stats,
        "telemetry": telem,
    }


@app.get("/api/telemetry")
async def telemetry_endpoint():
    return get_telemetry()


# ── Repositories (Real Repos Manager) ─────────────────────────────────────────

@app.get("/api/repos")
async def list_repositories():
    """Returns all registered repositories (starters, cloned GitHub repos, local paths)."""
    repos = orchestrator.repo_manager.list_repositories()
    return {
        "repositories": repos,
        "active_repo_id": orchestrator.active_scenario_id,
        "active_repo": orchestrator.repo_manager.get_active_repo(),
    }


@app.post("/api/repos/connect")
async def connect_repository(req: ConnectRepoRequest):
    """Clones a GitHub repository or registers a local directory path."""
    try:
        if req.type.lower() == "github":
            repo_info = orchestrator.repo_manager.clone_github_repo(req.url_or_path, req.name)
        elif req.type.lower() == "local":
            repo_info = orchestrator.repo_manager.connect_local_repo(req.url_or_path, req.name)
        else:
            raise HTTPException(status_code=400, detail="Invalid repo type. Use 'github' or 'local'.")

        # Set as active
        orchestrator.active_repo_info = repo_info
        orchestrator.active_scenario_id = repo_info["id"]
        orchestrator.active_repo_path = repo_info["path"]

        # Broadcast update
        await manager.broadcast("REPO_SWITCHED", repo_info)
        return {"status": "CONNECTED", "repo": repo_info}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/repos/select")
async def select_repository(req: SelectRepoRequest):
    """Switches active repository."""
    ok = orchestrator.repo_manager.set_active_repo(req.repo_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Repository not found: {req.repo_id}")

    repo_info = orchestrator.repo_manager.get_active_repo()
    orchestrator.active_repo_info = repo_info
    orchestrator.active_scenario_id = repo_info["id"]
    orchestrator.active_repo_path = repo_info["path"]

    # Re-analyze new repo
    intel = RepositoryIntel(orchestrator.active_repo_path)
    analysis = intel.analyze()

    await manager.broadcast("REPO_SWITCHED", repo_info)
    await manager.broadcast("REPO_ANALYSIS", analysis)
    return {"status": "ACTIVE_REPO_UPDATED", "repo": repo_info, "analysis": analysis}


# ── Scenarios (Backward Compatibility) ────────────────────────────────────────

@app.get("/api/scenarios")
async def list_scenarios():
    """Backward compatibility endpoint for scenarios mapped to real repos."""
    repos = orchestrator.repo_manager.list_repositories()
    formatted = []
    for r in repos:
        formatted.append({
            "id": r["id"],
            "title": r["name"],
            "objective": r.get("default_objective") or f"Run engineering intelligence and test verification for {r['name']}.",
            "difficulty": "Intermediate",
            "stack": f"{r.get('language')} / {r.get('framework')}",
            "files_involved": r.get("files", [])[:4],
        })
    return {
        "scenarios": formatted,
        "active_scenario_id": orchestrator.active_scenario_id,
        "active_repo_path": orchestrator.active_repo_path,
    }


# ── Snapshot & Repo Tree ──────────────────────────────────────────────────────

@app.get("/api/snapshot")
async def get_system_snapshot():
    return orchestrator.get_snapshot()


@app.get("/api/repo/tree")
async def get_repo_tree():
    """Returns recursive file tree & AST architecture of active repo."""
    if not orchestrator.active_repo_path or not os.path.exists(orchestrator.active_repo_path):
        return {"tree": None, "architecture": None}
    intel = RepositoryIntel(orchestrator.active_repo_path)
    return {
        "tree": intel.build_tree_structure(),
        "architecture": intel.analyze(),
        "active_repo_id": orchestrator.active_scenario_id,
        "active_repo_path": orchestrator.active_repo_path,
    }


@app.get("/api/repo/file")
async def get_repo_file(path: str = Query(..., description="Relative file path within repo")):
    """Returns file content with path-traversal protection."""
    if not orchestrator.active_repo_path:
        raise HTTPException(status_code=400, detail="No active repository.")

    try:
        safe_path = validate_repo_path(orchestrator.active_repo_path, path)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        content = safe_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File is binary, not text-readable.")

    return {
        "path": path,
        "content": content,
        "size_bytes": len(content),
    }


@app.post("/api/repo/file")
async def save_repo_file(req: SaveFileRequest):
    """Saves edits to a file in the active repository."""
    if not orchestrator.active_repo_path:
        raise HTTPException(status_code=400, detail="No active repository.")

    try:
        safe_path = validate_repo_path(orchestrator.active_repo_path, req.path)
        safe_path.write_text(req.content, encoding="utf-8")
        return {"status": "SAVED", "path": req.path, "bytes_written": len(req.content)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Mission Control ────────────────────────────────────────────────────────────

# ── Mission run rate-limit state (prevents spam-launching) ────────────────────
_last_mission_start: float = 0.0
_MISSION_COOLDOWN_SECS: float = 10.0


@app.post("/api/mission/run")
async def run_mission(req: MissionRunRequest):
    global _last_mission_start

    if orchestrator.is_running:
        return {"error": "Mission already executing", "state": orchestrator.state.value}

    # Rate-limit: disallow re-launch within cooldown window
    now = time.time()
    elapsed = now - _last_mission_start
    if elapsed < _MISSION_COOLDOWN_SECS:
        wait = round(_MISSION_COOLDOWN_SECS - elapsed, 1)
        return {"error": f"Mission cooldown active. Please wait {wait}s.", "cooldown_remaining": wait}

    _last_mission_start = now
    target_repo = req.repo_id or req.scenario_id or orchestrator.active_scenario_id
    asyncio.create_task(
        orchestrator.run_mission(
            scenario_id=target_repo,
            objective=req.objective,
            autonomy_mode=req.autonomy_mode or "AUTONOMOUS",
        )
    )
    return {"status": "STARTED", "repo_id": target_repo, "objective": req.objective}


@app.post("/api/mission/abort")
async def abort_mission():
    orchestrator._abort_requested = True
    orchestrator.is_running = False
    await orchestrator.transition_to(OrchestratorState.STOPPED, "Mission manually aborted by operator.")
    return {"status": "ABORTED"}


@app.post("/api/git/commit")
async def commit_mission(req: CommitRequest):
    result = await orchestrator.commit_and_deliver()
    return result


@app.get("/api/runs")
async def get_runs():
    """Current session iteration history."""
    return {
        "active_scenario": orchestrator.active_scenario_id,
        "active_repo_path": orchestrator.active_repo_path,
        "active_mission_id": orchestrator.active_mission_id,
        "iterations": orchestrator.iterations,
        "verification_score": orchestrator.verification_score,
        "state": orchestrator.state.value,
    }


# ── Mission History (Persistence) ──────────────────────────────────────────────

@app.get("/api/missions")
async def list_missions(limit: int = 50, offset: int = 0):
    """List all past missions from persistent storage."""
    missions = mission_store.list_missions(limit=limit, offset=offset)
    stats = mission_store.get_stats()
    return {"missions": missions, "stats": stats}


@app.get("/api/missions/{mission_id}")
async def get_mission(mission_id: str):
    """Retrieve full mission record including snapshot and events."""
    mission = mission_store.get_mission(mission_id)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found.")
    events = mission_store.get_mission_events(mission_id)
    mission["events"] = events
    return mission


@app.post("/api/missions/{mission_id}/replay")
async def replay_mission(mission_id: str):
    """Re-broadcast all events for a past mission to connected WebSocket clients."""
    events = mission_store.get_mission_events(mission_id)
    if not events:
        raise HTTPException(status_code=404, detail="Mission not found or has no events.")

    async def _replay():
        for event in events:
            await manager.broadcast(event["type"], event["data"])
            await asyncio.sleep(0.05)

    asyncio.create_task(_replay())
    return {"status": "REPLAYING", "event_count": len(events)}


@app.get("/api/stats")
async def get_platform_stats():
    """Platform-wide statistics."""
    return mission_store.get_stats()


# ── WebSocket ──────────────────────────────────────────────────────────────────

@app.websocket("/ws/nexus")
async def websocket_nexus_stream(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send immediate snapshot to new client
        await websocket.send_text(json.dumps({
            "type": "SNAPSHOT",
            "data": orchestrator.get_snapshot(),
        }))
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
                action = msg.get("action")
                if action == "RUN_MISSION":
                    target_id = msg.get("repo_id") or msg.get("scenario_id") or orchestrator.active_scenario_id
                    asyncio.create_task(
                        orchestrator.run_mission(
                            scenario_id=target_id,
                            objective=msg.get("objective"),
                            autonomy_mode=msg.get("autonomy_mode", "AUTONOMOUS"),
                        )
                    )
                elif action == "COMMIT_DELIVERY":
                    asyncio.create_task(orchestrator.commit_and_deliver())
                elif action == "ABORT":
                    orchestrator._abort_requested = True
                    orchestrator.is_running = False
                    await orchestrator.transition_to(
                        OrchestratorState.STOPPED, "Aborted via WebSocket."
                    )
                elif action == "HEARTBEAT":
                    await websocket.send_text(
                        json.dumps({"type": "HEARTBEAT_ACK", "data": {"ts": msg.get("ts")}})
                    )
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
