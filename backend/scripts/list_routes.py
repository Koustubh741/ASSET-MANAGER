import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.main import app

def list_routes():
    import json
    routes = []
    for route in app.routes:
        if hasattr(route, "path"):
            if "register" in route.path or "login" in route.path:
                routes.append({
                    "path": route.path,
                    "name": route.name,
                    "methods": list(route.methods) if hasattr(route, "methods") else []
                })
    print(json.dumps(routes, indent=4))

if __name__ == "__main__":
    list_routes()
