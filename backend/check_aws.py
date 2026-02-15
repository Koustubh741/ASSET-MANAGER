import os
import boto3
from dotenv import load_dotenv

def check_specific():
    load_dotenv()
    ec2 = boto3.client("ec2", region_name="us-east-1")
    instance_id = "i-053c67aab2a9b6ec2"
    try:
        res = ec2.describe_instances(InstanceIds=[instance_id])
        i = res['Reservations'][0]['Instances'][0]
        print(f"Instance {instance_id} found. State: {i['State']['Name']}")
    except Exception as e:
        print(f"Instance {instance_id} not found: {e}")

if __name__ == "__main__":
    check_specific()
