import boto3
import os
from dotenv import load_dotenv

load_dotenv()

def check_all_instances_count():
    aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    
    if not aws_access_key or not aws_secret_key:
        print("AWS credentials not found in environment")
        return

    ec2_client = boto3.client(
        'ec2',
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key,
        region_name='us-east-1'
    )
    
    try:
        regions = [region['RegionName'] for region in ec2_client.describe_regions()['Regions']]
        print(f"Scanning {len(regions)} regions for ANY instances...")
        
        total_running = 0
        total_stopped = 0
        total_others = 0
        
        for region in regions:
            try:
                ec2 = boto3.resource(
                    'ec2',
                    aws_access_key_id=aws_access_key,
                    aws_secret_access_key=aws_secret_key,
                    region_name=region
                )
                instances = list(ec2.instances.all())
                for inst in instances:
                    state = inst.state['Name']
                    if state == 'running':
                        total_running += 1
                    elif state == 'stopped':
                        total_stopped += 1
                    else:
                        total_others += 1
            except Exception:
                pass
        
        print(f"\nFinal AWS Count across all regions:")
        print(f" - Running: {total_running}")
        print(f" - Stopped: {total_stopped}")
        print(f" - Other (Terminated/Pending): {total_others}")
        
        if total_running == 0:
            print("\nNote: The Discovery Agent is currently configured to ONLY sync 'running' instances to avoid inventory noise.")
            
    except Exception as e:
        print(f"Fatal error: {e}")

if __name__ == "__main__":
    check_all_instances_count()
