# Technical Guide: Cloud Monitor Architecture & Logic

This document provides a technical overview of how the **Cloud Discovery Agent** works internally to discover, normalize, and synchronize assets across different cloud providers.

---

## 🏗️ 1. Provider-Based Discovery
The agent is built on a **Modular Provider Architecture**. Each cloud provider (AWS, Azure, GCP, OCI, Alibaba) is a subclass of the `CloudProvider` base class.

### Discovery Flow:
1. **Instantiation**: The agent identifies enabled providers from the `ENABLED_PROVIDERS` environment variable.
2. **Parallel Scanning**: All active providers are run in parallel using a `ThreadPoolExecutor`. This significantly reduces total discovery time for multi-cloud environments.
3. **Internal Logic**:
   - **AWS**: Iterates through specified regions and uses `DescribeInstances` to gather EC2 metadata.
   - **Azure**: Uses `ComputeManagementClient` to list all VMs and resolves their primary internal IPs.
   - **GCP**: Uses `AggregatedListInstances` to scan all zones in a project simultaneously.
   - **OCI**: Uses `ComputeClient` and `VirtualNetworkClient` with Instance Principals support.
   - **Alibaba**: Uses `AcsClient` with RAM Role support for ECS.

---

## 🔄 2. Data Normalization
Each provider returns cloud-specific objects, which are immediately converted into a unified **`NormalisedAsset`** schema. This ensures the backend receives consistent data regardless of the source.

**Key Normalization Fields:**
- `hostname`: The instance name or ID.
- `vendor`: "AWS", "Azure", "GCP", "Oracle Cloud", or "Alibaba Cloud".
- `model`: The instance type (e.g., `t3.micro`, `Standard_D2s_v3`).
- `specs`: A dictionary containing provider-specific metadata (Region, Zone, OS License, etc.).

---

## 📡 3. Asset Synchronization (Sync)
Once discovery is complete, the agent performs a secure synchronization with the Asset Manager backend:

1. **Backend Health Check**: Verifies the backend API is reachable and healthy before starting the sync.
2. **Rate Limiting**: To avoid overwhelming the backend or triggering DDoS protections, the agent uses a **Token Bucket Rate Limiter** to control the frequency of POST requests.
3. **Parallel Sync**: Valid assets are synchronized in parallel using a dedicated thread pool, separate from the discovery pool.
4. **Retry Logic**: Each asset sync includes a configurable retry mechanism with exponential backoff for handling transient network issues.

---

## 🛡️ 4. Identity & Authentication
As of the latest update, the agent leverages **Standard SDK Identity Chains**. If no static credentials are found in the environment:
- It falls back to the host machine's identity (IAM Role, Managed Identity).
- It performs a **Pre-flight Check** to validate the identity before initiating expensive discovery operations.
