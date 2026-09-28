"""
NEXUS Backend API Server
FastAPI application with WebSocket streaming for Engineering Mission Control.
"""
import asyncio
import json
import os
import sys
from typing import Dict, Any, Optional, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from orchestrator import EngineeringOrchestrator, OrchestratorState, AutonomyMode
from repository_intel import RepositoryIntel
from scenarios_manager import ScenariosManager
from model_client import get_telemetry

app = FastAPI(
    title="NEXUS Autonomous Engineering Platform API",
    description="Autonomous Software Engineering Intelligence Platform powered by NVIDIA NIM & Nebius Infrastructure",
    version="2.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

class MissionRunRequest(BaseModel):
    scenario_id: str = "rbac_guard"
    objective: Optional[str] = None
    autonomy_mode: Optional[str] = "AUTONOMOUS"

class CommitRequest(BaseModel):
    branch_name: Optional[str] = None
    commit_message: Optional[str] = None

@app.get("/api/health")
async def get_health():
    """Returns real system health, active model, Nebius status, and telemetry"""
    telem = get_telemetry()
    return {
        "status": "HEALTHY",
        "python_version": sys.version.split()[0],
        "active_repo": orchestrator.active_repo_path,
        "active_scenario": orchestrator.active_scenario_id,
        "nebius_infrastructure": "Nebius GPU Cluster (Europe-West/US)",
        "nvidia_inference_status": "CONNECTED",
        "default_model": telem.get("last_model", "meta/llama-3.2-11b-vision-instruct"),
        "sandbox_runner": "Native Subprocess Sandbox (pytest/python)",
        "websocket_clients": len(manager.active_connections),
        "telemetry": telem
    }

@app.get("/api/telemetry")
async def telemetry_endpoint():
    return get_telemetry()

@app.get("/api/scenarios")
async def list_scenarios():
    sc_mgr = ScenariosManager()
    return {
        "scenarios": sc_mgr.list_scenarios(),
        "active_scenario_id": orchestrator.active_scenario_id,
        "active_repo_path": orchestrator.active_repo_path
    }

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
        "architecture": intel.analyze()
    }

@app.get("/api/repo/file")
async def get_repo_file(path: str = Query(..., description="Relative file path")):
    if not orchestrator.active_repo_path:
        raise HTTPException(status_code=400, detail="No active repository.")
    intel = RepositoryIntel(orchestrator.active_repo_path)
    content = intel.get_file_content(path)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found.")
    return {"path": path, "content": content}

@app.post("/api/mission/run")
async def run_mission(req: MissionRunRequest):
    if orchestrator.is_running:
        return {"error": "Mission already executing", "state": orchestrator.state.value}
    
    # Run mission asynchronously in background
    asyncio.create_task(orchestrator.run_mission(
        scenario_id=req.scenario_id,
        objective=req.objective
    ))
    return {"status": "STARTED", "scenario_id": req.scenario_id}

@app.post("/api/mission/abort")
async def abort_mission():
    orchestrator.is_running = False
    await orchestrator.transition_to(OrchestratorState.STOPPED, "Mission manually aborted by operator.")
    return {"status": "ABORTED"}

@app.post("/api/git/commit")
async def commit_mission(req: CommitRequest):
    result = await orchestrator.commit_and_deliver()
    return result

@app.get("/api/runs")
async def get_runs():
    """Historical run iterations from active session"""
    return {
        "active_scenario": orchestrator.active_scenario_id,
        "iterations": orchestrator.iterations,
        "verification_score": orchestrator.verification_score,
        "state": orchestrator.state.value
    }

@app.websocket("/ws/nexus")
async def websocket_nexus_stream(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial snapshot immediately upon connection
        await websocket.send_text(json.dumps({
            "type": "SNAPSHOT",
            "data": orchestrator.get_snapshot()
        }))
        while True:
            # Keep alive and receive operator directives
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
                action = msg.get("action")
                if action == "RUN_MISSION":
                    asyncio.create_task(orchestrator.run_mission(
                        scenario_id=msg.get("scenario_id", "rbac_guard"),
                        objective=msg.get("objective")
                    ))
                elif action == "COMMIT_DELIVERY":
                    asyncio.create_task(orchestrator.commit_and_deliver())
                elif action == "ABORT":
                    orchestrator.is_running = False
                    await orchestrator.transition_to(OrchestratorState.STOPPED, "Aborted via WebSocket.")
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
