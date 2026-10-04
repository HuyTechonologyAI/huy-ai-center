"""Read-only compatibility heartbeat. Never creates tasks, approvals or checkpoints."""
import argparse
import json
import os
import signal
import time
from pathlib import Path

def project(state):
    return {
        "canonicalOwner": "Persistent Multi-AI Supervisor",
        "role": "COMPATIBILITY_SIDECAR",
        "ownsRoadmap": False,
        "state": state.get("state") if isinstance(state.get("state"), str) else "UNKNOWN",
        "currentTaskId": state.get("taskId") if isinstance(state.get("taskId"), str) else None,
        "gate": "HUMAN_GATE" if state.get("humanGate") is True else None,
        "canonicalTimestamp": state.get("timestamp"),
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--canonical-state", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    source, target = Path(args.canonical_state).resolve(), Path(args.output).resolve()
    if source == target:
        raise SystemExit("SIDECAR_CANNOT_WRITE_CANONICAL_STATE")
    stopping = False
    def stop(*_):
        nonlocal stopping
        stopping = True
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    target.parent.mkdir(parents=True, exist_ok=True)
    while not stopping:
        try:
            state = json.loads(source.read_text())
            if not isinstance(state, dict):
                state = {}
        except (OSError, ValueError):
            state = {}
        snapshot = project(state)
        snapshot["observedAt"] = int(time.time())
        temporary = target.with_name(target.name + ".tmp")
        temporary.write_text(json.dumps(snapshot))
        os.replace(temporary, target)
        time.sleep(10)

if __name__ == "__main__":
    main()
