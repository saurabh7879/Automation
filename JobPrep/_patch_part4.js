// PATCH PART 4: azure-19 through azure-35
"azure-19": {
  answer:
`**RAG on Azure** uses Azure AI Search as the vector store + Azure OpenAI for generation — Microsoft's "integrated vectorization" end-to-end pipeline.

**Architecture:**
\`\`\`
User query
  → Azure OpenAI embeddings (text-embedding-3-large)
  → Azure AI Search (vector similarity search on knowledge_chunks index)
  → Top-K relevant chunks returned
  → Prompt assembled: system + context chunks + user question
  → Azure OpenAI chat completion (gpt-4o)
  → Answer with citations streamed to client
\`\`\`

**Azure AI Search (formerly Cognitive Search):**
- Supports vector search (HNSW index), hybrid search (BM25 + vector), and semantic reranking
- Integrated vectorization: configure an indexer to automatically call OpenAI embeddings on document ingestion — no separate embedding pipeline code

**Managed identity chain:** the Search indexer uses a Managed Identity to read from Blob Storage and call OpenAI — no secrets in the indexer config.

**Chunking strategy:** 512-1024 tokens with 10-20% overlap. Overlap preserves context across chunk boundaries. Azure AI Search's document cracking handles PDF/Word/HTML extraction.

**Citation tracking:** store document ID, page, and source URL in the search index alongside the embedding. Return them with each chunk so the answer can cite sources.`,
  pros:[
    "Integrated vectorization removes custom embedding pipeline code — indexer handles it",
    "Hybrid search (BM25 + vector) outperforms pure vector search for most enterprise KB use cases",
    "Semantic reranking (using cross-encoder) improves answer relevance with minimal code"
  ],
  cons:[
    "Azure AI Search has per-unit pricing that can be significant for large indexes",
    "HNSW index parameters (efConstruction, m) need tuning for recall vs speed trade-off"
  ],
  useCase:
`Customer asks: "How do I reset my password?" → embeddings call → AI Search returns 3 relevant KB chunks from the password reset article → GPT-4o constructs a step-by-step answer citing the article → response streamed to chat widget with source link. Latency: ~800ms for retrieval + ~1.5s for generation.`,
  alts:[
    "How do you build a RAG system on Azure?",
    "What is Azure AI Search integrated vectorization?",
    "How do you implement hybrid search in Azure AI Search?"
  ]
},

"azure-20": {
  answer:
`**Azure Cosmos DB** is a globally distributed, multi-model NoSQL database. It guarantees single-digit millisecond read/write latency at any scale and any region.

**Consistency levels** (strongest → weakest):
1. **Strong:** linearizable — reads see the latest committed write. Highest latency.
2. **Bounded Staleness:** reads may lag writes by at most K versions or T seconds. Predictable staleness.
3. **Session (default):** consistent within a session (your writes are immediately readable by you). Good balance.
4. **Consistent Prefix:** reads see writes in order but may lag. No out-of-order reads.
5. **Eventual:** lowest latency, highest availability. Reads may be stale.

**Partitioning:** every Cosmos DB container has a partition key. Data is distributed across logical partitions based on the partition key hash. Choosing the right partition key is critical:
- High cardinality (many unique values)
- Evenly distributed reads/writes
- Query patterns should include the partition key to avoid cross-partition queries

**RU (Request Units):** Cosmos DB's currency. Every operation costs RUs based on item size, complexity, and whether indexes are used. Provision capacity in RU/s or use autoscale/serverless.

**Multi-model APIs:** Cosmos DB's wire protocol is flexible — same database, multiple APIs: SQL (Core), MongoDB, Cassandra, Gremlin (graph), Table.`,
  pros:[
    "Turnkey global distribution — add a region, Cosmos DB replicates automatically",
    "Autoscale RU/s eliminates capacity planning — scales 10× during peaks, bills for actual use",
    "Five consistency models allow fine-grained trade-offs per use case"
  ],
  cons:[
    "RU cost model is opaque — easy to provision too few RUs and get throttled (429 errors)",
    "Cross-partition queries are expensive — bad partition key choice tanks performance",
    "Strong consistency doubles the latency — in practice, Session is used for most apps"
  ],
  useCase:
`Euron stores conversation history in Cosmos DB partitioned by \`tenantId\`. Each tenant's conversations live in one logical partition — queries by tenant never cross partitions. Session consistency: an agent sees their just-sent message immediately. Global distribution: customers in Asia read from the Singapore replica.`,
  alts:[
    "What are the Cosmos DB consistency levels and when do you use each?",
    "How do you choose a partition key in Cosmos DB?",
    "What is a Request Unit in Cosmos DB?"
  ]
},

"azure-21": {
  answer:
`Defense-in-depth: multiple security layers so no single failure exposes the system.

**Network Security Groups (NSGs):** L4 stateful firewall on subnets/NICs. Define inbound/outbound rules by IP, CIDR, port, protocol. Deny all by default; add explicit allows.

**Application Security Groups (ASGs):** logical groupings of VMs used in NSG rules. Instead of managing IP ranges, you reference ASGs: "allow ASG-web-tier to ASG-db-tier on port 5432."

**Azure Firewall:** managed stateful L7 firewall. FQDN filtering, TLS inspection, threat intelligence feeds, intrusion detection. Sits in a hub VNet, inspects traffic between spokes and to the internet.

**WAF (Web Application Firewall):** L7 protection against OWASP Top 10. Available on Azure Front Door and Application Gateway. OWASP Core Rule Set blocks SQLi, XSS, etc. Custom rules for rate limiting, geo-blocking.

**DDoS Protection:**
- **Basic (free):** platform-level volumetric DDoS mitigation.
- **Network Protection (paid):** adaptive tuning per IP, attack analytics, SLA guarantees, cost protection.

**Private Endpoints:** eliminate public internet exposure for PaaS services (SQL, Storage, Key Vault, OpenAI). Service gets a private IP in your VNet.

**Service Endpoints:** route traffic to PaaS services over Azure backbone; service firewall restricts to your subnet. Less secure than private endpoints (public DNS still resolves to public IP).`,
  pros:[
    "Private Endpoints fully eliminate public attack surface for backend services",
    "ASGs make NSG rules readable — 'allow web tier to db tier' vs 'allow 10.0.1.0/24 to 10.0.2.0/24'",
    "Azure Firewall centralized in a hub VNet enforces consistent egress policy across all spokes"
  ],
  cons:[
    "Running Azure Firewall + WAF adds ~$1,500+/month — overkill for small environments",
    "Private Endpoints require Private DNS Zone configuration — easy to misconfigure and break name resolution"
  ],
  useCase:
`Euron production: Front Door + WAF at the edge. Application Gateway in the VNet. AKS pods access Supabase (PostgreSQL) via Private Endpoint — no public IP. Azure Firewall in hub VNet restricts egress to approved FQDNs only (openai.azure.com, supabase.com). NSGs restrict AKS subnet to only app ports.`,
  alts:[
    "What is the difference between NSG and Azure Firewall?",
    "What is the difference between a Private Endpoint and a Service Endpoint?",
    "How do you protect an Azure application against OWASP vulnerabilities?"
  ]
},

"azure-22": {
  answer:
`**Azure Policy:** governance guardrails that enforce, audit, or remediate resource configuration at scale. Applied at Management Group, Subscription, or Resource Group scope — cascades down.

**Effect types:**
- **Deny:** blocks non-compliant resource creation/modification
- **Audit:** logs non-compliance but doesn't block
- **Modify:** adds/modifies resource properties (e.g., add required tags)
- **DeployIfNotExists:** deploys a resource if it doesn't exist (e.g., deploy Defender on every new VM)
- **AuditIfNotExists:** audit if a related resource doesn't exist

**Initiative definitions (Policy Sets):** group multiple policies into one assignment. Example: the "Azure Security Benchmark" initiative contains 200+ policies covering storage encryption, network security, etc.

**Examples:**
- Deny creation of public IP addresses: \`"Deny" effect on Microsoft.Network/publicIPAddresses\`
- Require tag "environment" on all Resource Groups: \`"Modify" effect adding the tag\`
- Audit Storage Accounts without HTTPS-only: \`"Audit" effect\`

**Azure Blueprints:** bundles RBAC assignments + Policy assignments + ARM templates into a versioned artifact applied to subscriptions. Like a "golden subscription template." Being deprecated in favor of Bicep + Azure Policy + deployment stacks.

**Remediation tasks:** for "DeployIfNotExists" and "Modify" policies — triggers a scan of existing non-compliant resources and remediates them.`,
  pros:[
    "Deny policies prevent misconfiguration before it reaches production — shift security left",
    "Compliance dashboard shows percentage-compliant per policy across all subscriptions",
    "Initiative assignments simplify managing 100+ policies as one artifact"
  ],
  cons:[
    "Policy evaluation is eventually consistent — may take minutes before a new assignment takes effect",
    "Overly aggressive Deny policies can block legitimate use cases — test in Audit mode first"
  ],
  useCase:
`Euron enforces: (1) Deny public Storage Accounts, (2) Require HTTPS-only on Storage, (3) DeployIfNotExists Defender for Containers on all AKS clusters, (4) Require \`costcenter\` and \`environment\` tags via Modify. All grouped in an initiative assigned at the Management Group level.`,
  alts:[
    "What is the difference between Azure Policy effects like Deny, Audit, and Modify?",
    "What is an Azure Policy initiative?",
    "How do you use Azure Policy to enforce compliance across many subscriptions?"
  ]
},

"azure-23": {
  answer:
`**Zero Trust** assumes no network is inherently trusted — verify every request regardless of whether it originates inside or outside the corporate network. "Never trust, always verify."

**Azure zero-trust pillars:**

**Identity (Conditional Access):** every authentication evaluated against conditions. Grant access only when:
- Identity is verified (MFA required)
- Device is compliant (Intune MDM enrolled)
- Location is expected (block access from risky countries)
- Risk score is low (Identity Protection)

**Privileged access (PIM — Privileged Identity Management):** no permanent admin assignments. Admins request elevation just-in-time, approved, time-limited, with audit trail. Eliminates standing privilege.

**Just-in-time VM access:** Microsoft Defender for Cloud's JIT blocks inbound RDP/SSH by default; analyst requests access for a time-limited window, the NSG rule opens temporarily.

**Workload identity:** AKS pods use Workload Identity (OIDC federation) — no long-lived credentials in the cluster. The Kubernetes service account token is exchanged for an Azure AD token with minimal permissions.

**Private networking:** no public endpoints for PaaS services. All service-to-service traffic stays in VNet via Private Endpoints.

**Micro-segmentation:** NSGs between every subnet so a compromised pod can't reach the database directly.`,
  pros:[
    "PIM provides audit trail for all privileged actions — essential for compliance (SOC2, ISO27001)",
    "Conditional Access blocks 99% of identity-based attacks without impacting user experience"
  ],
  cons:[
    "JIT access adds friction for operations teams — requires process discipline",
    "Rolling out Conditional Access MFA can disrupt legacy apps that don't support modern auth"
  ],
  useCase:
`Engineer needs to investigate a production DB. Steps: request PIM elevation to 'Contributor' (approval from manager, 2-hour window). Request JIT access to the Bastion host (auto-approved, 1-hour NSG rule). Connect via Azure Bastion (no public RDP port). All actions logged in Entra ID audit logs and Defender for Cloud.`,
  alts:[
    "What is zero trust security and how does Azure implement it?",
    "What is Privileged Identity Management (PIM) in Azure?",
    "How does Just-in-Time VM access work in Azure?"
  ]
},

"azure-24": {
  answer:
`**Microsoft Defender for Cloud** (formerly Azure Security Center + Azure Defender) is Azure's unified security posture management and threat protection platform.

**Two main capabilities:**

**CSPM (Cloud Security Posture Management):**
- **Secure Score:** a percentage reflecting how many security recommendations you've implemented. Improvements tracked over time.
- **Regulatory Compliance dashboard:** maps your config against standards (NIST, CIS, PCI-DSS, ISO27001, GDPR).
- **Security recommendations:** actionable items ranked by severity. "Enable MFA for accounts with write permissions" → click to remediate.

**CWP (Cloud Workload Protection):**
- **Defender plans:** paid protection for specific resource types. Defender for Servers, Containers, Storage, SQL, App Service, Key Vault, etc.
- Threat detection using behavioral analytics, anomaly detection, and threat intelligence.
- Examples: SQL injection attempts on Azure SQL, anomalous API call patterns, crypto-mining on VMs.

**Alerts:** severity-classified (High/Medium/Low). Integrated with Sentinel (SIEM) for correlation and investigation.

**Agent-based vs agentless:** Defender for Servers uses Microsoft Monitoring Agent (MMA) or Azure Monitor Agent for deep OS-level visibility. Agentless scanning (disk snapshots) available for some capabilities without agent installation.`,
  pros:[
    "Secure Score gives a single actionable metric to track security posture improvement over time",
    "Unified dashboard covers multi-cloud (Azure, AWS, GCP) and on-prem with Defender for Servers"
  ],
  cons:[
    "Defender plans add significant cost — Defender for Servers P2 is ~$15/server/month at scale",
    "Alert volume can be high without tuning — requires Sentinel or Defender for Cloud SOAR for automation"
  ],
  useCase:
`Euron's monthly security review: Secure Score is 73% (up from 68%). Top recommendations: enable HTTPS-only on 2 Storage Accounts, enable MFA on 1 break-glass account. Defender for Containers alerted on a suspicious container image pull from an unknown registry — Sentinel correlated it with a failed login attempt from the same IP 5 minutes earlier.`,
  alts:[
    "What is Microsoft Defender for Cloud?",
    "What is Secure Score in Azure?",
    "What is the difference between CSPM and CWPP in Defender for Cloud?"
  ]
},

"azure-25": {
  answer:
`**The rule:** nothing sensitive in code, config files, or environment variables. Everything in Key Vault, accessed via Managed Identity.

**Secrets management:**
1. Store secrets in Azure Key Vault (API keys, DB passwords, OAuth client secrets).
2. Access from app using \`DefaultAzureCredential\` — picks up Managed Identity in Azure, developer credentials locally.
3. Cache in memory for the process lifetime — don't call Key Vault on every request.
4. Set Key Vault soft delete (7-90 days) and purge protection to prevent accidental deletion.
5. Enable Key Vault diagnostics → Log Analytics → alert on unexpected secret access.

**Certificate management:**
- Azure Key Vault can act as an intermediate CA or integrate with DigiCert/Let's Encrypt.
- **Auto-renewal:** configure a Key Vault Certificate with a validity period and renewal threshold. Key Vault requests a new cert automatically (with DigiCert/Let's Encrypt) and rotates it without downtime.
- App Service and AKS pull certs from Key Vault via CSI driver — the app sees a file mount that stays current.

**Key rotation:**
- Storage account keys: Key Vault can auto-rotate and update applications (via Event Grid notification).
- Custom secrets: set an expiry on the secret + alert on approaching expiry → trigger rotation pipeline.

**Secret scanning:** use Microsoft Defender for DevOps or GitHub Advanced Security to scan repos for accidentally committed secrets.`,
  pros:[
    "Auto-renewal eliminates 'certificate expired' incidents — Key Vault handles the renewal lifecycle",
    "Managed Identity access means no service principal secrets to rotate"
  ],
  cons:[
    "Key Vault has request rate limits — high-frequency secret reads require client-side caching",
    "CSI driver for Kubernetes cert mounting requires configuration and restarts on cert updates"
  ],
  useCase:
`Euron's TLS cert for \`api.euron.io\` is stored in Key Vault and set to auto-renew 30 days before expiry with DigiCert. AKS mounts it via the Secrets Store CSI driver — pods see a file at \`/mnt/certs/tls.crt\` that updates automatically. No human intervention for cert renewal.`,
  alts:[
    "How do you manage TLS certificates in Azure?",
    "How do you rotate secrets in Azure Key Vault automatically?",
    "How do you access Key Vault from an AKS pod without secrets?"
  ]
},

"azure-26": {
  answer:
`**Azure DevOps** is Microsoft's integrated DevOps platform:
- **Repos:** Git repositories (private, unlimited)
- **Pipelines:** CI/CD pipelines (YAML or classic)
- **Boards:** Agile project management (Kanban, sprints, backlogs)
- **Artifacts:** package feeds (NuGet, npm, Maven, PyPI)
- **Test Plans:** manual and automated test management

**YAML pipelines** are the modern approach — pipeline as code, versioned alongside the application:
\`\`\`yaml
trigger:
  branches:
    include: [main, release/*]

stages:
- stage: Build
  jobs:
  - job: BuildAndTest
    pool: { vmImage: 'ubuntu-latest' }
    steps:
    - task: Docker@2
      inputs: { command: buildAndPush, containerRegistry: myACR, repository: euron-api }

- stage: DeployStaging
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: DeployToStaging
    environment: staging           # approval gates can be configured on environments
    strategy: { runOnce: { deploy: { steps: [...] } } }
\`\`\`

**Environments:** deployment targets with approval gates, deployment history, and resource health. Gate a production deploy on manual approval from the release manager.

**Service connections:** named credentials for connecting to Azure (Managed Identity via Workload Identity Federation — no secrets), GitHub, Docker Hub, etc.`,
  pros:[
    "Pipeline as code — YAML pipelines versioned with the app, branch policies prevent direct main commits",
    "Environments with approval gates enforce release governance without separate tooling",
    "Workload Identity Federation eliminates service principal secrets in pipeline service connections"
  ],
  cons:[
    "YAML syntax has a steep learning curve — nested indentation errors are common",
    "Azure Boards integration with GitHub is possible but less seamless than native GitHub Issues + Actions"
  ],
  useCase:
`PR to main triggers build + unit tests. Merge to main deploys to staging automatically. Production deploy requires a release manager approval in the Environments UI. The pipeline uses Workload Identity Federation to push to ACR and deploy to AKS — no secrets stored in DevOps.`,
  alts:[
    "How do you set up a CI/CD pipeline in Azure DevOps?",
    "What are Azure DevOps Environments and how do approval gates work?",
    "What is Workload Identity Federation in Azure DevOps service connections?"
  ]
},

"azure-27": {
  answer:
`Three IaC options for Azure, each with different trade-offs.

**ARM Templates (JSON):** the native Azure IaC format. Every Bicep/Terraform call ultimately translates to ARM. Pros: full feature parity, no drift. Cons: JSON is verbose, hard to read/maintain, limited abstraction (no loops until recently).

**Bicep:** Microsoft's DSL that compiles to ARM. Cleaner syntax, type safety, native Azure resource support (no provider versioning lag), first-class VS Code tooling. Bicep is the recommended Microsoft-native IaC choice.
\`\`\`bicep
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'euron-kv-\${env}'
  location: resourceGroup().location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableSoftDelete: true
    enablePurgeProtection: true
  }
}
\`\`\`

**Terraform:** open-source, multi-cloud. HCL is readable; state file tracks deployed resources; plan/apply workflow shows changes before applying. Pros: works for Azure + AWS + GCP in one codebase; large ecosystem; mature modules. Cons: state file must be stored and locked (use Azure Storage + lease), provider versions lag new Azure features.

**Recommendation:**
- Azure-only shop → **Bicep** (no state file, no provider lag, native Azure)
- Multi-cloud or existing Terraform investment → **Terraform**
- ARM directly → only for features not yet in Bicep`,
  pros:[
    "Bicep: no state file management — ARM tracks state natively",
    "Terraform: plan command shows exact changes before apply — safe in production",
    "Both enable idempotent deployments — apply the same template twice safely"
  ],
  cons:[
    "Bicep: Azure-only — no multi-cloud story",
    "Terraform: state file locking must be handled (Azure Storage backend with lease)",
    "ARM JSON: too verbose for humans to author directly"
  ],
  useCase:
`Euron uses Bicep for all Azure infra. A \`main.bicep\` deploys the AKS cluster, ACR, Key Vault, Storage Account, and Service Bus. Applied via Azure DevOps pipeline on merge to main. Each environment (dev/staging/prod) passes different parameter files. No state file to manage.`,
  alts:[
    "What is the difference between Bicep and ARM templates?",
    "When should I use Terraform vs Bicep for Azure infrastructure?",
    "What are the advantages of Bicep over ARM JSON?"
  ]
},

"azure-28": {
  answer:
`**Azure Monitor** is the umbrella observability platform covering metrics, logs, alerts, and visualizations across all Azure services.

**Components:**

**Log Analytics (Workspace):** log aggregation and query using KQL (Kusto Query Language). Ingests diagnostic logs from Azure resources, container logs, custom app logs, security logs. The central store for operational data.

**Application Insights:** APM (Application Performance Monitoring) for applications. Automatic instrumentation (SDK or agent) captures: request rates, response times, failure rates, dependency calls, exceptions, custom traces. Distributed tracing with operation IDs to correlate across services.

**Metrics:** time-series numeric data for Azure resources (CPU, memory, HTTP request count). Lower retention (93 days by default) but lower cost than logs. Near-real-time.

**Alerts:** trigger on metrics, log queries, or activity log events. Action groups define what happens: email, SMS, Azure Function, webhook, Logic App.

**Workbooks:** interactive report and dashboard builder using Log Analytics data. Good for operational dashboards and incident reports.

**KQL basics:**
\`\`\`kql
// Top 10 slowest requests in the last hour
requests
| where timestamp > ago(1h)
| summarize avg(duration), count() by name
| order by avg_duration desc
| take 10
\`\`\``,
  pros:[
    "Application Insights distributed tracing correlates a single user request across 12 microservices automatically",
    "Log Analytics centralizes logs from all Azure resources, VMs, containers, and custom apps in one queryable store",
    "Smart detection in Application Insights auto-detects performance anomalies without manual alert config"
  ],
  cons:[
    "Log Analytics ingestion costs can be significant for high-volume log sources — set daily caps",
    "KQL has a learning curve — complex queries are powerful but require practice"
  ],
  useCase:
`Euron's on-call runbook: when a P1 alert fires, open the Application Insights end-to-end transaction view, find the failed request, follow the operation ID through the FastAPI traces and dependency calls (to Supabase, OpenAI, Redis), identify the slow call. MTTR drops from 45 minutes to 10 minutes.`,
  alts:[
    "What is the difference between Azure Monitor, Log Analytics, and Application Insights?",
    "What is KQL and how do you use it for Azure logs?",
    "How do you set up alerts in Azure Monitor?"
  ]
},

"azure-29": {
  answer:
`End-to-end observability covers the three pillars: **logs, metrics, and traces**.

**Architecture for Euron:**

**Logs → Log Analytics Workspace:**
- Container Insights: AKS pod/node logs → Log Analytics
- Application logs: FastAPI structured JSON logs → Log Analytics via Fluent Bit sidecar
- Azure resource diagnostic logs: Key Vault access, Service Bus operations → Log Analytics
- Retention: 30 days hot (queryable), archive to Storage after

**Metrics → Azure Monitor:**
- AKS cluster metrics (CPU, memory, node count) → native metrics
- Application custom metrics via OpenTelemetry → Application Insights
- Business metrics (tickets/hour, RAG latency) → custom metrics API

**Distributed Tracing → Application Insights:**
- OpenTelemetry SDK instrumented in FastAPI: auto-instruments HTTP requests, outbound calls, SQL queries
- Correlation: each request tagged with \`trace_id\` propagated through Service Bus messages, OpenAI calls
- End-to-end trace: HTTP request → Service Bus → Function → Supabase → OpenAI, all in one timeline

**Alerting:**
- P1: response time > 2s for 5 minutes → PagerDuty → on-call
- P2: error rate > 1% → email → team
- P3: Secure Score drops > 5% → email → security team

**Dashboards:** Azure Workbooks for operational dashboard; Grafana (using Azure Monitor as data source) for team-facing dashboards.`,
  pros:[
    "OpenTelemetry SDK provides vendor-neutral instrumentation — exporters can target any backend",
    "Correlating traces across services is impossible without distributed tracing — critical for debugging microservices"
  ],
  cons:[
    "Log Analytics ingestion cost can surprise — high-cardinality logs (per-request debug logging) are expensive",
    "Achieving consistent trace propagation through all async components (queues, event grid) requires explicit W3C trace context injection"
  ],
  useCase:
`User reports slow ticket response. In Application Insights: find the request by user ID → see the RAG retrieval call took 4.2s (expected < 500ms) → drill into the Azure AI Search dependency call → it's scanning 1M vectors with no query filter. Root cause: missing tenant_id filter in the search query.`,
  alts:[
    "How do you implement observability for microservices on Azure?",
    "How do you set up distributed tracing in Azure?",
    "What is the role of OpenTelemetry in Azure observability?"
  ]
},

"azure-30": {
  answer:
`Azure costs can spiral without active management. Key tools and strategies:

**Cost Management + Billing:** the Azure native cost analysis tool. View spending by subscription, resource group, service, tag, and time period. Set budgets with alerts at 80%/100% of threshold.

**Tags for cost allocation:** tag every resource with \`environment\`, \`team\`, \`application\`. Enforce via Azure Policy (Modify effect). Then filter cost reports by tag to see what each team/product costs.

**Budgets:** set monthly spend limits. When 80% is reached, email the team. At 100%, optionally trigger an automation (e.g., shut down dev VMs).

**Reserved Instances (RI) / Savings Plans:**
- **Reserved Instances:** commit to 1 or 3 years for a specific VM SKU/region. Up to 72% discount vs pay-as-you-go. Use for stable, always-on production workloads.
- **Azure Savings Plan:** commitment to a fixed hourly spend across any VM family. More flexible than RI.

**Spot VMs / Spot node pools in AKS:** up to 90% discount for interruptible workloads (batch jobs, dev clusters, test runners). AKS Spot node pools + cluster autoscaler handle evictions gracefully.

**Azure Advisor cost recommendations:** identifies orphaned resources (unattached disks, idle VMs, unused public IPs), right-sizing opportunities, and RI recommendations.`,
  pros:[
    "Reserved Instances + Savings Plans can cut compute costs 40-72% for stable workloads",
    "Budget alerts give early warning before a bill surprise arrives at month end",
    "Spot node pools can run dev/test workloads at 80-90% discount"
  ],
  cons:[
    "Reserved Instances lock you into a VM SKU/region for 1-3 years — risky if architecture changes",
    "Tagging discipline requires cultural change + Policy enforcement — usually ad hoc at first"
  ],
  useCase:
`Euron month 3: Azure Advisor shows 3 unattached premium disks ($120/month). Dev AKS node pool switched to Spot — saves 75%. Production AKS system node pool reserved for 1 year (25% discount). Monthly cost budget alert set at $5k → email on breach.`,
  alts:[
    "How do you control and reduce Azure costs?",
    "What is the difference between Reserved Instances and Savings Plans in Azure?",
    "How do you use Azure tags for cost allocation?"
  ]
},

"azure-31": {
  answer:
`**SCENARIO: Migrate on-prem .NET app to Azure with zero downtime.**

**Discovery phase (weeks 1-2):**
- Inventory: .NET version, dependencies, session state (in-proc? Redis?), file system usage, scheduled jobs
- Database: SQL Server size, features used (SSIS? CLR? replication?)
- Traffic patterns: peak hours, connection counts

**Migration strategy — Lift and shift first, modernize after:**

**App tier → Azure App Service:**
1. Deploy new version to App Service alongside existing on-prem (parallel run)
2. Switch a test tenant (or internal users) to App Service — validate
3. Traffic Manager weighted routing: 5% → App Service, 95% → on-prem
4. Gradually increase: 5/10/25/50/100 over days/weeks
5. Decommission on-prem when stable

**Database → Azure SQL Database:**
1. Azure Database Migration Service (DMS) for online migration — continuous sync during cutover window
2. Test application against Azure SQL (connection string, schema, performance)
3. Cutover: drain connections, final sync, point app connection string at Azure SQL
4. Downtime window: <5 minutes for final cutover

**Session state:** if in-proc, migrate to Redis Cache (Azure Cache for Redis) before the app migration.

**Zero downtime requirements:** Traffic Manager for gradual shift; App Service deployment slots for app version changes; DMS online mode for database.`,
  alts:[
    "How do you migrate an on-premises .NET application to Azure?",
    "How do you achieve zero downtime during a database migration to Azure SQL?",
    "What Azure services help with migrating on-prem workloads?"
  ]
},

"azure-32": {
  answer:
`**SCENARIO: Azure bill increased 40% month-over-month — investigate and optimize.**

**Step 1 — Identify the spike (Day 1):**
- Azure Cost Management → Cost Analysis → filter by Service → find which service grew
- Set granularity to daily to see when the spike started (date of a deployment? new feature?)
- Filter by Resource Group, Tag, or Resource to pinpoint the resource

**Common culprits and fixes:**

**Compute explosion:**
- New VM SKU deployed in staging that wasn't shut down → right-size or delete
- AKS cluster autoscaler scaled out and didn't scale back → check min node count, resource requests/limits
- Dev/test VMs running 24/7 → auto-shutdown at 7pm weekdays

**Storage costs:**
- Log Analytics ingestion spike (verbose logging was deployed) → set sampling rate, daily cap
- Premium SSD disks unattached → Azure Advisor identifies these → delete or downgrade to Standard

**Network egress:**
- New cross-region data transfer (replication to DR region) → expected cost, document it
- DDoS attack increased bandwidth bills → enable DDoS Protection, WAF rate limiting

**Data processing:**
- New analytics workload using Synapse dedicated pool left running → pause when not in use
- Event Hub with unnecessary partitions/throughput units → scale down

**Step 3 — Prevent recurrence:**
- Budget alerts at 80% and 100% of expected monthly spend
- Tags + Policy to allocate costs to teams
- Weekly cost review in team standup`,
  alts:[
    "How do you investigate an unexpected Azure cost increase?",
    "What causes Azure bills to spike unexpectedly?",
    "How do you use Azure Cost Management to find orphaned resources?"
  ]
},

"azure-33": {
  answer:
`**SCENARIO: Multi-region disaster recovery for Azure-hosted app. Design with RTO/RPO targets.**

**Define targets first:**
- RTO (Recovery Time Objective): how long can the app be down? (e.g., 1 hour)
- RPO (Recovery Point Objective): how much data loss is acceptable? (e.g., 5 minutes)

**Architecture — Active-Passive with Traffic Manager:**

**Primary: East US | Secondary: West US 2 (paired region)**

**Compute (AKS):**
- Standby AKS cluster in West US 2 (smaller, scaled to minimum)
- Same container images from geo-replicated ACR
- Failover: Traffic Manager flips DNS to secondary ALB

**Database (Azure SQL):**
- Active geo-replication: continuous async replication to secondary (RPO typically < 5 seconds)
- Auto-failover group: automatic failover with a listener endpoint — app connection string doesn't change
- Data loss: up to RPO (seconds) of committed transactions

**Storage (Blobs):**
- GRS (Geo-Redundant Storage) or GZRS: automatic replication to paired region
- Read access: RA-GRS allows reads from secondary during primary failure

**Observability:**
- Monitor replication lag (Data Lag metric on auto-failover group) → alert if > 30s
- Monthly DR drills: test failover, validate RTO/RPO

**Traffic Manager:** Priority routing. Primary endpoint health probe every 30s. On failure detection (3 failures = 90s), DNS TTL (30s) flips traffic to secondary. Total failover time: ~2 minutes.`,
  alts:[
    "How do you design a disaster recovery architecture on Azure?",
    "What is the difference between RTO and RPO?",
    "How does Azure SQL auto-failover group work?"
  ]
},

"azure-34": {
  answer:
`**SCENARIO: Security audit found public endpoints, no encryption at rest, shared access keys. Remediate.**

**Priority 1 — Eliminate public endpoints (highest risk):**
1. Inventory all public IP addresses and public-accessible PaaS services: \`az network public-ip list\`, check Storage Account network rules, SQL Server firewall rules
2. Enable Private Endpoints for: Azure SQL, Storage, Key Vault, OpenAI
3. Disable public access: Storage Account → "Allow public access: Disabled"; SQL Server → "Deny public network access: Yes"
4. Azure Policy (Deny): prevent future public endpoints from being created

**Priority 2 — Encryption at rest:**
1. Storage Accounts: Microsoft-managed keys (MMK) are enabled by default — verify. Upgrade to Customer-Managed Keys (CMK) in Key Vault for compliance requirements.
2. Azure SQL: Transparent Data Encryption (TDE) is on by default. Verify it's using CMK (Key Vault) not service-managed key if required.
3. AKS OS disks: enable encryption at rest with CMK via DiskEncryptionSet.

**Priority 3 — Replace shared access keys:**
1. Storage: disable access key access (\`az storage account update --allow-shared-key-access false\`). Assign Managed Identities the appropriate Storage RBAC roles.
2. Azure SQL: switch connection strings to Entra ID authentication (Active Directory Default).
3. Key Vault: replace access policies with RBAC; grant only necessary built-in roles.
4. Rotate all existing access keys immediately as incident response.

**Prevent recurrence:** Azure Policy to deny shared key access, enforce Private Endpoints, and require CMK.`,
  alts:[
    "How do you remediate public endpoints in Azure?",
    "How do you replace Azure Storage access keys with Managed Identity?",
    "What is Customer-Managed Keys (CMK) in Azure and when do you need it?"
  ]
},

"azure-35": {
  answer:
`**SCENARIO: Event-driven microservices for order processing on Azure.**

**Service selection rationale:**

**Container Apps:** runs the order-processing microservices (order-service, inventory-service, payment-service, notification-service). Scale to zero when idle. KEDA scales based on Service Bus queue depth.

**Azure Service Bus (queues + topics):** reliable messaging backbone.
- Topic \`order-events\` with subscriptions: inventory-svc, payment-svc, notification-svc each get their own subscription
- Dead-letter queue for failed processing
- Sessions for ordered processing per customer

**Azure Cosmos DB:** order store. Partition key: \`customerId\` for co-location of all orders per customer. Session consistency for the ordering flow.

**Azure Functions (supplemental):**
- Timer trigger for order timeout detection (unpaid orders after 30 min → auto-cancel)
- Blob trigger for bulk order import

**Event Grid:** reacts to Cosmos DB change feed for downstream notifications (no polling).

**Flow:**
\`\`\`
POST /orders → order-service → Service Bus topic "order.created"
  ├─ inventory-svc: reserve stock → publishes "stock.reserved"
  ├─ payment-svc: charge → publishes "payment.completed"
  └─ notification-svc: email confirmation
All services update order status in Cosmos DB.
\`\`\`

**Observability:** Application Insights distributed tracing with correlation IDs propagated through Service Bus message properties. Dead-letter queue monitored with Azure Monitor alert.`,
  alts:[
    "How do you design event-driven microservices on Azure?",
    "Which Azure messaging service should I use for an order processing system?",
    "How do you scale microservices based on queue depth in Azure Container Apps?"
  ]
}
