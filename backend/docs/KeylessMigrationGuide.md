# Migration: Keyless Cloud Authentication

The Cloud Monitor has been updated to support **Environment-based Identity**, allowing for a complete removal of static access keys from the codebase and environment files.

---

## 🏗️ Technical Architecture
Instead of reading `AWS_ACCESS_KEY_ID` or `AZURE_CLIENT_SECRET` from the `.env` file, the system now relies on the **Standard Authentication Chain** provided by the cloud SDKs:

- **AWS**: [Boto3 Standard Credentials Chain](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/credentials.html) (IAM Instance Profiles).
- **Azure**: [DefaultAzureCredential](https://learn.microsoft.com/en-us/dotnet/api/azure.identity.defaultazurecredential) (Managed Identity).
- **GCP**: [Application Default Credentials (ADC)](https://cloud.google.com/docs/authentication/provide-credentials-adc) (Workload Identity).
- **Oracle (OCI)**: [Instance Principals](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/callingservicesfrominstances.htm).
- **Alibaba**: [RAM Roles for ECS](https://www.alibabacloud.com/help/en/resource-access-management/latest/assign-a-ram-role-to-an-ecs-instance).

---

## 🛠️ How to Migrate
1. **Assign Identity**: Ensure the host running the backend has the appropriate IAM Role or Managed Identity attached.
2. **Clear Keys**: In your `.env` file, the following variables should be left **empty**:
   ```env
   AWS_ACCESS_KEY_ID=
   AZURE_CLIENT_SECRET=
   GOOGLE_APPLICATION_CREDENTIALS=
   OCI_CONFIG_FILE=
   ALIBABA_ACCESS_KEY_ID=
   ```
3. **Verification**: The system performs a **Pre-flight Check** on startup to confirm a valid identity is discovered. If no keys are provided, it will log: `No Access Keys found. Defaulting to Environment Identity.`

---

## 🔒 Security Benefits
- **Zero-Key Storage**: No sensitive credentials rest in `settings.py` or `.env`.
- **Automatic Rotation**: IAM/Managed Identity tokens rotate automatically without code or configuration changes.
- **Auditability**: All actions are logged under the specific Resource Identity rather than a generic service account key.
