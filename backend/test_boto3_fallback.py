import os
import boto3
from botocore.exceptions import NoCredentialsError

# Simulate .env with empty strings
os.environ["AWS_ACCESS_KEY_ID"] = ""
os.environ["AWS_SECRET_ACCESS_KEY"] = ""

try:
    session = boto3.Session()
    creds = session.get_credentials()
    if creds:
        print(f"Credentials found! Source: {creds.method}")
    else:
        print("No credentials found (even with empty strings in env).")
except Exception as e:
    print(f"Error with empty strings: {e}")

# Now try deleting them
del os.environ["AWS_ACCESS_KEY_ID"]
del os.environ["AWS_SECRET_ACCESS_KEY"]

try:
    session = boto3.Session()
    creds = session.get_credentials()
    if creds:
        print(f"Credentials found after deletion! Source: {creds.method}")
    else:
        print("Still no credentials found after deletion.")
except Exception as e:
    print(f"Error after deletion: {e}")
