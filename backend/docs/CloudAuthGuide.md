# Cloud Monitor: Authentication Guide for IT Administrators

This document provides instructions for setting up **Keyless Authentication** (IAM Roles, Managed Identities) for the Cloud Monitor. This approach is more secure than using static access keys and is preferred by enterprise security teams.

---

## ☁️ AWS (Amazon Web Services)
Instead of `AWS_ACCESS_KEY_ID`, use **IAM Instance Profiles** (if running on EC2) or **IAM Roles for Service Accounts** (if running on EKS).

### 1. Create a Least-Privilege Policy
Create an IAM Policy with the following permissions (Read-Only):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:DescribeImages",
                "ec2:DescribeInstanceTypes",
                "ec2:DescribeVolumes",
                "ec2:DescribeRegions"
            ],
            "Resource": "*"
        }
    ]
}
```

### 2. Attach to the Environment
- **EC2**: Attach an IAM Role with this policy to the EC2 instance running the backend.
- **EKS**: Use IRSA to map the Service Account to the IAM Role.
- **Local/On-Prem**: Use [OIDC Federation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html).

---

## 🟦 Microsoft Azure
Instead of `AZURE_CLIENT_SECRET`, use **Managed Identities**.

### 1. Enable Managed Identity
- Go to the Azure resource (VM, App Service) running the backend.
- Under **Settings**, select **Identity**.
- Switch **Status** to **On** for System-assigned identity.

### 2. Assign Permissions
- Go to your Subscription -> **Access Control (IAM)**.
- Add a role assignment:
    - **Role**: `Reader`
    - **Assign access to**: `Managed Identity`
    - **Select**: The identity of your resource.

---

## 🟩 Google Cloud (GCP)
Instead of `GOOGLE_APPLICATION_CREDENTIALS` (JSON keys), use **Workload Identity Federation**.

### 1. Configure Workload Identity
If running on GKE, enable Workload Identity on the cluster and bind the Kubernetes Service Account to a Google Service Account with the `roles/compute.viewer` role.

---

## ⚙️ Configuration
| Provider | Logic | `.env` Action |
| :--- | :--- | :--- |
| **AWS** | Fallback to IAM Instance Profile | Clear `AWS_ACCESS_KEY_ID` |
| **Azure** | Fallback to Managed Identity | Clear `AZURE_CLIENT_SECRET` |
| **GCP** | Fallback to Workload Identity | Clear `GOOGLE_APPLICATION_CREDENTIALS` |
| **Oracle** | Fallback to Instance Principals | Clear `OCI_CONFIG_FILE` |
| **Alibaba**| Fallback to RAM Role for ECS | Clear `ALIBABA_ACCESS_KEY_ID` |

---

## 4. Oracle Cloud (OCI): Instance Principals
OCI allows compute instances to be authorized to make API calls to OCI services.

### IT Admin Setup
1. **Dynamic Group**: Create a Dynamic Group and define the matching rule (e.g., `ANY {instance.id = 'ocid1.instance...'}`).
2. **Policy**: Create a policy to allow the dynamic group to manage/inspect resources:
   ```text
   Allow dynamic-group MyDynamicGroup to inspect instances in tenancy
   Allow dynamic-group MyDynamicGroup to read vnics in tenancy
   ```

### Configuration
- Ensure `OCI_COMPARTMENT_ID` is set.
- Ensure `OCI_CONFIG_FILE` is removed or points to a non-existent path.

---

## 5. Alibaba Cloud: RAM Roles for ECS
Alibaba Cloud's Resource Access Management (RAM) allows you to assign roles to ECS instances.

### IT Admin Setup
1. **RAM Role**: Create a RAM Role with the type "Alibaba Cloud Service" and select "ECS".
2. **Policy**: Attach a policy like `AliyunECSReadOnlyAccess` to the role.
3. **Attach**: Assign the RAM role to your ECS instance.

### Configuration
- Clear `ALIBABA_ACCESS_KEY_ID` and `ALIBABA_ACCESS_KEY_SECRET`.
- The SDK will automatically fetch credentials from the Metadata Service.

The application SDKs (Boto3, Azure SDK, Google Auth) will automatically detect the environment's identity and authenticate.
