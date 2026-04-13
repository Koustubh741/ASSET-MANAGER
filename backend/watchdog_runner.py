"""
ROOT FIX: Self-Healing Uvicorn Watchdog Runner
===============================================
Wraps uvicorn with a background health-check watchdog.
If the server becomes unresponsive (e.g., hot-reload deadlock),
the watchdog automatically kills and restarts the process.

Usage:
    python watchdog_runner.py
"""

import subprocess
import threading
import time
import os
import sys
import signal
import urllib.request
import urllib.error
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [WATCHDOG] %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("watchdog")

HEALTH_URL     = "http://127.0.0.1:8000/health"
CHECK_INTERVAL = 20       # seconds between health checks
FAIL_THRESHOLD = 3        # consecutive failures before restart
STARTUP_GRACE  = 15       # seconds to wait after start before checking

PYTHON = sys.executable
UVICORN_CMD = [
    PYTHON, "-m", "uvicorn",
    "app.main:app",
    "--reload",
    "--reload-delay", "2",       # debounce: wait 2s after last file change before reloading
    "--host", "0.0.0.0",
    "--port", "8000",
]

os.chdir(os.path.dirname(os.path.abspath(__file__)))

_proc: subprocess.Popen | None = None
_restart_lock = threading.Lock()


def start_server() -> subprocess.Popen:
    log.info("Starting uvicorn server...")
    env = os.environ.copy()
    env["PYTHONPATH"] = "."
    p = subprocess.Popen(UVICORN_CMD, env=env)
    log.info(f"Server started with PID {p.pid}")
    return p


def is_healthy() -> bool:
    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=5) as resp:
            return resp.status == 200
    except Exception:
        return False


def watchdog_loop():
    global _proc
    fail_count = 0
    log.info(f"Watchdog active — checking every {CHECK_INTERVAL}s (grace period: {STARTUP_GRACE}s)")
    time.sleep(STARTUP_GRACE)

    while True:
        time.sleep(CHECK_INTERVAL)

        # If process has died naturally, restart immediately
        if _proc and _proc.poll() is not None:
            log.warning(f"Server process died (exit={_proc.returncode}). Restarting...")
            fail_count = 0
            with _restart_lock:
                _proc = start_server()
            time.sleep(STARTUP_GRACE)
            continue

        if is_healthy():
            if fail_count > 0:
                log.info("Server recovered — health check passing again.")
            fail_count = 0
        else:
            fail_count += 1
            log.warning(f"Health check FAILED ({fail_count}/{FAIL_THRESHOLD})")

            if fail_count >= FAIL_THRESHOLD:
                log.error("=== DEADLOCK DETECTED — Force-restarting server ===")
                fail_count = 0
                with _restart_lock:
                    try:
                        _proc.kill()
                        _proc.wait(timeout=5)
                    except Exception as e:
                        log.error(f"Kill failed: {e}")
                    _proc = start_server()
                time.sleep(STARTUP_GRACE)


def handle_exit(signum, frame):
    log.info("Shutdown signal received — stopping server...")
    if _proc and _proc.poll() is None:
        _proc.terminate()
        try:
            _proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            _proc.kill()
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT,  handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)

    _proc = start_server()

    watchdog = threading.Thread(target=watchdog_loop, daemon=True)
    watchdog.start()

    log.info("Watchdog runner active. Press Ctrl+C to stop.")
    _proc.wait()
