"""
NEXUS Backend API Server
FastAPI application with WebSocket streaming for Engineering Mission Control.
Security: path traversal protection, input validation, CORS.
Persistence: SQLite mission history with full event stream.
"""
import asyncio
import json
import os
import sys
from typing import Any, Dict, Optional, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from orchestrator import EngineeringOrchestrator, OrchestratorState, AutonomyMode
from repository_intel import RepositoryIntel
from scenarios_manager import ScenariosManager
from model_client import get_telemetry
from mission_store import MissionStore
from security import validate_repo_path

app = FastAPI(
    title="NEXUS Autonomous Engineering Platform API",
    description=(
        "Autonomous Software Engineering Intelligence Platform — "
        "powered by NVIDIA NIM & Nebius Infrastructure"
    ),
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    scenario_id: str = "rbac_guard"
    objective: Optional[str] = None
    autonomy_mode: Optional[str] = "AUTONOMOUS"


class CommitRequest(BaseModel):
    branch_name: Optional[str] = None
    commit_message: Optional[str] = None


# ── Health & Telemetry ─────────────────────────────────────────────────────────

@app.get("/api/health")
async def get_health():
    """Returns real system health, model info, and telemetry."""
    telem = get_telemetry()
    stats = mission_store.get_stats()
    return {
        "status": "HEALTHY",
        "python_version": sys.version.split()[0],
        "api_version": "2.1.0",
        "active_repo": orchestrator.active_repo_path,
        "active_scenario": orchestrator.active_scenario_id,
        "active_mission_id": orchestrator.active_mission_id,
        "nebius_infrastructure": "Nebius GPU Cluster (Europe-West / US)",
        "nvidia_inference_status": "CONNECTED" if telem.get("api_key_configured") else "OFFLINE_MODE",
        "default_model": telem.get("last_model", "meta/llama-3.2-11b-vision-instruct"),
        "sandbox_runner": "Native Subprocess Sandbox (shell=False, allowlisted commands)",
        "websocket_clients": len(manager.active_connections),
        "mission_history": stats,
        "telemetry": telem,
    }


@app.get("/api/telemetry")
async def telemetry_endpoint():
    return get_telemetry()


# ── Scenarios ──────────────────────────────────────────────────────────────────

@app.get("/api/scenarios")
async def list_scenarios():
    sc_mgr = ScenariosManager()
    return {
        "scenarios": sc_mgr.list_scenarios(),
        "active_scenario_id": orchestrator.active_scenario_id,
        "active_repo_path": orchestrator.active_repo_path,
    }


# ── Snapshot & Repo ────────────────────────────────────────────────────────────

@app.get("/api/snapshot")
async def get_system_snapshot():
    return orchestrator.get_snapshot()


@app.get("/api/repo/tree")
async def get_repo_tree():
    if not orchestrator.active_repo_path or not os.path.exists(orchestrator.active_repo_path):
        return {"tree": None, "architecture": None}
    intel = RepositoryIntel(orchestrator.active_repo_path)
    return {
        "tree": intel.build_tree_structure(),
        "architecture": intel.analyze(),
    }


@app.get("/api/repo/file")
async def get_repo_file(path: str = Query(..., description="Relative file path within repo")):
    """
    Returns file content with path-traversal protection.
    Any attempt to escape the repo root results in HTTP 403.
    """
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


# ── Mission Control ────────────────────────────────────────────────────────────

@app.post("/api/mission/run")
async def run_mission(req: MissionRunRequest):
    if orchestrator.is_running:
        return {"error": "Mission already executing", "state": orchestrator.state.value}
    asyncio.create_task(
        orchestrator.run_mission(
            scenario_id=req.scenario_id,
            objective=req.objective,
        )
    )
    return {"status": "STARTED", "scenario_id": req.scenario_id}


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
                    asyncio.create_task(
                        orchestrator.run_mission(
                            scenario_id=msg.get("scenario_id", "rbac_guard"),
                            objective=msg.get("objective"),
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
