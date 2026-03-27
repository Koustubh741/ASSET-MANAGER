import boto3
session = boto3.Session()
credentials = session.get_credentials()
if credentials:
    print(f"Credentials found! Source: {credentials.method}")
else:
    print("No credentials found.")
