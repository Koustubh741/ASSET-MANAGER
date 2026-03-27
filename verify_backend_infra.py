import redis
import os
from dotenv import load_dotenv
from celery import Celery

load_dotenv()

REDIS_URL = os.environ.get("CELERY_BROKER_URL", "redis://127.0.0.1:6379/0")

def check_backend_infra():
    print("--- Backend Infrastructure Audit ---")
    
    # 1. Check Redis
    try:
        r = redis.from_url(REDIS_URL)
        r.ping()
        print("[+] Redis Connectivity: OK")
    except Exception as e:
        print(f"[!] Redis Connection Failed: {e}")
        return

    # 2. Check Celery
    try:
        app = Celery('test', broker=REDIS_URL)
        inspect = app.control.inspect()
        active = inspect.active()
        if active is not None:
            print(f"[+] Celery Workers Found: {len(active)} active nodes")
            for node, tasks in active.items():
                print(f"  - Node: {node}")
        else:
            print("[!] No active Celery workers found. Make sure 'celery -A app.worker.celery_app worker' is running.")
    except Exception as e:
        print(f"[!] Celery Hub Check Failed: {e}")

if __name__ == "__main__":
    check_backend_infra()
