// PATCH PART 3: azure-1 through azure-18
"azure-1": {
  answer:
`**Azure Resource Manager (ARM)** is the management layer for all Azure resources — every operation (create, read, update, delete) goes through ARM regardless of whether you use the portal, CLI, SDK, or Terraform. It enforces RBAC, applies Policy, and provides consistent tagging and locking.

**Resource Groups** are logical containers. Every Azure resource must live in exactly one Resource Group. They share a lifecycle — deleting the RG deletes everything inside. Use them to group resources that belong together (e.g., all resources for the \`euron-prod\` app) so you can manage permissions, cost, and lifecycle as a unit.

**Subscriptions** are billing and governance boundaries. All costs roll up to a subscription. Each subscription has limits (quotas) per resource type. A company typically has separate subscriptions per environment (dev, staging, prod) or per business unit.

**The full hierarchy (top to bottom):**
\`\`\`
Management Groups    ← apply Policy/RBAC to multiple subscriptions
  └─ Subscriptions   ← billing boundary, quotas
       └─ Resource Groups ← lifecycle container
              └─ Resources  ← VMs, Storage, AKS, etc.
\`\`\`

Policy and RBAC assignments at higher levels cascade down — assigning a role at the Management Group level grants access to every resource in every subscription under it.`,
  pros:[
    "ARM templates/Bicep/Terraform all talk to the same API — one governance model regardless of IaC tool",
    "Resource Group as a unit of deletion makes environment teardown safe and complete",
    "Management Group hierarchy enables enterprise-scale governance without per-subscription configuration"
  ],
  cons:[
    "Resources can't span Resource Groups (e.g., a VNet and its subnets must share an RG)",
    "Subscription limits (e.g., VMs per region) require planning at scale",
    "ARM JSON templates are verbose — Bicep or Terraform are preferred for authoring"
  ],
  useCase:
`A startup has one subscription. They create three Resource Groups: \`euron-dev\`, \`euron-staging\`, \`euron-prod\`. Dev engineers have Contributor on the dev RG; only the CI/CD service principal has Contributor on prod. Cost alerts are set at the subscription level.`,
  alts:[
    "What is the difference between a Resource Group and a Subscription in Azure?",
    "How does Azure ARM work under the hood?",
    "What is a Management Group in Azure and when do you need one?"
  ]
},

"azure-2": {
  answer:
`**Regions** are geographic clusters of Azure data centers (e.g., East US, West Europe). Pick a region close to your users for low latency and to meet data residency requirements.

**Availability Zones (AZs)** are physically separate data centers within a region — independent power, cooling, and networking. Resources deployed across at least two AZs survive a single zone failure. AZ-redundant services (Zone-Redundant Storage, zone-redundant AKS node pools, zone-redundant Application Gateway) replicate automatically; other resources require you to deploy instances explicitly into multiple zones.

**Paired Regions** are two regions in the same geography that Microsoft ties together for disaster recovery. During planned Azure maintenance, only one region in a pair is updated at a time. Azure geo-redundant storage (GRS) replicates data to the paired region automatically. Examples: East US ↔ West US 2; North Europe ↔ West Europe.

**Designing for HA:**
- **Zone-level HA (within a region):** deploy across 2+ AZs. Handles zone failures (most common). 99.99% SLA on zone-redundant services.
- **Region-level DR:** replicate to a paired region (active-passive) or run active-active across two regions with Traffic Manager. Handles regional disasters (rare but catastrophic).

Rule of thumb: AZs for HA (always), paired regions for DR (when RTO/RPO requirements justify the cost).`,
  pros:[
    "AZs give 99.99% SLA for supported services with no application-level changes",
    "Paired regions ensure Azure-managed failover is available and maintenance is staggered"
  ],
  cons:[
    "Not all Azure services support AZs — check the service's zone support before assuming it",
    "Cross-region active-active adds latency for synchronous replication and significant cost"
  ],
  useCase:
`The Euron API runs on AKS with a zone-redundant node pool across all 3 AZs in East US. The database uses Zone-Redundant SQL. If AZ-2 goes down, the AKS scheduler moves workloads to AZ-1 and AZ-3 automatically. For DR, Azure SQL geo-replication to West US 2 (paired region) gives a secondary for manual failover.`,
  alts:[
    "What is the difference between an Availability Zone and a region in Azure?",
    "What are Azure paired regions used for?",
    "How do you design a high-availability architecture on Azure?"
  ]
},

"azure-3": {
  answer:
`**Azure Active Directory (Entra ID)** is Microsoft's cloud identity platform — it handles authentication and authorization for Azure, Microsoft 365, and custom apps.

**Key identity types:**

**Users:** human identities — employees, admins, guest users (B2B).

**Service Principals:** non-human identities for apps/services. When you register an application in Entra ID, a Service Principal is created. Applications authenticate with a client secret or certificate to get tokens.

**Managed Identities:** Azure-managed service principals with no secret to manage. Azure automatically provisions and rotates credentials. Two types:
- **System-assigned:** tied to a single resource (VM, App Service, AKS pod). Deleted when the resource is deleted.
- **User-assigned:** standalone identity that can be assigned to multiple resources.

*Always prefer Managed Identity over service principals with secrets for Azure-to-Azure calls — no credential management, no rotation risk.*

**App Registrations:** define what an application is to Entra ID — its scopes, redirect URIs, API permissions.

**RBAC vs ABAC:**
- **RBAC (Role-Based):** grant a role (Reader, Contributor) to an identity at a scope. Simple, coarse-grained. Most common.
- **ABAC (Attribute-Based):** conditions on role assignments based on attributes (e.g., blob index tags, environment tags). Fine-grained. Used for data-plane authorization in Storage.`,
  pros:[
    "Managed Identities eliminate secret sprawl — no credentials to rotate or leak",
    "Single identity platform covers Azure, Microsoft 365, and custom OAuth2 apps",
    "Conditional Access policies enforce MFA, device compliance, and location restrictions"
  ],
  cons:[
    "Token propagation across nested service calls requires careful design (on-behalf-of flow)",
    "Service principal secrets/certificates still needed for non-Azure targets"
  ],
  useCase:
`The Euron FastAPI backend runs on AKS with a system-assigned Managed Identity. It uses that identity to read secrets from Key Vault and write to Azure Storage — no connection strings or secrets in environment variables. The identity has the minimum RBAC roles needed: Key Vault Secrets User and Storage Blob Data Contributor.`,
  alts:[
    "What is the difference between a Service Principal and a Managed Identity in Azure?",
    "When should I use a system-assigned vs user-assigned Managed Identity?",
    "What is the difference between RBAC and ABAC in Azure?"
  ]
},

"azure-4": {
  answer:
`**Azure RBAC** controls who can do what on which resources. The model: **assign a role to a security principal at a scope.**

**Scope levels (broad → narrow):**
\`Management Group → Subscription → Resource Group → Resource\`
Assignments cascade down. A role assigned at the subscription applies to all Resource Groups and resources inside.

**Built-in roles (most used):**
| Role | Can Do |
|---|---|
| Owner | Everything, including access management |
| Contributor | Create/manage resources, cannot manage access |
| Reader | Read-only |
| User Access Administrator | Manage access only |
| Key Vault Secrets User | Read secrets from Key Vault |
| Storage Blob Data Contributor | Read/write blobs |
| AcrPull | Pull images from Container Registry |

**Custom roles:** when built-in roles are too permissive. Define a JSON with \`Actions\`, \`NotActions\`, \`DataActions\`, \`NotDataActions\`. Example: allow listing storage containers but not reading blob content.

**Least privilege principle:** assign at the narrowest scope with the least-permissive role. Give a CI/CD pipeline Contributor on a specific Resource Group, not the whole subscription.

**Deny assignments:** Azure Policy can block actions even if RBAC allows them.`,
  pros:[
    "Assignment cascades — set once at Management Group, applies to hundreds of subscriptions",
    "Separation of Owner vs Contributor prevents non-admins from managing access control",
    "Custom roles enable fine-grained least-privilege without re-implementing logic"
  ],
  cons:[
    "RBAC is eventually consistent — new assignments can take a few minutes to propagate",
    "Max 4,000 role assignments per subscription — use groups instead of individual users at scale"
  ],
  useCase:
`DevOps engineers get Contributor on the dev/staging subscription. Production has no human Contributor access — only the CI/CD service principal. PIM (Privileged Identity Management) gives admins just-in-time elevation to Owner for emergency access with an audit trail.`,
  alts:[
    "How does Azure RBAC work and what are the scope levels?",
    "When would you create a custom Azure RBAC role?",
    "What is the difference between Owner and Contributor in Azure?"
  ]
},

"azure-5": {
  answer:
`**Azure Virtual Network (VNet)** is a private, isolated network in Azure — the foundation for network security. Resources inside a VNet communicate privately; traffic to the internet is explicit.

**Subnets:** logical segments within a VNet. Separate subnets for app tier, data tier, management. You can apply NSGs and route tables per subnet.

**NSGs (Network Security Groups):** stateful L4 firewall rules attached to subnets or NICs. Priority-ordered allow/deny rules by source IP, destination IP, port, and protocol. Default: deny all inbound from internet, allow all inbound within VNet.

**Service Endpoints:** route traffic from a subnet to specific Azure services (Storage, SQL, Key Vault) over the Azure backbone — the service restricts access to that subnet's traffic. Traffic still traverses the Microsoft backbone but your VNet doesn't need a private IP for the service.

**Private Endpoints:** give an Azure service a private IP address inside your VNet. Traffic never leaves the Microsoft network; the public endpoint can be disabled entirely. Stronger than Service Endpoints — the service is truly "inside" your VNet from a network perspective.

**VNet Peering:** connects two VNets (same region = VNet peering; cross-region = global VNet peering). Traffic routes over Microsoft backbone, not internet. Non-transitive — A↔B and B↔C does not give A↔C without direct peering or a hub VNet.`,
  pros:[
    "Private Endpoints eliminate public surface area for PaaS services completely",
    "NSG flow logs + Network Watcher provide network-level observability",
    "VNet peering provides low-latency inter-VNet connectivity without VPN"
  ],
  cons:[
    "VNet address space planning is hard to change later — plan CIDR ranges carefully upfront",
    "VNet peering is non-transitive — hub-spoke topology requires explicit configuration",
    "Private Endpoints require private DNS zones to resolve service names to private IPs"
  ],
  useCase:
`Euron's production VNet has subnets: \`app-subnet\` (AKS), \`db-subnet\` (private endpoint for Azure SQL), \`mgmt-subnet\` (Bastion). NSG on \`app-subnet\` allows inbound only from the ALB. Supabase (PostgreSQL) is accessed via a Private Endpoint — no public IP, no firewall rules needed.`,
  alts:[
    "What is the difference between a Service Endpoint and a Private Endpoint in Azure?",
    "How do NSGs work in Azure?",
    "What is VNet peering and what are its limitations?"
  ]
},

"azure-6": {
  answer:
`**Azure Storage accounts** provide four services under one account:

| Service | Use for |
|---|---|
| **Blob** | Unstructured data — files, images, logs, backups |
| **Files** | Managed SMB/NFS file shares — lift-and-shift file servers |
| **Queue** | Simple message queue (64KB messages, max 7 days TTL) |
| **Table** | NoSQL key-value store (cheaper than Cosmos DB, limited query) |

**Blob access tiers:**
- **Hot:** frequent access. Higher storage cost, lowest access cost.
- **Cool:** infrequent access (monthly). Lower storage cost, higher access cost. 30-day minimum.
- **Cold:** rarely accessed. Lower still. 90-day minimum.
- **Archive:** offline storage (hours to rehydrate). Cheapest storage, access requires rehydration. 180-day minimum.

Lifecycle management policies automatically move blobs through tiers based on age.

**Access methods:**
- **Storage account keys:** full access to everything in the account. Treat like root password — use sparingly. Rotate regularly.
- **SAS tokens (Shared Access Signature):** time-limited, scope-limited URLs with specific permissions. Good for granting temporary access to specific blobs.
- **Managed Identity + RBAC (preferred):** grant roles like \`Storage Blob Data Reader\` to a Managed Identity. No credentials at all.`,
  pros:[
    "Lifecycle policies automate Hot → Cool → Archive tiering to cut storage costs automatically",
    "Managed Identity access eliminates connection string management",
    "99.9999999999% (12 nines) durability with LRS; geo-redundancy options for DR"
  ],
  cons:[
    "Storage account keys grant full account access — leaking one is catastrophic",
    "Archive rehydration can take hours — not suitable for data you might need quickly"
  ],
  useCase:
`Uploaded PDFs land in Hot tier. A lifecycle policy moves them to Cool after 30 days and Archive after 1 year. The AKS pod's Managed Identity has \`Storage Blob Data Contributor\` role — no connection string in the app config. SAS tokens are generated per-request for customer download URLs.`,
  alts:[
    "What is the difference between Blob hot, cool, and archive tiers?",
    "What is a SAS token and when should I use one?",
    "How do you access Azure Storage securely without connection strings?"
  ]
},

"azure-7": {
  answer:
`**Azure Key Vault** is the secure store for secrets, keys, and certificates. Nothing sensitive should live in environment variables or config files — it goes in Key Vault.

**Three object types:**
- **Secrets:** arbitrary name-value pairs (API keys, connection strings, passwords). Versioned.
- **Keys:** cryptographic keys (RSA, EC) used for encryption/decryption or signing. The private key never leaves Key Vault — operations happen inside the HSM.
- **Certificates:** X.509 certificates with auto-renewal. Key Vault can act as a CA or integrate with Let's Encrypt / DigiCert.

**Access control — two models:**
- **Vault Access Policies (legacy):** coarse-grained — you grant a principal access to all secrets, all keys, etc. in the vault. Simple but not least-privilege.
- **RBAC (preferred):** assign specific roles (\`Key Vault Secrets User\`, \`Key Vault Crypto Officer\`) at the vault or individual secret level. More granular.

**Soft delete:** deleted secrets/keys are retained for 7-90 days and can be recovered. **Purge protection:** prevents permanent deletion even by admins for the retention period — critical for compliance.

**Accessing secrets from code:**
\`\`\`python
from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential
client = SecretClient(vault_url="https://my-vault.vault.azure.net", credential=DefaultAzureCredential())
secret = client.get_secret("openai-api-key")
\`\`\`
\`DefaultAzureCredential\` automatically uses the Managed Identity in Azure, or your local CLI credential in dev.`,
  pros:[
    "Centralized secret management with full audit log of every access",
    "Auto-rotation for supported services (Storage keys, SQL) with zero app downtime",
    "HSM-backed keys mean private key material never leaves the vault"
  ],
  cons:[
    "Key Vault has request throttling limits — high-throughput apps should cache secrets locally",
    "Soft delete + purge protection means you can't immediately reclaim storage from deleted objects"
  ],
  useCase:
`At startup, the Euron FastAPI app reads \`OPENAI_API_KEY\` and \`DATABASE_URL\` from Key Vault using its Managed Identity. The values are cached in process memory for the app's lifetime — Key Vault is not called on every request. Key Vault access is logged to Log Analytics; any unexpected access triggers an alert.`,
  alts:[
    "What is the difference between Azure Key Vault access policies and RBAC?",
    "What is soft delete in Azure Key Vault?",
    "How do you access Key Vault secrets from a Python app using Managed Identity?"
  ]
},

"azure-8": {
  answer:
`**Azure DNS:** hosts DNS zones in Azure, backed by the globally distributed Azure DNS infrastructure. Authoritative DNS for your domains. Supports public zones (internet-resolvable) and private zones (VNet-only resolution — used for Private Endpoint name resolution).

**Traffic Manager:** a DNS-based global load balancer. It returns different IP addresses based on the configured routing method — it never proxies traffic, just influences where DNS resolves.

**Routing methods:**
| Method | Routes traffic to... |
|---|---|
| **Priority** | Primary endpoint; failover to secondary on failure |
| **Weighted** | Multiple endpoints with configurable weight distribution (canary deploys) |
| **Performance** | Endpoint with lowest latency for the user (geographic proximity) |
| **Geographic** | Specific endpoint based on user's geography (data residency compliance) |
| **Multivalue** | Returns all healthy endpoints (for DNS-aware clients) |
| **Subnet** | Routes based on client IP subnet (A/B testing by IP range) |

**Traffic Manager vs Azure Front Door:**
- Traffic Manager: DNS-based, no traffic proxying, no SSL offload, no WAF. Simple global failover.
- Azure Front Door: application-level (L7) proxy, SSL offload, WAF, caching, path-based routing. More capable, higher cost.`,
  pros:[
    "Traffic Manager is simple — no proxying means no latency added, no HTTPS certificate to manage at the LB level",
    "Geographic routing enables data residency compliance without application changes",
    "TTL on Traffic Manager DNS is short (30s) — failover detects and routes around failures quickly"
  ],
  cons:[
    "DNS-based load balancing respects TTL — there's a propagation delay on failover equal to the TTL",
    "Traffic Manager can't route by URL path or do header manipulation — use Front Door for that"
  ],
  useCase:
`Euron runs in East US (primary) and West Europe (secondary). Traffic Manager with Priority routing sends all traffic to East US normally. Health probes detect if the East US endpoint goes down and flip DNS to West Europe within ~1 minute (TTL=30s + probe interval).`,
  alts:[
    "What is Azure Traffic Manager and how does it work?",
    "What is the difference between Traffic Manager routing methods?",
    "When should I use Traffic Manager vs Azure Front Door?"
  ]
},

"azure-9": {
  answer:
`Choosing the right Azure compute service is one of the most common architecture questions.

| Service | When to use |
|---|---|
| **App Service** | PaaS for web apps and APIs. No infra to manage. Built-in autoscale, deployment slots, SSL. Best for: traditional web apps, REST APIs that don't need container flexibility. |
| **Container Apps** | PaaS for containerized microservices and event-driven workloads. Kubernetes underneath but fully managed. KEDA-based scaling (scale to zero). Best for: microservices without wanting to manage K8s. |
| **AKS** | Managed Kubernetes. Full control over the cluster. Supports any workload type, custom networking, storage. Best for: complex orchestration needs, existing K8s expertise, workloads that need cluster-level control. |
| **Azure Functions** | Serverless event-driven code. Pay only when running. Scale to zero automatically. Best for: event handlers, scheduled jobs, lightweight API calls, integrations. |

**Decision flowchart:**
- Event-driven, short-running? → **Functions**
- Containerized, want simplicity? → **Container Apps**
- Need full K8s control or complex networking? → **AKS**
- .NET/Node/Python web app, don't need containers? → **App Service**`,
  pros:[
    "Container Apps eliminates K8s management complexity for most microservice scenarios",
    "Functions scales to zero — zero cost when idle, great for sporadically-triggered workloads",
    "App Service has the simplest developer experience for standard web apps"
  ],
  cons:[
    "AKS has significant operational overhead — cluster upgrades, node pool management, CNI config",
    "Functions cold start latency can be 1-3 seconds on consumption plan",
    "Container Apps doesn't support stateful workloads well (no persistent volumes)"
  ],
  useCase:
`Euron's main FastAPI backend → **Container Apps** (containerized, scales to zero on weekends). Knowledge base ingestion worker → **Functions** (triggered by blob upload events). If the team grows and needs custom CNI + Istio service mesh → migrate to **AKS**.`,
  alts:[
    "When should I use Azure Container Apps vs AKS?",
    "What is the difference between Azure Functions and Container Apps?",
    "How do I choose between App Service, AKS, Container Apps, and Functions?"
  ]
},

"azure-10": {
  answer:
`**AKS** is Azure's managed Kubernetes — Azure handles the control plane (API server, etcd, scheduler). You manage node pools (worker nodes), networking, and workloads.

**Node pools:** groups of VMs with the same SKU and configuration. System node pool: runs AKS system pods (CoreDNS, metrics-server). User node pools: run application workloads. Separate pools by workload type (GPU pool, spot pool, Windows pool).

**Cluster Autoscaler:** scales node count up/down based on pending pods and node utilization. Combine with HPA (Horizontal Pod Autoscaler) for both pod-level and node-level scaling.

**KEDA (Kubernetes Event-Driven Autoscaling):** scales pods based on external metrics — queue depth, HTTP request rate, Kafka consumer lag. Scale to zero is possible.

**Workload Identity (preferred auth pattern):** federate AKS service accounts with Entra ID Managed Identities. Pods authenticate to Azure services (Key Vault, Storage) using a Kubernetes service account token — no secrets in pods.

**Networking options:**
- **Kubenet:** simpler, Azure manages pod IP assignment. Pods get NAT'd IPs — not routable from outside the cluster natively.
- **Azure CNI:** pods get IPs from the VNet subnet directly. Full VNet integration, Private Endpoints accessible from pods. More IPs consumed. Recommended for production.
- **Azure CNI Overlay:** recent option — better IP efficiency than traditional CNI.`,
  pros:[
    "Managed control plane — Azure handles etcd backups, API server upgrades, and control plane HA",
    "Workload Identity eliminates the need for secrets in pods for Azure service access",
    "AKS integrates natively with ACR, Key Vault, Monitor, Defender"
  ],
  cons:[
    "Node pool upgrades require careful sequencing to avoid workload disruption",
    "Azure CNI consumes VNet IPs per pod — requires careful CIDR planning",
    "AKS has significant operational knowledge requirements vs Container Apps"
  ],
  useCase:
`Euron on AKS: system node pool (2× Standard_D2s_v3) + user node pool (autoscale 2-10× Standard_D4s_v3). KEDA scales the ingestion workers based on Azure Storage Queue depth. Workload Identity gives the FastAPI pod Key Vault Secrets User role — no secrets in Kubernetes Secrets or env vars.`,
  alts:[
    "What is the difference between Kubenet and Azure CNI in AKS?",
    "How does KEDA work in AKS?",
    "What is AKS Workload Identity and how does it replace pod-level secrets?"
  ]
},

"azure-11": {
  answer:
`**Azure Functions** is serverless compute — you write a function, attach it to a trigger, and Azure runs it on demand. You pay only for execution time (consumption plan) or for pre-allocated capacity (Premium/Dedicated).

**Trigger types (partial list):**
- **HTTP:** REST API endpoint
- **Timer:** cron schedule
- **Queue/Service Bus:** message-triggered
- **Blob:** fires when a blob is added/modified in Storage
- **Event Grid:** reacts to Azure resource events
- **Cosmos DB change feed**

**Bindings:** declarative input/output connectors. A function triggered by a queue message (\`QueueTrigger\`) can bind to a Blob output and a Cosmos DB output — Azure handles the client SDK setup.

**Durable Functions:** stateful workflows in a serverless model. Three patterns:
- **Function chaining:** A→B→C with output passed along
- **Fan-out/fan-in:** parallel execution then aggregation
- **Human interaction:** pause and wait for approval/webhook

**Cold start mitigation:**
- Premium plan: pre-warmed instances eliminate cold starts
- Dedicated (App Service) plan: always on, no cold start, but you pay for the VMs
- Consumption: cold starts of 1-3s for .NET/Node; worse for Java. Use Flex Consumption (new) for faster cold start.`,
  pros:[
    "True scale to zero on consumption plan — zero cost when idle",
    "Durable Functions handle complex stateful workflows without managing state yourself",
    "Bindings reduce boilerplate — no SDK initialization code for common Azure services"
  ],
  cons:[
    "Consumption plan cold starts are unpredictable — unsuitable for latency-sensitive APIs",
    "Function execution time limits (5 min consumption, 10 min Premium by default) constrain long-running tasks",
    "Local testing with bindings requires Azure Functions Core Tools and emulators"
  ],
  useCase:
`Euron's ingestion pipeline: a Blob Trigger function fires when a PDF is uploaded to Storage. It parses the PDF, chunks text, calls OpenAI for embeddings, and writes to Supabase pgvector. Durable Functions orchestrate multi-document batch jobs with fan-out (parallel embedding) and fan-in (batch DB write).`,
  alts:[
    "What triggers are available for Azure Functions?",
    "What are Durable Functions and when should I use them?",
    "How do you prevent cold starts in Azure Functions?"
  ]
},

"azure-12": {
  answer:
`**Azure Container Apps (ACA)** runs containers on a fully managed Kubernetes environment (backed by AKS). You interact with a simplified resource model — no cluster management, no node pools, no kubectl by default.

| Feature | Container Apps | AKS |
|---|---|---|
| Kubernetes management | None (fully managed) | You manage node pools, upgrades, networking |
| Scaling | KEDA built-in, scale to zero | HPA + KEDA (you configure) |
| Networking | Managed VNet integration | Full control (Kubenet, CNI, service mesh) |
| Service mesh | Built-in Dapr/Envoy | Bring your own (Istio, Linkerd) |
| Persistent storage | Limited | Full PV/PVC support |
| GPU workloads | Not supported | Supported |
| kubectl access | Not natively | Full access |
| Cost | Pay per vCPU/memory consumed | Pay for node pool VMs |

**Use Container Apps when:**
- You want containerized microservices without K8s operational overhead
- Scale to zero is important (event-driven or intermittent load)
- You're using Dapr for service-to-service communication

**Use AKS when:**
- You need stateful workloads with persistent volumes
- You need custom CNI, service mesh (Istio), or GPU nodes
- Your team has Kubernetes expertise and needs cluster-level control`,
  pros:[
    "ACA: zero infrastructure to manage — deploy a container, Azure handles the rest",
    "ACA built-in Dapr simplifies service discovery and pub/sub without extra infrastructure"
  ],
  cons:[
    "ACA limits customization — if you outgrow its abstractions, migration to AKS is non-trivial",
    "ACA egress pricing can be higher than AKS for high-bandwidth workloads"
  ],
  useCase:
`Start with Container Apps for all Euron services (FastAPI, worker). When the team needs custom Istio policies for mTLS enforcement and circuit breaking with fine-grained control, migrate to AKS. Container Apps works well for 80% of use cases.`,
  alts:[
    "When should I choose Container Apps over AKS?",
    "What is the difference between Azure Container Apps and AKS?",
    "Does Azure Container Apps use Kubernetes internally?"
  ]
},

"azure-13": {
  answer:
`Azure offers multiple blue-green deployment mechanisms depending on the hosting service.

**App Service Deployment Slots:**
The simplest approach. Swap environments atomically with zero downtime:
\`\`\`
Production slot: v1 (live traffic)
Staging slot: v2 (deploy + warm up + smoke test)
→ Swap: staging becomes production, production becomes staging
→ Rollback: swap back
\`\`\`
Slots share the same App Service Plan. Slot-specific settings (connection strings flagged as "slot setting") don't swap with the deployment.

**AKS with Argo Rollouts:**
Declarative progressive delivery — canary, blue-green, or A/B:
\`\`\`yaml
strategy:
  blueGreen:
    activeService: ticket-service-active
    previewService: ticket-service-preview
    autoPromotionEnabled: false   # manual promotion
\`\`\`
Deploy new version to the preview service, run tests, promote.

**Traffic Manager weighted routing:**
Two regional deployments (blue=100%, green=0%). Shift weight gradually: 90/10 → 50/50 → 0/100. Rollback by setting weights back.

**Azure Container Apps:** supports blue/green via revision-based traffic splitting:
\`\`\`
Revision v1: 80% traffic
Revision v2: 20% traffic
\`\`\``,
  pros:[
    "App Service slots are the easiest — swap takes seconds with automatic health validation",
    "ACA revision splitting enables percentage-based traffic shifting without extra tooling"
  ],
  cons:[
    "Slot swap shares a single App Service Plan — not true environment isolation",
    "Traffic Manager adds DNS-based failover latency; doesn't work for same-region blue-green"
  ],
  useCase:
`Euron deploys a new FastAPI version to the ACA \`preview\` revision at 10% traffic. Dashboards show error rate, p99 latency, and ticket creation success rate. After 30 minutes with no regressions, traffic shifts to 100%. Old revision retained for 24 hours for instant rollback.`,
  alts:[
    "How do you do a zero-downtime deployment in Azure?",
    "What are Azure App Service deployment slots?",
    "How does blue-green deployment work in Azure Container Apps?"
  ]
},

"azure-14": {
  answer:
`These three services solve different messaging problems — using the wrong one is a common architecture mistake.

**Azure Service Bus:** enterprise message broker (queues + topics/subscriptions). Guarantees: at-least-once or exactly-once delivery, FIFO ordering, dead-letter queues, sessions, message lock. Use for: reliable command/event messaging between services, workflows that need ordering or acknowledgment.

**Azure Event Hub:** high-throughput event streaming (Kafka-compatible). Millions of events/second. Partitioned consumer groups; events are retained for 1-90 days. Use for: telemetry ingestion, log streaming, real-time analytics pipelines. Not a message bus — no dead-letter, no sessions, no FIFO guarantees within a partition at high scale.

**Azure Event Grid:** event routing. Reacts to Azure resource events (blob created, VM started) or custom events. Push-based delivery to subscribers (Functions, Logic Apps, Service Bus). Reliability: at-least-once, retry with backoff. Use for: reacting to Azure resource lifecycle events, webhook-style event fan-out.

**Decision summary:**
| | Service Bus | Event Hub | Event Grid |
|---|---|---|---|
| Pattern | Queue / Pub-Sub | Stream | Event routing |
| Volume | Moderate (millions/day) | High (millions/second) | Low-moderate |
| Delivery | Guaranteed, ordered | Best-effort order | At-least-once |
| Use for | Workflows, commands | Telemetry, streaming | Resource events, triggers |`,
  pros:[
    "Service Bus dead-letter queue captures poison messages for investigation without losing them",
    "Event Hub's Kafka compatibility allows reuse of Kafka client libraries",
    "Event Grid removes polling — reactions happen within milliseconds of resource changes"
  ],
  cons:[
    "Service Bus is heavier than needed for simple fire-and-forget event fan-out",
    "Event Hub doesn't support individual message acknowledgment — all consumers process all events"
  ],
  useCase:
`Euron: ticket creation events → **Service Bus** (agent assignment service needs reliable, ordered processing). User activity telemetry → **Event Hub** (millions of events, analytics pipeline). Blob upload (PDF) → **Event Grid** triggers the ingestion Function. Each service does what it's designed for.`,
  alts:[
    "What is the difference between Azure Service Bus, Event Hub, and Event Grid?",
    "When should I use Event Hub vs Service Bus?",
    "What is Event Grid used for in Azure?"
  ]
},

"azure-15": {
  answer:
`Azure auto-scaling works differently per service — each has its own mechanism.

**VMSS (Virtual Machine Scale Sets):** scale VMs based on metrics (CPU, custom). Scale-out/in policies define when to add/remove instances. Use for: stateless apps not yet containerized.

**AKS auto-scaling:**
- **HPA (Horizontal Pod Autoscaler):** scales pod replicas based on CPU/memory or custom metrics.
- **KEDA:** scales pods based on external sources (queue depth, Kafka lag, HTTP request rate). Enables scale to zero.
- **Cluster Autoscaler:** adds/removes nodes based on pending pods or underutilized nodes.

**App Service auto-scale:** rule-based (CPU, memory, HTTP queue, schedule) or predictive auto-scale (ML-driven, pre-scales before expected load). Max instances defined per plan.

**Azure Functions — consumption plan:** automatically scales out instances in response to trigger volume. Scale controller monitors trigger sources; Functions runtime adds instances as needed. Effectively unlimited scale, bounded by regional limits.

**Key config points:**
- Set minimum instances > 0 on VMSS/App Service if cold start is unacceptable
- Set \`azure.functions.maxInstances\` to prevent cost runaway on consumption plan
- AKS: set resource requests/limits correctly — HPA uses requests as the denominator for CPU %`,
  pros:[
    "KEDA scale-to-zero eliminates idle compute cost for event-driven workloads",
    "App Service predictive auto-scale prevents latency spikes during ramp-up"
  ],
  cons:[
    "Cluster Autoscaler takes 5-10 minutes to provision a new node — KEDA scale-out may queue pods during scale-up",
    "Over-aggressive scale-in can cause connection drops if the termination grace period is too short"
  ],
  useCase:
`Euron business hours: 9-5 traffic is 10× weekend. App Service scheduled scale-out adds 3 instances at 8:45am before the surge; scale-in at 6pm. AKS ingestion workers use KEDA watching the Service Bus queue — scale 0→20 pods when a customer uploads 100 documents at once.`,
  alts:[
    "How does auto-scaling work in Azure?",
    "What is KEDA and how does it differ from HPA in AKS?",
    "How do you configure Azure App Service auto-scaling?"
  ]
},

"azure-16": {
  answer:
`**Azure Synapse Analytics** is a unified analytics platform combining data warehousing, big data processing, data integration, and BI. Think of it as Azure's answer to Databricks + Snowflake.

**Compute options:**
- **Dedicated SQL Pool (formerly SQL DW):** MPP columnar warehouse. Pre-provisioned DWUs. Good for heavy BI workloads on structured data. Pause to save costs.
- **Serverless SQL Pool:** query data in place (ADLS, Parquet, Delta, JSON) with T-SQL. Pay per TB scanned. No compute to provision. Good for ad-hoc exploration.
- **Spark Pools:** managed Spark clusters. Notebooks, Python/Scala/R. Integrates with Synapse Pipelines and Delta Lake.

**Synapse vs Databricks:**
| | Synapse | Databricks |
|---|---|---|
| SQL experience | Native T-SQL, great tooling | Good but Databricks SQL is newer |
| Spark | Supported | Photon engine — significantly faster |
| Delta Lake | Supported | Native home of Delta Lake |
| MLflow | Limited | Native integration |
| Governance | Microsoft Purview integration | Unity Catalog |
| Ecosystem | Microsoft-first | Open ecosystem |

**Use Synapse when:** your team is T-SQL-first, you're already in the Microsoft ecosystem, and your workload is traditional BI/reporting. **Use Databricks when:** Spark performance matters, you need ML/MLflow, or you want best-in-class Delta Lake support.`,
  pros:[
    "Serverless SQL Pool enables cost-effective ad-hoc querying with no cluster management",
    "Native integration with Microsoft Purview for data governance and lineage",
    "Synapse Pipelines (ADF-like) unifies ETL and analytics in one interface"
  ],
  cons:[
    "Dedicated SQL Pool pricing model (always-on DWUs) is expensive if not carefully managed",
    "Databricks Photon engine outperforms Synapse Spark significantly for large-scale transformations"
  ],
  useCase:
`An enterprise BI team queries 10TB of sales data from ADLS Gen2 using Synapse Serverless SQL Pool — no cluster to manage, T-SQL they already know, pay per query. A separate data engineering team uses Databricks for the ELT pipelines feeding that same data lake.`,
  alts:[
    "What is the difference between Azure Synapse dedicated SQL pool and serverless SQL pool?",
    "When should I use Synapse vs Databricks?",
    "What is Synapse Analytics and what does it replace?"
  ]
},

"azure-17": {
  answer:
`**Azure Data Factory (ADF)** is Azure's managed ETL/ELT orchestration service. It orchestrates data movement and transformation across 90+ connectors — databases, SaaS apps, file systems, cloud storage.

**Core concepts:**
- **Pipelines:** logical grouping of activities that perform a unit of work. Triggered manually, on schedule, or by event.
- **Activities:** individual steps — Copy (data movement), Data Flow (transformation), Execute Stored Procedure, Web, Execute Databricks Notebook.
- **Linked Services:** connection definitions (like a named connection string). Defined once, reused across activities.
- **Datasets:** named references to data within a linked service.
- **Integration Runtimes (IR):**
  - *Azure IR:* managed compute in Azure for cloud-to-cloud data movement.
  - *Self-hosted IR:* installed on-prem or in a private network to access on-prem data sources.
  - *SSIS IR:* runs legacy SSIS packages.

**Data Flows:** GUI-based transformation (no-code mapping) that compiles to Spark. Runs on a cluster ADF manages — no Spark expertise required.

**Triggers:**
- Schedule (cron)
- Tumbling window (sequential time windows with backfill support)
- Event-based (blob created in Storage)
- Storage event

**ADF vs Databricks for ETL:** ADF excels at orchestration and data movement with many connectors. For complex transformations, ADF calls Databricks Notebooks and Spark jobs.`,
  pros:[
    "90+ connectors cover almost any data source without custom code",
    "Self-hosted IR enables hybrid scenarios — move data from on-prem Oracle to Azure SQL",
    "Monitoring UI shows pipeline run history, activity duration, and error details"
  ],
  cons:[
    "Data Flows (Spark-backed) have a cluster start-up overhead of 2-4 minutes",
    "ADF JSON configuration is complex — Bicep/Terraform ADF resources are verbose",
    "Debugging complex pipeline failures requires navigating multiple JSON activity logs"
  ],
  useCase:
`Daily ETL: ADF's Copy activity pulls customer records from on-prem SQL Server (via Self-hosted IR) into ADLS Gen2 Parquet. A Data Flow activity applies business rules and writes to Azure SQL Database. A Databricks Notebook activity runs ML feature engineering. All orchestrated in one ADF pipeline, monitored in Azure Monitor.`,
  alts:[
    "What is Azure Data Factory and what is it used for?",
    "What is the difference between ADF's Copy activity and Data Flow?",
    "What is a Self-hosted Integration Runtime in ADF?"
  ]
},

"azure-18": {
  answer:
`**Azure OpenAI Service** is Microsoft's managed deployment of OpenAI models (GPT-4, GPT-4o, GPT-3.5-Turbo, embeddings, DALL-E) inside your Azure subscription. Enterprise-grade SLAs, data privacy (your data is not used for training), and Azure's security/compliance features.

**Deployment models:** you create "deployments" — an instance of a model with a name and capacity allocation:
\`\`\`
Deployment name: gpt4o-prod
Model: gpt-4o
Version: 2024-11-20
\`\`\`
Your app calls the deployment by name. Changing the underlying model version is transparent to callers.

**PTU vs Pay-per-token:**
- **Pay-per-token (serverless):** pay per 1K tokens. No capacity to reserve. Subject to shared TPM (tokens per minute) limits. Good for dev/low volume.
- **Provisioned Throughput Units (PTU):** reserved compute capacity. Predictable latency and throughput. Required for production workloads with consistent load. More expensive upfront.

**Content filtering:** mandatory policy layer between your prompt and the model. Categories: hate, violence, sexual, self-harm. Each configurable to low/medium/high/off (subject to Microsoft approval for off). Custom blocklists for domain-specific terms.

**Rate limits:** per deployment in TPM (tokens per minute) and RPM (requests per minute). Implement exponential backoff + retry. Distribute load across multiple deployments for higher throughput.`,
  pros:[
    "Data does not leave your Azure tenant — critical for GDPR and enterprise compliance",
    "PTU gives latency predictability that shared OpenAI API cannot guarantee",
    "Native integration with Azure AI Search for RAG pipelines"
  ],
  cons:[
    "Model availability lags behind openai.com — new models appear weeks/months later",
    "PTU requires capacity reservation commitments — wrong sizing is costly",
    "Content filters can reject legitimate prompts — tuning requires a whitelist process"
  ],
  useCase:
`Euron uses Azure OpenAI \`gpt-4o\` for chat completions and \`text-embedding-3-large\` for KB embeddings. Chat completions use PTU for predictable latency during business hours. The embeddings endpoint uses pay-per-token (lower volume). Content filtering is set to medium for hate/violence on the public-facing chat endpoint.`,
  alts:[
    "What is the difference between Azure OpenAI and the OpenAI API?",
    "What are Provisioned Throughput Units (PTU) in Azure OpenAI?",
    "How does content filtering work in Azure OpenAI?"
  ]
}
