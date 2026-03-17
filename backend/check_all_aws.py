import boto3
import os
from dotenv import load_dotenv

load_dotenv()

def check_all_aws_regions():
    aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    
    if not aws_access_key or not aws_secret_key:
        print("AWS credentials not found in environment")
        return

    ec2_client = boto3.client(
        'ec2',
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key,
        region_name='us-east-1' # Default for finding regions
    )
    
    try:
        regions = [region['RegionName'] for region in ec2_client.describe_regions()['Regions']]
        print(f"Checking {len(regions)} regions...")
        
        found_any = False
        for region in regions:
            try:
                ec2 = boto3.resource(
                    'ec2',
                    aws_access_key_id=aws_access_key,
                    aws_secret_access_key=aws_secret_key,
                    region_name=region
                )
                instances = list(ec2.instances.filter(Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]))
                if instances:
                    print(f"Region {region}: Found {len(instances)} running instances")
                    for inst in instances:
                        print(f" - {inst.id} ({inst.instance_type})")
                    found_any = True
            except Exception as e:
                # print(f"Error checking region {region}: {e}")
                pass
        
        if not found_any:
            print("No running instances found in any region.")
            
    except Exception as e:
        print(f"Fatal error: {e}")

if __name__ == "__main__":
    check_all_aws_regions()
