import os
import sys
import logging
from unittest.mock import patch

# Mocking the logger to capture output
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cloud_discovery_agent")

# Add backend/scripts to path
sys.path.append(os.path.join(os.getcwd(), 'backend', 'scripts'))

import cloud_discovery_agent

def test_aws_pre_flight():
    print("\n--- Testing AWS Pre-flight ---")
    with patch.dict(os.environ, {"AWS_ACCESS_KEY_ID": "", "AWS_SECRET_ACCESS_KEY": ""}, clear=True):
        aws = cloud_discovery_agent.AWSProvider()
        aws.pre_flight_check()

    with patch.dict(os.environ, {"AWS_ACCESS_KEY_ID": "AKIA...", "AWS_SECRET_ACCESS_KEY": "secret"}, clear=True):
        aws = cloud_discovery_agent.AWSProvider()
        aws.pre_flight_check()

def test_azure_pre_flight():
    print("\n--- Testing Azure Pre-flight ---")
    with patch.dict(os.environ, {"AZURE_SUBSCRIPTION_ID": "sub-123", "AZURE_CLIENT_SECRET": ""}, clear=True):
        azure = cloud_discovery_agent.AzureProvider()
        azure.pre_flight_check()

    with patch.dict(os.environ, {"AZURE_SUBSCRIPTION_ID": "sub-123", "AZURE_CLIENT_SECRET": "secret"}, clear=True):
        azure = cloud_discovery_agent.AzureProvider()
        azure.pre_flight_check()

def test_gcp_pre_flight():
    print("\n--- Testing GCP Pre-flight ---")
    with patch.dict(os.environ, {"GCP_PROJECT_ID": "proj-123", "GOOGLE_APPLICATION_CREDENTIALS": ""}, clear=True):
        gcp = cloud_discovery_agent.GCPProvider()
        gcp.pre_flight_check()

    with patch.dict(os.environ, {"GCP_PROJECT_ID": "proj-123", "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/sa.json"}, clear=True):
        gcp = cloud_discovery_agent.GCPProvider()
        gcp.pre_flight_check()

def test_oci_pre_flight():
    print("\n--- Testing OCI Pre-flight ---")
    with patch.dict(os.environ, {"OCI_COMPARTMENT_ID": "comp-123", "OCI_CONFIG_FILE": "/non/existent"}, clear=True):
        oci_p = cloud_discovery_agent.OracleCloudProvider()
        oci_p.pre_flight_check()

    # Simulate config file existing (mocking os.path.exists)
    with patch("os.path.exists", return_value=True):
        with patch.dict(os.environ, {"OCI_COMPARTMENT_ID": "comp-123", "OCI_CONFIG_FILE": "~/.oci/config"}, clear=True):
            oci_p = cloud_discovery_agent.OracleCloudProvider()
            oci_p.pre_flight_check()

def test_alibaba_pre_flight():
    print("\n--- Testing Alibaba Pre-flight ---")
    with patch.dict(os.environ, {"ALIBABA_ACCESS_KEY_ID": ""}, clear=True):
        ali = cloud_discovery_agent.AlibabaCloudProvider()
        ali.pre_flight_check()

    with patch.dict(os.environ, {"ALIBABA_ACCESS_KEY_ID": "LTAI..."}, clear=True):
        ali = cloud_discovery_agent.AlibabaCloudProvider()
        ali.pre_flight_check()

def test_do_pre_flight():
    print("\n--- Testing DigitalOcean Pre-flight ---")
    with patch.dict(os.environ, {"DIGITALOCEAN_TOKEN": ""}, clear=True):
        do = cloud_discovery_agent.DigitalOceanProvider()
        do.pre_flight_check()

    with patch.dict(os.environ, {"DIGITALOCEAN_TOKEN": "dop_v1_..."}, clear=True):
        do = cloud_discovery_agent.DigitalOceanProvider()
        do.pre_flight_check()

if __name__ == "__main__":
    try:
        test_aws_pre_flight()
        test_azure_pre_flight()
        test_gcp_pre_flight()
        test_oci_pre_flight()
        test_alibaba_pre_flight()
        test_do_pre_flight()
    except Exception as e:
        print(f"Test failed: {e}")
