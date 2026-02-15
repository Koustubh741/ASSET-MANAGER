from sqlalchemy import func
from app.database.database import SessionLocal
from app.models.models import Asset, User, ByodDevice, AssetRequest
import json

def inspect():
    db = SessionLocal()
    results = {}
    try:
        user_email = 'end@gmail.com'
        user = db.query(User).filter(User.email == user_email).first()
        if user:
            results['user'] = {
                'id': str(user.id),
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'status': user.status
            }
        
        # All Assets
        results['assets'] = []
        all_assets = db.query(Asset).all()
        for a in all_assets:
            results['assets'].append({
                'id': str(a.id),
                'name': a.name,
                'assigned_to': str(a.assigned_to),
                'status': a.status,
                'type': a.type
            })

        # Check specifically for assets in requests
        results['missing_assets'] = []
        user_requests = db.query(AssetRequest).filter(AssetRequest.requester_id == user.id).all()
        for r in user_requests:
            if r.asset_id:
                asset = db.query(Asset).filter(Asset.id == r.asset_id).first()
                if not asset:
                    results['missing_assets'].append(str(r.asset_id))

        # All BYOD
        results['byods'] = []
        all_byods = db.query(ByodDevice).all()
        for b in all_byods:
            owner = db.query(User).filter(User.id == b.owner_id).first()
            results['byods'].append({
                'id': str(b.id),
                'model': b.device_model,
                'owner_id': str(b.owner_id),
                'owner_name': owner.full_name if owner else 'Unknown'
            })

        # Asset Requests for this user
        results['requests'] = []
        user_requests = db.query(AssetRequest).filter(AssetRequest.requester_id == user.id).all()
        for r in user_requests:
            results['requests'].append({
                'id': str(r.id),
                'asset_name': r.asset_name,
                'status': r.status,
                'asset_id': str(r.asset_id) if r.asset_id else None,
                'ownership_type': r.asset_ownership_type
            })

        with open('inspect_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        print("Inspection results saved to inspect_results.json")

    finally:
        db.close()

if __name__ == "__main__":
    inspect()
