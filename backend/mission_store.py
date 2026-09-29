"""
NEXUS Mission Persistence
SQLite-backed storage for mission history, events, and replay capability.
Zero external dependencies — uses Python stdlib sqlite3.
"""
import os
import json
import sqlite3
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from contextlib import contextmanager

DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "nexus_missions.db")
)


class MissionStore:
    """
    Thread-safe SQLite store for mission records.
    Stores full state snapshots + event stream for replay.
    """

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._in_memory = db_path == ":memory:"
        if self._in_memory:
            # Persistent connection required for in-memory DB (would vanish between calls)
            self._mem_conn = sqlite3.connect(":memory:", check_same_thread=False)
            self._mem_conn.row_factory = sqlite3.Row
            self._init_schema()
        else:
            self._mem_conn = None
            self._init_schema()

    @contextmanager
    def _conn(self):
        if self._in_memory:
            yield self._mem_conn
            self._mem_conn.commit()
            return
        conn = sqlite3.connect(self.db_path, timeout=10)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


    def _init_schema(self):
        with self._conn() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS missions (
                    id          TEXT PRIMARY KEY,
                    scenario_id TEXT NOT NULL,
                    objective   TEXT NOT NULL,
                    status      TEXT NOT NULL DEFAULT 'RUNNING',
                    start_time  TEXT NOT NULL,
                    end_time    TEXT,
                    duration_ms INTEGER,

                    -- Results
                    verification_score REAL,
                    tests_passed       INTEGER,
                    tests_failed       INTEGER,
                    total_tests        INTEGER,
                    iterations_count   INTEGER DEFAULT 0,
                    pr_url             TEXT,
                    branch_name        TEXT,

                    -- Full snapshot JSON
                    final_snapshot TEXT
                );

                CREATE TABLE IF NOT EXISTS mission_events (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    mission_id  TEXT NOT NULL,
                    event_type  TEXT NOT NULL,
                    timestamp   TEXT NOT NULL,
                    data        TEXT NOT NULL,
                    FOREIGN KEY (mission_id) REFERENCES missions(id)
                );

                CREATE INDEX IF NOT EXISTS idx_mission_events_mid
                    ON mission_events (mission_id);

                CREATE INDEX IF NOT EXISTS idx_missions_start
                    ON missions (start_time DESC);
            """)

    # ─── Write ────────────────────────────────────────────────────────────────

    def create_mission(self, scenario_id: str, objective: str) -> str:
        """Creates a new mission record and returns its ID."""
        mission_id = str(uuid.uuid4())
        with self._conn() as conn:
            conn.execute(
                """INSERT INTO missions
                   (id, scenario_id, objective, status, start_time)
                   VALUES (?, ?, ?, 'RUNNING', ?)""",
                (mission_id, scenario_id, objective, datetime.utcnow().isoformat()),
            )
        return mission_id

    def complete_mission(
        self,
        mission_id: str,
        status: str,
        snapshot: Dict[str, Any],
        verification_score: float = 0.0,
        tests_passed: int = 0,
        tests_failed: int = 0,
        total_tests: int = 0,
        iterations_count: int = 0,
        pr_url: Optional[str] = None,
        branch_name: Optional[str] = None,
    ):
        end_time = datetime.utcnow().isoformat()
        # Compute duration
        with self._conn() as conn:
            row = conn.execute(
                "SELECT start_time FROM missions WHERE id = ?", (mission_id,)
            ).fetchone()
            duration_ms = None
            if row:
                try:
                    start = datetime.fromisoformat(row["start_time"])
                    end = datetime.fromisoformat(end_time)
                    duration_ms = int((end - start).total_seconds() * 1000)
                except Exception:
                    pass

            conn.execute(
                """UPDATE missions SET
                   status=?, end_time=?, duration_ms=?,
                   verification_score=?, tests_passed=?, tests_failed=?,
                   total_tests=?, iterations_count=?, pr_url=?, branch_name=?,
                   final_snapshot=?
                   WHERE id=?""",
                (
                    status,
                    end_time,
                    duration_ms,
                    verification_score,
                    tests_passed,
                    tests_failed,
                    total_tests,
                    iterations_count,
                    pr_url,
                    branch_name,
                    json.dumps(snapshot),
                    mission_id,
                ),
            )

    def append_event(self, mission_id: str, event_type: str, data: Any):
        """Append a domain event to the mission event stream."""
        with self._conn() as conn:
            conn.execute(
                """INSERT INTO mission_events (mission_id, event_type, timestamp, data)
                   VALUES (?, ?, ?, ?)""",
                (
                    mission_id,
                    event_type,
                    datetime.utcnow().isoformat(),
                    json.dumps(data),
                ),
            )

    # ─── Read ─────────────────────────────────────────────────────────────────

    def list_missions(self, limit: int = 50, offset: int = 0) -> List[Dict]:
        with self._conn() as conn:
            rows = conn.execute(
                """SELECT id, scenario_id, objective, status,
                          start_time, end_time, duration_ms,
                          verification_score, tests_passed, tests_failed,
                          total_tests, iterations_count, pr_url, branch_name
                   FROM missions ORDER BY start_time DESC
                   LIMIT ? OFFSET ?""",
                (limit, offset),
            ).fetchall()
        return [dict(r) for r in rows]

    def get_mission(self, mission_id: str) -> Optional[Dict]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM missions WHERE id = ?", (mission_id,)
            ).fetchone()
        if not row:
            return None
        result = dict(row)
        if result.get("final_snapshot"):
            result["final_snapshot"] = json.loads(result["final_snapshot"])
        return result

    def get_mission_events(self, mission_id: str) -> List[Dict]:
        with self._conn() as conn:
            rows = conn.execute(
                """SELECT event_type, timestamp, data FROM mission_events
                   WHERE mission_id = ? ORDER BY id""",
                (mission_id,),
            ).fetchall()
        return [
            {
                "type": r["event_type"],
                "timestamp": r["timestamp"],
                "data": json.loads(r["data"]),
            }
            for r in rows
        ]

    def get_stats(self) -> Dict:
        with self._conn() as conn:
            total = conn.execute("SELECT COUNT(*) FROM missions").fetchone()[0]
            completed = conn.execute(
                "SELECT COUNT(*) FROM missions WHERE status='COMPLETED'"
            ).fetchone()[0]
            avg_score = conn.execute(
                "SELECT AVG(verification_score) FROM missions WHERE status='COMPLETED'"
            ).fetchone()[0]
        return {
            "total_missions": total,
            "completed_missions": completed,
            "success_rate": round(completed / max(total, 1) * 100, 1),
            "avg_verification_score": round(avg_score or 0, 1),
        }
