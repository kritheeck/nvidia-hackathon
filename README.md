# NEXUS: Autonomous Software Engineering Intelligence Platform

> **"Software agents should not stop at generating code. They should take responsibility for getting software to a verified working state."**

[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA-NIM_Reasoning-76B900?logo=nvidia&logoColor=white)](https://build.nvidia.com)
[![Nebius Infrastructure](https://img.shields.io/badge/Nebius-GPU_Cloud-00D8F6)](https://nebius.ai)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_Subprocess-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js_16_Turbopack-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![Pytest Sandbox](https://img.shields.io/badge/Sandbox-Native_Pytest_Isolation-3776AB?logo=pytest&logoColor=white)](https://pytest.org)

---

## 1. Problem & Product Thesis

Current AI code generation tools generate suggestions and immediately abandon the developer. If the generated code introduces runtime exceptions, permission inversions, or test regressions, the human engineer must spend hours debugging and verifying.

**NEXUS takes full ownership of the software engineering loop:**
1. **Understands** real codebases via progressive AST symbol discovery.
2. **Plans** surgical engineering remediations using NVIDIA open-source reasoning models on Nebius GPU infrastructure.
3. **Executes** code and test suites inside process-isolated native sandboxes.
4. **Observes** actual stdout/stderr, stack traces, and pytest assertion failures.
5. **Diagnoses** the exact root cause, isolating the failing logic from runtime evidence.
6. **Repairs** the code with targeted surgical patches.
7. **Retests** to confirm zero regressions and verify the outcome.
8. **Prepares** Git branch, commit, and Pull Request delivery for human sign-off.

---

## 2. The Core Self-Healing Loop

```
              USER INTENT / ENGINEERING OBJECTIVE
                               │
                               ▼
               REPOSITORY AST & TOPOLOGY DISCOVERY
                               │
                               ▼
                   STRUCTURED ENGINEERING PLAN
                               │
                               ▼
               FIRST IMPLEMENTATION (SURGICAL PATCH)
                               │
                               ▼
               REAL SUBPROCESS SANDBOX EXECUTION
                               │
                     ┌─────────┴─────────┐
                     ▼                   ▼
           ALL TESTS PASS          TEST ASSERTION FAILURE
                 │                       │
                 │                       ▼
                 │            ROOT-CAUSE DIAGNOSTIC ENGINE
                 │                       │
                 │                       ▼
                 │            AUTONOMOUS REPAIR ENGINE
                 │                       │
                 │                       ▼
                 │            RE-EXECUTION & RETESTING
                 │                       │
                 └───────────────┬───────┘
                                 ▼
                     EVIDENCE-BASED VERIFICATION
                     (Confidence Score: 98.4%)
                                 │
                                 ▼
                     GIT DELIVERY & PULL REQUEST
```

---

## 3. System Architecture

The NEXUS platform is built from first principles into decoupled, modular layers:

- **AI Engineering Mission Control UI (`Next.js 16` + `React 19` + `Tailwind CSS v4`)**:
  - Incorporates the visual sophistication, animations, and component library from `./vo-template`.
  - **Live 3D Nexus Core**: Three.js WebGL canvas reacting dynamically to the 10-stage execution state machine.
  - **Execution Sandbox Terminal**: Live stdout/stderr streaming from native subprocess runs.
  - **Root-Cause Diagnostic Matrix**: Structured presentation of failure categories, hypotheses, and traceback evidence.
  - **Unified Diff Viewer**: Syntax-highlighted line-by-line patch viewer.
  - **Verification & GitHub Delivery Panel**: Automated branch generation and pull request synthesis.

- **Application API & Orchestrator (`FastAPI` + `Python 3.12`)**:
  - Runs on port `8000`.
  - Real-time WebSocket event bus (`/ws/nexus`) broadcasting state transitions, terminal streams, and telemetry.
  - Fully bounded state machine preventing unbounded loops (`MAX_ITERATIONS = 3`, `COMMAND_TIMEOUT = 30s`).

- **Model Intelligence Client (`backend/model_client.py`)**:
  - NVIDIA NIM endpoint: `meta/llama-3.2-11b-vision-instruct` and `nvidia/nemotron-4-340b-instruct`.
  - Nebius GPU Cloud Cluster support.
  - Real measured telemetry: latency in milliseconds, token counts, and provider attribution.
  - Built-in resilient fallback engine for deterministic offline demonstrations.

- **Controlled Execution Sandbox (`backend/execution_engine.py`)**:
  - Executes native pytest commands in subprocess isolation.
  - Automatic environment scrubbing to prevent leaking secrets (`NVIDIA_API_KEY`, `GITHUB_TOKEN`) to untrusted code.
  - Hard timeouts and stdout/stderr capture.

- **Deterministic Demonstration Scenario (`backend/scenarios_manager.py`)**:
  - **Scenario**: `rbac_guard` (Role Hierarchy & Regression Guard).
  - Objective: *"Enforce hierarchical role inheritance so admin users seamlessly access member workspace settings without 403 Forbidden errors."*
  - **Attempt 1**: Pytest runs `test_rbac.py` -> `test_admin_inherits_member_permission` FAILS with exit code 1 (6/7 passed).
  - **Diagnosis**: Isolates root cause: Admin role check fails to inherit member access privileges.
  - **Repair**: Applies surgical patch to `auth.py`.
  - **Attempt 2**: Pytest reruns -> 7/7 tests pass (100% verified).

---

## 4. Quick Start & Local Development

### Prerequisites
- Node.js 18+ and `pnpm` (or `npm`)
- Python 3.10+ with `fastapi`, `uvicorn`, `pytest`

### Step 1: Clone / Enter Directory
```bash
cd "c:\Users\Kritheeck\Documents\vo template"
```

### Step 2: Configure Environment Variables (Optional)
Create a `.env` file or export your API keys:
```bash
# Optional: Live NVIDIA NIM / Nebius inference keys
export NVIDIA_API_KEY="nvapi-..."
export NEBIUS_API_KEY="...-..."
```
*(If unset, NEXUS seamlessly activates its deterministic local intelligence engine to ensure 100% offline demonstration reliability).*

### Step 3: Start Backend Server
```bash
python run_nexus.py
```
- API Endpoint: `http://127.0.0.1:8000`
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`
- Real-time WebSocket: `ws://127.0.0.1:8000/ws/nexus`

### Step 4: Start Frontend Mission Control
In a separate terminal:
```bash
pnpm dev
# or for production mode:
npx next start -p 3000
```
- Open `http://localhost:3000` in your browser.

---

## 5. Live Demonstration Script (3-Minute Hackathon Demo)

1. **0:00 - 0:20 (The Thesis)**:
   - Land on `http://localhost:3000`. Observe the transformed visual foundation: *"Give software an outcome. NEXUS takes it to verified software."*
   - Point out truthful telemetry badges: NVIDIA NIM reasoning, Nebius GPU Cloud, Subprocess Sandbox.
2. **0:20 - 0:45 (Launch Mission)**:
   - Click **"Launch Mission Control"** in the top navigation.
   - Select scenario: **`RBAC Role Hierarchy Guard`**.
   - Review the AST topology scanner on the left (`auth.py`, `app.py`, `test_rbac.py`).
3. **0:45 - 1:40 (Autonomous Execution & Genuine Failure)**:
   - Click **"Start Autonomous Mission"**.
   - Watch the 3D Nexus Core and 10-stage Agent Pipeline transition:
     `INGESTING_REPOSITORY` $\rightarrow$ `ANALYZING` $\rightarrow$ `PLANNING` $\rightarrow$ `IMPLEMENTING` $\rightarrow$ `EXECUTING` $\rightarrow$ `TESTING`.
   - In the Terminal, observe the real pytest failure: `FAILED test_rbac.py::test_admin_inherits_member_permission - assert 403 == 200`.
4. **1:40 - 2:20 (Root-Cause Diagnosis & Self-Healing)**:
   - Pipeline shifts to `DIAGNOSING` $\rightarrow$ `REPAIRING`.
   - Switch to the **"Root-Cause Diagnosis"** tab: View root cause, hypothesis, and traceback evidence.
   - Watch the repair engine apply the hierarchical inheritance patch to `auth.py`.
5. **2:20 - 3:00 (Retesting, Verification, & Delivery)**:
   - Retesting suite runs: All 7/7 tests pass (`PASSED in 0.08s`).
   - Verification score advances to `98.4% Confidence`.
   - Switch to **"Unified Code Diff"** to inspect the before/after patch.
   - Switch to **"GitHub PR Delivery"** and click **"Create Commit & Prepare Pull Request"** to conclude delivery to `feat/nexus-rbac-hierarchy`!

---

## 6. License
MIT License. Created for the **Nebius × NVIDIA Global AI Hackathon**.
