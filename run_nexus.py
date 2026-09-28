"""
NEXUS: Autonomous Software Engineering Intelligence Platform
Launcher script: Starts FastAPI backend and provides API / WebSocket endpoints.
"""
import sys
import os
import uvicorn

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend"))
sys.path.insert(0, backend_dir)

def main():
    print("=" * 75)
    print("  NEXUS — Autonomous Software Engineering Intelligence Platform")
    print("  Powered by NVIDIA NIM & Nebius Infrastructure")
    print("  Take responsibility for making software work.")
    print("=" * 75)
    print("\n[+] Mission Control API: http://127.0.0.1:8000")
    print("[+] API Documentation:   http://127.0.0.1:8000/docs")
    print("[+] Real-time WebSocket: ws://127.0.0.1:8000/ws/nexus\n")
    
    # Run uvicorn server
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False, log_level="info")

if __name__ == "__main__":
    main()
