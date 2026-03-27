try:
    from google.cloud import compute_v1
    print("✓ google-cloud-compute is installed and importable.")
except ImportError as e:
    print(f"✗ ImportError: {e}")
except Exception as e:
    print(f"✗ Unexpected error: {e}")
