// PATCH PART 7: databricks-1 through databricks-30
"databricks-1": {
  answer:
`**Databricks** is a cloud-based unified analytics platform built on Apache Spark. It's Spark plus a curated set of enterprise features:

| Feature | Vanilla Spark | Databricks |
|---|---|---|
| Runtime | Open-source Spark | Databricks Runtime (DBR) — Spark + optimizations |
| Engine | JVM Spark | **Photon** (C++ vectorized engine, drop-in replacement) |
| Storage | Parquet/ORC | **Delta Lake** as first-class format |
| Governance | None built-in | **Unity Catalog** (unified data governance) |
| Compute | Manual cluster management | Auto-scaling clusters, serverless SQL warehouses |
| Notebooks | Zeppelin/Jupyter separately | Built-in collaborative multi-language notebooks |
| CI/CD | DIY | Databricks Asset Bundles, Repos |
| ML | MLlib separately | MLflow integrated, Feature Store |

**Key additions over vanilla Spark:**

**Photon engine:** C++ vectorized engine that replaces the JVM Spark SQL execution engine. Compatible with Delta Lake. Typically 2-8x faster for SQL workloads. Enabled transparently — same API.

**Delta Lake:** ACID transactions on cloud storage. Time travel, schema enforcement, change data feed. First-class in Databricks; open-source with the Delta Standalone and Delta Connectors.

**Unity Catalog:** centralized metadata, lineage, and access control across all Databricks workspaces in an account. Three-level namespace: \`catalog.schema.table\`.`,
  pros:[
    "Photon makes SQL workloads significantly faster without code changes",
    "Managed infrastructure — no cluster version management, auto-scaling, auto-termination",
    "Delta Lake + Unity Catalog gives enterprise-grade governance on cloud storage"
  ],
  cons:[
    "Vendor lock-in — some Databricks-specific features (Photon, Unity Catalog) don't translate to open-source",
    "Significantly more expensive than self-managed Spark for equivalent compute"
  ],
  useCase:
`A team migrates from self-managed Spark on EMR to Databricks. Photon boosts their daily ETL from 4 hours to 50 minutes. Unity Catalog replaces their patchwork of Lake Formation policies and custom Ranger rules with a unified interface. Delta Lake enables audit-compliant time travel.`,
  alts:[
    "What is Databricks and how does it differ from open-source Spark?",
    "What is the Photon engine in Databricks?",
    "What does Databricks add on top of Apache Spark?"
  ]
},

"databricks-2": {
  answer:
`**Delta Lake** is an open-source storage layer that adds ACID transactions, schema enforcement, and time travel to cloud storage (S3, ADLS, GCS). It stores data as Parquet files with a transaction log (\`_delta_log/\`).

**ACID transactions:**
Multiple concurrent writers can safely update the same Delta table — operations are serializable. No partial writes corrupt the table. A failed write doesn't leave incomplete data.

**Time travel:**
\`\`\`python
# Read a previous version
spark.read.format("delta").option("versionAsOf", 5).load(path)
spark.read.format("delta").option("timestampAsOf", "2024-01-15").load(path)
# Restore to a version
spark.sql("RESTORE TABLE tickets TO VERSION AS OF 5")
\`\`\`

**Schema enforcement:** writing data with extra columns or wrong types raises an error by default. Prevents schema drift.

**Schema evolution (opt-in):**
\`\`\`python
df.write.format("delta").option("mergeSchema","true").mode("append").save(path)
\`\`\`

**Change Data Feed:** captures row-level changes (insert/update/delete) for downstream CDC pipelines:
\`\`\`python
ALTER TABLE tickets SET TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
spark.read.format("delta").option("readChangeFeed","true").option("startingVersion",5).table("tickets")
# Returns _change_type: insert/update_preimage/update_postimage/delete
\`\`\``,
  pros:[
    "ACID on cloud storage — no custom coordination needed for concurrent writes",
    "Time travel enables debugging, auditing, and recovery without a separate backup",
    "Schema enforcement catches upstream data quality issues before they corrupt the table"
  ],
  cons:[
    "Transaction log (\\_delta_log/) can grow large for high-frequency tables — needs VACUUM + checkpoint maintenance",
    "Delta tables are less portable than plain Parquet — need Delta reader for non-Spark consumers"
  ],
  useCase:
`A pipeline accidentally writes incorrect data (wrong priority mapping). Without Delta, this requires a full re-ingest. With Delta time travel: \`RESTORE TABLE tickets TO VERSION AS OF 42\` rolls back to before the bad write. Recovery time: 2 minutes vs 4 hours.`,
  alts:[
    "What is Delta Lake and what problems does it solve?",
    "How does Delta Lake implement ACID transactions on cloud storage?",
    "How does Delta Lake time travel work?"
  ]
},

"databricks-3": {
  answer:
`**Medallion architecture** (also called multi-hop) organizes data lake tables into quality tiers. Data flows from raw → cleaned → business-ready.

**Bronze (raw):** ingest data exactly as received from source systems. No schema changes, no business logic. Captures the original state for debugging and reprocessing.
- Format: Delta (append-only)
- Schema: source schema + \`_ingest_timestamp\`, \`_source_file\`
- Who reads: ingestion pipeline only

**Silver (refined):** cleaned, deduplicated, conformed data. Apply business rules, handle nulls, join reference data, enforce types.
- Remove duplicates, parse dates, standardize enumerations
- Row-level data quality — only valid records advance
- Who reads: Silver consumers, Gold pipelines

**Gold (business-level):** aggregated, denormalized tables optimized for consumption. One table per business domain or report.
- Aggregations (daily ticket counts, agent SLA metrics)
- Flat, wide tables for BI tools
- Who reads: analysts, dashboards, ML models, APIs

**When to break the pattern:**
- Simple reference data with no cleaning needed → ingest directly to Silver
- Very large Bronze tables that only a few queries touch → add Gold views instead of materialized Gold tables
- Real-time feeds → Streaming Silver directly, skip Bronze if replay isn't needed`,
  pros:[
    "Bronze preservation enables re-processing when business rules change without re-ingesting from source",
    "Clear layer responsibilities make debugging straightforward — find the layer where data diverges"
  ],
  cons:[
    "Storage duplication — same data stored 2-3 times (Bronze, Silver, Gold)",
    "Three-layer pipelines have more failure points and operational overhead than a single-hop approach"
  ],
  useCase:
`Euron's Bronze table stores raw ticket events from the API (append-only, exactly as received). Silver deduplicates events, parses timestamps, and joins with agent reference data. Gold aggregates into an \`agent_sla_daily\` table — one row per agent per day — that powers the admin analytics dashboard.`,
  alts:[
    "What is the Medallion architecture in Databricks?",
    "What is the difference between Bronze, Silver, and Gold tables?",
    "When would you skip a layer in the Medallion architecture?"
  ]
},

"databricks-4": {
  answer:
`**Unity Catalog (UC)** is Databricks' centralized governance layer, providing a unified interface for data discovery, access control, lineage, and auditing across all Databricks workspaces in an account.

**Three-level namespace:**
\`\`\`sql
catalog.schema.table
-- e.g.: euron_prod.tickets.silver_tickets
\`\`\`
A workspace can access tables from multiple catalogs. Before UC, each workspace had its own isolated Hive metastore — no sharing, no lineage, no consistent ACLs.

**Data lineage:** UC automatically tracks which tables were created from which queries. You can see upstream sources and downstream consumers of any table. Critical for compliance (what data does this model use?).

**Fine-grained access control:**
\`\`\`sql
-- Column masking:
CREATE FUNCTION mask_email(email STRING) RETURNS STRING
  RETURN CASE WHEN IS_ACCOUNT_GROUP_MEMBER('pii_access') THEN email ELSE '***@***.com' END;

ALTER TABLE customers ALTER COLUMN email SET MASK mask_email;

-- Row filtering:
CREATE FUNCTION tenant_filter(tenant_id STRING) RETURNS BOOLEAN
  RETURN IS_ACCOUNT_GROUP_MEMBER('admin') OR tenant_id = current_user();

ALTER TABLE tickets ADD ROW FILTER tenant_filter ON (tenant_id);
\`\`\`

**External locations:** UC manages access to cloud storage paths (S3/ADLS), ensuring all storage access goes through UC with proper credentials and auditing.`,
  pros:[
    "Column masking and row filters enforce PII protection centrally without application-level changes",
    "Automatic lineage is invaluable for GDPR 'right to be forgotten' impact analysis"
  ],
  cons:[
    "Migrating from hive_metastore to UC requires table migration and access policy re-implementation",
    "UC is Databricks-specific — metadata doesn't sync to other data platforms automatically"
  ],
  useCase:
`Support agents can query the tickets table and see customer names. Data scientists see \`***@***.com\` for emails. Admins see everything. All enforced by Unity Catalog row filters and column masks — no application code change. Audit log shows every query that touched PII columns.`,
  alts:[
    "What is Databricks Unity Catalog and what does it replace?",
    "How do you implement column-level security in Databricks Unity Catalog?",
    "What is the three-level namespace in Unity Catalog?"
  ]
},

"databricks-5": {
  answer:
`Three compute types in Databricks, each suited to different workloads:

**All-purpose clusters:**
- Interactive, multi-user, persistent
- Notebooks, ad-hoc queries, iterative development
- More expensive (pay for idle time)
- Supports auto-termination (e.g., terminate after 30 min idle)
- Shared by multiple users in a workspace

**Job clusters:**
- Ephemeral — created for a specific job run, terminated when job completes
- Lower cost (no idle time; can use Spot instances)
- Recommended for production automated pipelines
- Each job run gets a clean cluster — no state contamination from other jobs

**SQL Warehouses (Serverless SQL):**
- Optimized for SQL analytics (BI tools, SQL notebooks)
- Automatic scaling (Serverless: scale to zero, scale up in seconds)
- Pay per compute unit consumed — not per cluster-hour
- Powers Databricks SQL — dashboards, alerts, SQL editor
- Backed by Photon engine
- No ability to run Python/Scala — SQL only

**Choosing:**
- Development/exploration → all-purpose cluster
- Scheduled pipelines → job cluster (cheaper, cleaner)
- BI queries, SQL analytics → SQL Warehouse
- DLT pipelines → DLT creates its own managed job cluster`,
  pros:[
    "Job clusters eliminate idle compute cost — the biggest Databricks cost driver is idle all-purpose clusters",
    "Serverless SQL Warehouses scale to zero — no cost when not querying"
  ],
  cons:[
    "Job cluster startup time (2-4 min) adds latency — not suitable for real-time/low-latency triggers",
    "All-purpose clusters accumulate DBU cost even when not running active cells"
  ],
  useCase:
`Euron's architecture: data engineers use all-purpose clusters (auto-terminate at 30 min idle) for pipeline development. Production nightly jobs use job clusters with spot instances (70% cost savings). The SQL analytics dashboard connects to a serverless SQL Warehouse (scales to zero on weekends).`,
  alts:[
    "What is the difference between an all-purpose cluster, job cluster, and SQL warehouse in Databricks?",
    "When should I use a job cluster instead of an all-purpose cluster?",
    "What is a Databricks SQL warehouse?"
  ]
},

"databricks-6": {
  answer:
`**Databricks notebooks** are the primary interactive interface — multi-language cells within one notebook, version-controlled via Repos.

**Multi-language support (magic commands):**
\`\`\`python
# Default cell language is Python (or Scala, SQL, R — set at notebook level)
%sql SELECT COUNT(*) FROM tickets WHERE status='open'
%scala val df = spark.range(10)
%r summary(cars)
%sh ls /dbfs/mnt/data  # shell commands
%fs ls /               # DBFS file browser
\`\`\`

**Widgets (parameterized notebooks):**
\`\`\`python
dbutils.widgets.text("start_date", "2024-01-01")
dbutils.widgets.dropdown("env", "dev", ["dev","staging","prod"])
start_date = dbutils.widgets.get("start_date")
\`\`\`
Used by Databricks Workflows to pass runtime parameters to notebook tasks.

**Notebook workflows (dbutils.notebook.run):**
\`\`\`python
result = dbutils.notebook.run("./ingest_tickets", timeout_seconds=3600, arguments={"date": "2024-01-15"})
\`\`\`

**Version control via Repos:**
Notebooks stored in Repos sync with Git (GitHub, GitLab, Azure DevOps). Pull, push, branch, merge directly from Databricks UI. Notebooks are stored as \`.py\`, \`.scala\`, or \`.ipynb\` files.

**Best practice:** for production pipelines, convert notebooks to Python modules/packages and run them as jobs. Notebooks are great for exploration but hard to test and version properly.`,
  pros:[
    "Multi-language cells enable SQL exploratory analysis alongside Python transformation code in one notebook",
    "Widgets make notebooks parameterizable — same notebook runs for dev and prod with different inputs"
  ],
  cons:[
    "Notebooks are hard to unit test — extract business logic to Python functions in a library",
    "Collaborative editing can cause conflicts — use Repos + branches to avoid overwriting"
  ],
  useCase:
`An analyst and a data engineer co-develop a new SLA metric. Engineer writes the Spark transformation in Python cells; analyst writes the final SQL aggregation and visualization in SQL cells. They work in the same notebook on different Git branches, merge via PR review.`,
  alts:[
    "How do magic commands work in Databricks notebooks?",
    "What are Databricks widgets and how do you use them?",
    "How do you version control Databricks notebooks?"
  ]
},

"databricks-7": {
  answer:
`**Cluster auto-scaling** in Databricks dynamically adjusts the number of worker nodes based on workload demand.

**Configuration:**
\`\`\`json
{
  "autoscale": {
    "min_workers": 2,
    "max_workers": 20
  },
  "spark_conf": {
    "spark.databricks.delta.optimizeWrite.enabled": "true"
  }
}
\`\`\`
Databricks monitors job backlog and worker utilization. It adds workers when jobs are queued and removes idle workers after a configured grace period (default 150 seconds).

**Cluster policies:** templates that set default and maximum configurations for clusters created by users. Enforce governance:
- Cap max cluster size
- Enforce spot instance usage for non-interactive workloads
- Set auto-termination timeout
- Restrict instance types to approved SKUs
- Block all-purpose clusters in production workspaces

**Spot instances (preemptible VMs):**
\`\`\`json
{"first_on_demand": 1, "availability": "SPOT_WITH_FALLBACK"}
\`\`\`
First worker node is on-demand (stable Driver); rest are spot (can be preempted). 70-90% cost savings. Databricks handles spot evictions gracefully (stages restart).

**Instance pools:** pre-allocated idle instances ready to be claimed by new clusters. Reduces cluster startup from 4-5 minutes to 30-60 seconds.`,
  pros:[
    "Auto-scaling eliminates the need to predict peak resource requirements",
    "Cluster policies prevent runaway costs from poorly configured user clusters",
    "Instance pools dramatically reduce cluster startup latency for job clusters"
  ],
  cons:[
    "Auto-scaling decisions lag workload changes by minutes — initial spike still hits the original cluster size",
    "Spot evictions during a job cause task retries — verify jobs are retryable"
  ],
  useCase:
`Euron's ETL runs at 9am when all agents log in and upload documents. Auto-scale from 4 to 20 workers handles the burst. Cluster policy enforces spot instances for all worker nodes, auto-terminate after 20 min idle, and caps at 20 nodes. Weekend cost drops to near zero.`,
  alts:[
    "How does Databricks cluster auto-scaling work?",
    "What is a Databricks cluster policy and why should I use one?",
    "How do you use spot instances in Databricks to reduce cost?"
  ]
},

"databricks-8": {
  answer:
`**Databricks SQL** is the SQL analytics layer for querying Delta Lake tables. It's separate from Spark notebooks — a SQL-first interface for analysts and BI tools.

**SQL Warehouses:** the compute behind Databricks SQL. Three types:
- **Classic:** traditional cluster-based, slower startup (~2 min)
- **Pro:** larger cluster options, SQL Warehouse features
- **Serverless:** fastest startup (<5s), auto-scales to zero, per-DBU billing. Recommended.

**Databricks SQL features:**

**Query editor:** browser-based SQL editor with schema browser, history, saved queries.

**Dashboards:** build visualizations from SQL queries. Schedule to refresh on a cadence.

**Alerts:** monitor query results on a schedule; notify via email/Slack/PagerDuty when a condition is met (e.g., "alert when error_rate > 5%").

**Query federation:** query external data sources (JDBC, Salesforce, etc.) alongside Delta tables in the same SQL statement.

**Performance:**
- Photon engine backs SQL Warehouses — fast columnar execution
- Result caching: identical queries return cached results instantly
- Query history + profiling: see execution plans and bottlenecks for each past query

**Access via BI tools:** Databricks SQL exposes a JDBC/ODBC endpoint — connect Power BI, Tableau, Looker directly to Delta tables.`,
  pros:[
    "Serverless SQL Warehouse scales to zero — no cost when analysts aren't querying",
    "Direct BI tool connectivity via JDBC/ODBC eliminates the need to export data to a separate data warehouse"
  ],
  cons:[
    "Databricks SQL is SQL-only — Python transformations still need a cluster",
    "Dashboard capabilities are basic compared to Tableau/Power BI — mainly for simple operational monitoring"
  ],
  useCase:
`Support managers run daily SLA reports directly in Databricks SQL, querying the \`euron_prod.analytics.agent_sla_daily\` Gold table. A scheduled dashboard refreshes at 8am. An alert fires to Slack when the P1 breach rate exceeds 10%. Zero data exports — analysis lives with the data.`,
  alts:[
    "What is Databricks SQL and how does it differ from Spark notebooks?",
    "What is a Databricks SQL Warehouse?",
    "How do you connect Power BI to Databricks?"
  ]
},

"databricks-9": {
  answer:
`Delta Lake's ACID guarantees are implemented through the **transaction log** (\`_delta_log/\`).

**Transaction log structure:**
\`\`\`
s3://bucket/delta/tickets/
  _delta_log/
    00000000000000000000.json   # transaction 0 (table creation)
    00000000000000000001.json   # transaction 1 (first write)
    ...
    00000000000000000009.json   # transaction 9
    00000000000000000010.checkpoint.parquet  # checkpoint (every 10 by default)
\`\`\`

Each JSON file is a **commit** — a JSON record of add/remove file operations, metadata changes, and protocol changes.

**Reading a Delta table:**
1. Find the latest checkpoint file (skip reading all JSON files)
2. Read JSON files after the checkpoint
3. Reconstruct the current state: active files = adds - removes

**Optimistic concurrency:**
All writers attempt to commit by adding a new JSON file (atomic rename on cloud storage). If two writers conflict (both read version N and try to write version N+1), the second one to write detects the conflict and either fails (conflicting operations) or retries (compatible operations).

**Conflict resolution logic:**
- Concurrent appends: always succeed (different partitions can be written simultaneously)
- Concurrent update + update: fails if they touch the same rows
- Concurrent update + read: always succeeds

**Checkpoint files:** compact the JSON log every 10 transactions (configurable). Avoids reading thousands of JSON files on table load.`,
  pros:[
    "Atomic commit via file rename — no coordinator needed, works on S3 with eventual consistency",
    "Checkpoints keep table open time constant regardless of transaction history length"
  ],
  cons:[
    "High-frequency small writes create many JSON files — compact with OPTIMIZE + manual checkpoint",
    "Listing _delta_log/ on S3 can be slow for tables with millions of transactions without checkpoints"
  ],
  useCase:
`Two pipelines write to the same Delta table concurrently: one appends new tickets, another updates resolved ticket status. Delta's optimistic concurrency detects they don't conflict (different partitions) and allows both to succeed. No coordinator, no lock timeout.`,
  alts:[
    "How does Delta Lake implement ACID transactions?",
    "What is the Delta Lake transaction log?",
    "How does Delta Lake resolve write conflicts?"
  ]
},

"databricks-10": {
  answer:
`Delta Lake DML operations differ from traditional Hive-style overwrites in key ways.

**MERGE (upsert):**
\`\`\`sql
MERGE INTO silver_tickets AS target
USING bronze_updates AS source
ON target.ticket_id = source.ticket_id
WHEN MATCHED AND source.status != target.status THEN
  UPDATE SET target.status = source.status, target.updated_at = source.updated_at
WHEN NOT MATCHED THEN
  INSERT (ticket_id, status, created_at, updated_at)
  VALUES (source.ticket_id, source.status, source.created_at, source.updated_at)
WHEN NOT MATCHED BY SOURCE AND target.status = 'stale' THEN
  DELETE;
\`\`\`
Atomically handles inserts, updates, and deletes in one operation. Critical for CDC pipelines.

**UPDATE:**
\`\`\`sql
UPDATE tickets SET priority = 'P1' WHERE sla_hours < 1 AND priority = 'P2';
\`\`\`
Rewrites only the affected files (not the whole table like Hive overwrite).

**DELETE:**
\`\`\`sql
DELETE FROM tickets WHERE status = 'test' AND created_at < '2024-01-01';
-- Used for GDPR right-to-be-forgotten: DELETE WHERE customer_id = 'C001'
\`\`\`

**Hive-style overwrite (avoid for updates):** \`INSERT OVERWRITE\` replaces all data in a partition. Simpler but no upsert logic, no ACID — a failed overwrite leaves partial data.

**Key differences:**
- Delta DML is transactional — either fully succeeds or fails
- Delta MERGE is idempotent when combined with a unique key
- Hive overwrite is not transactional — a failure leaves the table in a corrupt state`,
  pros:[
    "MERGE is the correct primitive for CDC — insert new, update changed, delete removed",
    "MERGE idempotency with checkpoints enables exactly-once streaming semantics"
  ],
  cons:[
    "MERGE on large tables scans all files to find matching rows — Z-order on the join key improves performance",
    "High-frequency MERGEs create small files — OPTIMIZE + VACUUM periodically"
  ],
  useCase:
`Daily CDC from source database: MERGE inserts new tickets (WHEN NOT MATCHED), updates status changes (WHEN MATCHED AND changed), and soft-deletes removed tickets (WHEN NOT MATCHED BY SOURCE). One idempotent MERGE replaces a full overwrite pipeline.`,
  alts:[
    "How does Delta Lake MERGE work?",
    "What is the difference between Delta Lake DML and Hive overwrite?",
    "How do you implement an upsert in Delta Lake?"
  ]
},

"databricks-11": {
  answer:
`**Time travel** lets you query historical versions of a Delta table.

\`\`\`sql
-- By version number
SELECT * FROM tickets VERSION AS OF 10;
SELECT * FROM tickets@v10;

-- By timestamp
SELECT * FROM tickets TIMESTAMP AS OF '2024-03-01 09:00:00';

-- PySpark:
spark.read.format("delta").option("versionAsOf", 10).load(path)
spark.read.format("delta").option("timestampAsOf", "2024-03-01").load(path)

-- Restore (overwrite current table to historical version):
RESTORE TABLE tickets TO VERSION AS OF 10;
RESTORE TABLE tickets TO TIMESTAMP AS OF '2024-03-01';
\`\`\`

**Retention and VACUUM:**
By default, time travel is available for 30 days (configurable via \`delta.logRetentionDuration\`).

\`VACUUM\` physically deletes Parquet files that are no longer referenced by the current table version AND are older than the retention period:
\`\`\`sql
VACUUM tickets RETAIN 168 HOURS;  -- keep 7 days of history
\`\`\`

**Warning:** running VACUUM with a very short retention period (< 7 days) can break concurrent streaming readers that are still reading older files. Always maintain enough retention to cover your longest streaming lag.

**Auto-compaction and checkpointing** (Delta settings):
\`\`\`python
ALTER TABLE tickets SET TBLPROPERTIES (
  'delta.logRetentionDuration' = 'interval 30 days',
  'delta.deletedFileRetentionDuration' = 'interval 7 days'
)
\`\`\``,
  pros:[
    "Time travel enables point-in-time recovery without maintaining separate backup infrastructure",
    "Version AS OF enables reproducible ML training — always train on the exact dataset version used in a previous run"
  ],
  cons:[
    "Time travel files accumulate storage cost — VACUUM is necessary to control it",
    "VACUUM with short retention breaks streaming consumers that lag behind — coordinate with streaming team"
  ],
  useCase:
`A data scientist trains a model on \`tickets@v150\` and tracks the version in MLflow alongside the model. Six months later, they reproduce the training exactly by reading the same version. No snapshot needed — Delta's time travel provides the exact data.`,
  alts:[
    "How does Delta Lake time travel work?",
    "What does VACUUM do in Delta Lake and when should I run it?",
    "How do you restore a Delta table to a previous version?"
  ]
},

"databricks-12": {
  answer:
`**Z-ordering** is a multi-dimensional locality optimization that co-locates related data in the same set of files.

\`\`\`sql
OPTIMIZE tickets ZORDER BY (tenant_id, created_at);
\`\`\`

After Z-ordering, queries that filter on \`tenant_id\` and/or \`created_at\` read fewer files — the statistics in the Delta transaction log (min/max values per file) allow skipping files that can't contain matching data (data skipping).

**Z-order vs Partitioning:**

| | Partitioning | Z-ordering |
|---|---|---|
| Mechanism | Directory hierarchy | File-level locality |
| Cardinality | Low (< 10,000 distinct values) | High or multi-column |
| Query benefit | Directory pruning | File-level data skipping |
| Write cost | Distributes writes | Requires OPTIMIZE (read + rewrite) |
| Best for | date, region (< 1000 values) | user_id, tenant_id, ticket_id |

**When to use each:**
- **Partition by date:** queries filter by date → whole directories of older dates skipped
- **Z-order by tenant_id:** within each date partition, queries filter by tenant → file-level skipping
- **Z-order by ticket_id:** direct-access queries skip most files when looking up one ticket

**Practical rule:** partition on the column(s) you filter most in range queries (date); Z-order on the column(s) you filter in equality/equality-range queries (tenant_id, status).

\`\`\`sql
-- Common combination:
OPTIMIZE tickets ZORDER BY (tenant_id, status);
-- Table is partitioned by (year, month), Z-ordered within each partition
\`\`\``,
  pros:[
    "Z-ordering enables data skipping on high-cardinality columns where partitioning isn't viable",
    "OPTIMIZE + ZORDER also compacts small files — two benefits in one operation"
  ],
  cons:[
    "Z-ordering rewrites all files — expensive for large tables; schedule during off-peak",
    "Z-order effectiveness degrades with more columns — limit to 1-3 columns"
  ],
  useCase:
`Ticket queries always include a \`tenant_id\` filter. Table has 10,000 tenants (too high for partitioning). Z-order by \`tenant_id\`: queries for one tenant skip 99% of files based on min/max statistics. Query time drops from 45s (full scan) to 2s (data skipping).`,
  alts:[
    "What is Z-ordering in Delta Lake and how does it improve query performance?",
    "When should I use Z-ordering vs partitioning in Delta Lake?",
    "How does Delta Lake data skipping work with Z-ordering?"
  ]
},

"databricks-13": {
  answer:
`**Change Data Feed (CDF)** and **Change Data Capture (CDC)** are related but distinct:

- **CDC** is the broader concept of capturing changes from a source system (database binlog, Debezium, DMS)
- **CDF** is Delta Lake's built-in mechanism for capturing row-level changes within a Delta table

**Enabling CDF:**
\`\`\`sql
ALTER TABLE silver_tickets SET TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');
\`\`\`

**Reading changes:**
\`\`\`python
changes = spark.read.format("delta") \
    .option("readChangeFeed", "true") \
    .option("startingVersion", 5) \       # from version 5 forward
    .option("startingTimestamp", "2024-01-01") \  # or by timestamp
    .table("silver_tickets")
# Each row has: _change_type (insert/update_preimage/update_postimage/delete), _commit_version, _commit_timestamp
\`\`\`

**Building incremental pipelines with CDF:**
\`\`\`python
# Read only changes since last processed version
last_version = get_last_processed_version()
changes = spark.read.format("delta").option("readChangeFeed","true").option("startingVersion", last_version+1).table("silver_tickets")
# Apply changes to Gold table
\`\`\`

**CDF vs Structured Streaming:**
- CDF is for batch incremental reads (you control when to poll)
- Structured Streaming reads Delta as an auto-streaming source — Spark triggers micro-batches automatically`,
  pros:[
    "CDF enables efficient Gold table updates — only process changed rows instead of re-reading all of Silver",
    "update_preimage/postimage lets downstream pipelines compute the delta of what changed, not just the final state"
  ],
  cons:[
    "CDF adds storage overhead — change records are stored alongside data files",
    "CDF doesn't capture changes made before CDF was enabled — historical changes are not available"
  ],
  useCase:
`Silver tickets table receives 10,000 ticket updates per hour from the CDC feed. Gold \`agent_sla_daily\` table needs to reflect these changes. Using CDF, the Gold pipeline reads only the changed rows each hour and applies MERGE — instead of reprocessing all 50M Silver rows.`,
  alts:[
    "What is Delta Lake Change Data Feed and how is it different from CDC?",
    "How do you read Delta Lake changes incrementally?",
    "How do you build an incremental pipeline using Delta Lake CDF?"
  ]
},

"databricks-14": {
  answer:
`**Small file problem:** when many small Parquet files accumulate in a Delta table (from frequent small writes), query performance degrades because each file has overhead (S3 LIST calls, Parquet footer reads, task scheduling). Target: 128-256MB per file.

**OPTIMIZE (manual compaction):**
\`\`\`sql
OPTIMIZE tickets;                        -- compact all files to target size
OPTIMIZE tickets WHERE date = '2024-03'; -- compact one partition
OPTIMIZE tickets ZORDER BY (tenant_id); -- compact + optimize layout
\`\`\`

**Auto-compaction (Databricks-managed, Delta 2.0+):**
\`\`\`python
ALTER TABLE tickets SET TBLPROPERTIES (
  'delta.autoCompact.enabled' = 'true',          -- compact after each write
  'delta.autoCompact.minNumFiles' = '5'           -- trigger if ≥5 small files written
)
\`\`\`
Runs asynchronously after each write — compacts within the same transaction context.

**Optimized writes (Delta 2.0+):**
\`\`\`python
ALTER TABLE tickets SET TBLPROPERTIES ('delta.optimizeWrite.enabled' = 'true')
# Or per-write:
df.write.option("optimizeWrite", "true").format("delta").mode("append").save(path)
\`\`\`
Automatically repartitions data before write to produce fewer, larger files.

**VACUUM after OPTIMIZE:**
After OPTIMIZE rewrites files, old small files are removed from active state but still physically exist. Run VACUUM to delete them.`,
  pros:[
    "Auto-compaction + optimized writes eliminate the need to schedule manual OPTIMIZE runs",
    "OPTIMIZE with Z-ordering compounds benefits: fewer files + better data locality"
  ],
  cons:[
    "Auto-compaction runs synchronously in the write transaction on some versions — can increase write latency",
    "OPTIMIZE rewrites files — creates new Delta versions, growing the transaction log"
  ],
  useCase:
`Streaming pipeline writes 1000 small Parquet files per hour (one per micro-batch). After 24 hours: 24,000 files, queries take 8 minutes. After enabling auto-compaction + optimized writes: files compact to ~100 per hour. Same queries take 45 seconds.`,
  alts:[
    "How do you fix the small file problem in Delta Lake?",
    "What is the difference between auto-compaction and OPTIMIZE in Delta Lake?",
    "What is optimizeWrite in Delta Lake?"
  ]
},

"databricks-15": {
  answer:
`**Photon** is Databricks' C++ vectorized execution engine for SQL and DataFrame operations. It's a drop-in replacement for the JVM-based Spark SQL engine — same API, faster execution.

**How it works:**
- Operates on columnar Arrow-format data in CPU vector registers
- SIMD (Single Instruction, Multiple Data) processing: processes 8-16 values per CPU instruction
- No Python serialization for SQL operations — pure C++ from start to finish
- Integrated with Delta Lake — can push down filters to the Parquet reader

**Operations that benefit from Photon:**
- SQL aggregations (SUM, COUNT, AVG, GROUP BY)
- Parquet/Delta reads (columnar scan)
- Joins (hash join, sort-merge join)
- Window functions
- String operations with built-in functions

**Operations that fall back to JVM Spark:**
- Python UDFs (always — they require Python deserialization)
- Scala UDFs
- Complex custom aggregations not in the built-in function set
- RDD operations
- Some ML operations (Photon doesn't cover MLlib)

**Performance benchmark (typical):**
- SQL aggregations on Delta: 3-5x speedup
- Wide-table scans: 4-8x speedup
- Joins on large tables: 2-4x speedup
- Python UDFs: 0x speedup (unchanged — still Python)

Photon is enabled by default on Databricks Runtime 9.1+ on clusters and SQL Warehouses.`,
  pros:[
    "Photon provides significant speedup for SQL workloads with zero code changes",
    "SIMD processing makes Photon particularly effective for numeric aggregations on wide tables"
  ],
  cons:[
    "Python UDFs don't benefit — the main reason to replace UDFs with built-in functions",
    "Photon is Databricks-exclusive — portability to open-source Spark loses the speedup"
  ],
  useCase:
`After enabling Photon (just changing the cluster runtime from Standard to Photon), an SLA aggregation query that read 2TB of Delta data dropped from 12 minutes to 90 seconds. No code changes — same SQL, same data. The query is pure SQL aggregations over columnar Delta files — the sweet spot for Photon.`,
  alts:[
    "What is Photon in Databricks and what does it speed up?",
    "Why doesn't Photon help Python UDFs?",
    "How much faster is Photon compared to regular Spark SQL?"
  ]
},

"databricks-16": {
  answer:
`**Delta Live Tables (DLT)** is Databricks' framework for building declarative, managed data pipelines. Instead of writing imperative Spark jobs, you declare the tables and their source queries.

\`\`\`python
import dlt
from pyspark.sql.functions import col, current_timestamp

# Bronze — raw ingest
@dlt.table(comment="Raw ticket events from the API")
def bronze_tickets():
    return spark.readStream.format("cloudFiles") \  # Auto Loader
        .option("cloudFiles.format", "json") \
        .load("s3://raw/ticket-events/")

# Silver — cleaned
@dlt.table(comment="Cleaned and deduplicated tickets")
@dlt.expect_or_drop("valid_ticket_id", "ticket_id IS NOT NULL")  # data quality expectation
@dlt.expect("valid_status", "status IN ('open','pending','resolved','closed')")
def silver_tickets():
    return dlt.read_stream("bronze_tickets") \
        .filter(col("ticket_id").isNotNull()) \
        .withColumn("ingested_at", current_timestamp())

# Gold — aggregated
@dlt.table(comment="Daily ticket SLA metrics")
def gold_agent_sla():
    return dlt.read("silver_tickets") \
        .groupBy("agent_id", "date") \
        .agg(count("ticket_id").alias("ticket_count"))
\`\`\`

**Key features:**
- **Expectations:** data quality rules per table with actions: warn, drop, or fail
- **Materialized views:** \`@dlt.table\` — pre-computed, auto-refreshed
- **Streaming tables:** \`readStream\` — continuously append new records
- **CDC:** \`apply_changes\` API for SCD Type 1/2 from CDC sources
- **Managed compute:** DLT handles cluster lifecycle — you don't manage the cluster`,
  pros:[
    "Expectations provide built-in data quality monitoring with metrics tracked in the DLT event log",
    "DLT handles exactly-once streaming semantics automatically via checkpoints"
  ],
  cons:[
    "DLT abstracts away the cluster — less control over Spark configuration",
    "Debugging DLT pipelines is harder than debugging plain Spark code — limited stack traces"
  ],
  useCase:
`Euron's ingestion pipeline migrated to DLT. Bronze uses Auto Loader (cloudFiles) for scalable file discovery. Silver has 15 expectations — bad records are quarantined to an error table. Gold aggregations auto-refresh every 5 minutes. Pipeline failures alert via webhook.`,
  alts:[
    "What is Delta Live Tables (DLT) in Databricks?",
    "What are DLT expectations and how do they work?",
    "What is the difference between a DLT streaming table and a materialized view?"
  ]
},

"databricks-17": {
  answer:
`CI/CD for Databricks pipelines requires testing, artifact packaging, promotion across environments, and deployment automation.

**Asset Bundles (recommended, 2023+):**
\`\`\`yaml
# databricks.yml
bundle:
  name: euron_pipeline
  environments:
    dev:
      workspace: { host: https://adb-dev.azuredatabricks.net }
    prod:
      workspace: { host: https://adb-prod.azuredatabricks.net }

resources:
  jobs:
    etl_job:
      name: "Nightly ETL"
      tasks:
        - task_key: ingest
          notebook_task: { notebook_path: /Repos/main/notebooks/ingest }
          job_cluster_key: etl_cluster
      job_clusters:
        - job_cluster_key: etl_cluster
          new_cluster: { spark_version: "14.3.x-scala2.12", num_workers: 4 }
\`\`\`

\`\`\`bash
databricks bundle deploy --target dev   # deploy to dev
databricks bundle run --target dev      # trigger job
databricks bundle deploy --target prod  # promote to prod
\`\`\`

**Testing notebooks:**
\`\`\`python
# Use Databricks Connect or run notebooks in isolation with %run and assert
def test_clean_tickets():
    input_df = spark.createDataFrame([...])
    result = clean_tickets(input_df)
    assert result.count() == expected_count
    assertDataFrameEqual(result, expected_df)
\`\`\`

**Git → CI/CD pipeline:**
1. PR → GitHub Actions: run unit tests (local SparkSession), lint, type check
2. Merge to main → deploy to dev workspace via \`databricks bundle deploy --target dev\`
3. Automated integration tests against dev
4. Manual approval → deploy to prod`,
  pros:[
    "Asset Bundles version-control all Databricks resources (jobs, clusters, permissions) as code",
    "Environment promotion is a single CLI command — no manual UI recreation"
  ],
  cons:[
    "Asset Bundles require Databricks CLI 0.200+ — teams on older CLI need to migrate",
    "Notebook testing in CI without a full cluster requires Databricks Connect setup"
  ],
  useCase:
`Euron's Databricks pipelines are defined in \`databricks.yml\`. PR triggers GitHub Actions: unit tests (local SparkSession), asset bundle validation. Merge to main deploys to dev. After passing integration tests (smoke test on dev cluster), the release PR promotes to prod via \`databricks bundle deploy --target prod\`.`,
  alts:[
    "How do you implement CI/CD for Databricks notebooks and jobs?",
    "What are Databricks Asset Bundles?",
    "How do you deploy Databricks jobs across multiple environments?"
  ]
},

"databricks-18": {
  answer:
`**MLflow** is the open-source ML lifecycle platform deeply integrated into Databricks. It covers experiment tracking, model registry, and model serving.

**Experiment tracking:**
\`\`\`python
import mlflow
with mlflow.start_run(run_name="priority_classifier_v1"):
    mlflow.log_param("model_type", "xgboost")
    mlflow.log_param("max_depth", 6)
    mlflow.log_metric("auc", 0.92)
    mlflow.log_metric("f1", 0.87)
    mlflow.log_artifact("confusion_matrix.png")
    mlflow.sklearn.log_model(model, "model")
\`\`\`

**Model Registry:**
\`\`\`python
mlflow.register_model(f"runs:/{run_id}/model", "ticket_priority_classifier")
# Transition stages: None → Staging → Production → Archived
client.transition_model_version_stage("ticket_priority_classifier", version=3, stage="Production")
\`\`\`

**Model Serving:**
Deploy a registered model as a REST endpoint:
1. In Databricks UI: Model Registry → Create Serving Endpoint
2. Select model version, configure compute (serverless or cluster-backed)
3. Endpoint URL for real-time inference

**A/B testing with model serving:**
Configure traffic splits between model versions (70/30 split) — Databricks Model Serving handles routing.

**Auto-logging (minimal code):**
\`\`\`python
mlflow.autolog()  # auto-captures params, metrics, artifacts for sklearn/XGBoost/PyTorch
\`\`\``,
  pros:[
    "Model Registry with stage gates (Staging → Production) enables a formal release process for ML models",
    "Autolog eliminates boilerplate for standard ML frameworks"
  ],
  cons:[
    "Databricks Model Serving (serverless) has cold start latency — not suitable for < 100ms SLA requirements",
    "MLflow experiment storage in Databricks is proprietary — migration to another platform requires exporting artifacts"
  ],
  useCase:
`A ticket priority classifier is trained weekly on new data. MLflow autolog captures all hyperparameters and metrics. The best-performing run is registered to the Model Registry. After evaluation review, a data scientist transitions it to Production — replacing the previous version. Model Serving endpoint is used by the ticket ingestion API for real-time priority assignment.`,
  alts:[
    "How is MLflow integrated with Databricks?",
    "What is the Databricks Model Registry?",
    "How do you deploy a machine learning model in Databricks?"
  ]
},

"databricks-19": {
  answer:
`**Data quality in Databricks** can be implemented at multiple layers, each with different trade-offs.

**DLT Expectations (declarative, in-pipeline):**
\`\`\`python
@dlt.expect_or_drop("valid_ticket_id", "ticket_id IS NOT NULL")
@dlt.expect_or_quarantine("valid_priority", "priority IN ('P1','P2','P3','P4')")
@dlt.expect("no_future_dates", "created_at <= current_timestamp()")
\`\`\`
Three actions: `warn` (metric tracked, data passes), `drop` (row removed), `quarantine` (bad rows → separate table). DLT tracks expectation pass/fail counts in the event log.

**Great Expectations (standalone, flexible):**
\`\`\`python
import great_expectations as gx
context = gx.get_context()
suite = context.create_expectation_suite("tickets_silver")
suite.add_expectation(gx.expectations.ExpectColumnValuesToNotBeNull(column="ticket_id"))
suite.add_expectation(gx.expectations.ExpectColumnValuesToBeBetween(column="priority_score", min_value=1, max_value=4))
results = context.run_validation_operator("action_list_operator", assets_to_validate=[batch])
\`\`\`

**Custom validations in PySpark:**
\`\`\`python
def validate_tickets(df):
    null_ids = df.filter(col("ticket_id").isNull()).count()
    assert null_ids == 0, f"Found {null_ids} null ticket_ids"
    assert df.filter(~col("status").isin(['open','resolved'])).count() == 0
    return df
\`\`\`

**Quarantine pattern:**
\`\`\`python
valid = df.filter(is_valid_udf(col("ticket_id"), col("status")))
invalid = df.subtract(valid)
invalid.write.mode("append").save("s3://quarantine/tickets/")
\`\`\``,
  pros:[
    "DLT expectations are the lowest-friction approach — co-located with the pipeline, metrics automatic",
    "Great Expectations provides a data docs website — stakeholder-visible data quality reporting"
  ],
  cons:[
    "Great Expectations has significant setup complexity for first-time users",
    "Custom PySpark validations in \`assert\` statements fail the whole job — DLT expectations can quarantine without failing"
  ],
  useCase:
`DLT Silver pipeline: \`expect_or_drop\` on null ticket_id (drops bad rows), \`expect_or_quarantine\` on status enum (quarantines unknown statuses to \`quarantine_tickets\` table). Data engineers monitor the quarantine table daily. Alert fires if quarantine rate exceeds 1%.`,
  alts:[
    "How do you implement data quality checks in Databricks?",
    "What are DLT expectations and what happens when they fail?",
    "What is the quarantine pattern in data engineering?"
  ]
},

"databricks-20": {
  answer:
`**Databricks Workflows** is the orchestration layer for multi-task pipelines — the Databricks-native alternative to Airflow for jobs that live entirely within Databricks.

**Key concepts:**

**Jobs:** the top-level unit. A job has a schedule, compute settings, and one or more tasks.

**Tasks:** individual units of work within a job:
- Notebook task
- Python script task
- SQL task (runs on SQL Warehouse)
- DLT pipeline task
- dbt task
- Spark JAR task
- Spark submit task
- Another Job (reference task)

**Dependencies:** tasks can depend on other tasks. The DAG is defined via the UI or YAML/Terraform:
\`\`\`yaml
tasks:
  - task_key: bronze_ingest
    notebook_task: { notebook_path: /pipelines/bronze }
  - task_key: silver_transform
    depends_on: [{ task_key: bronze_ingest }]
    notebook_task: { notebook_path: /pipelines/silver }
  - task_key: gold_aggregate
    depends_on: [{ task_key: silver_transform }]
    dbt_task: { project_directory: /dbt, commands: ["dbt run --select gold_*"] }
\`\`\`

**Retries, alerts, timeouts:** per-task configuration. Email or webhook on failure.

**Job clusters vs all-purpose:** each task can use its own job cluster (ephemeral, cheaper) or share a cluster.`,
  pros:[
    "Native Databricks orchestration — no separate Airflow cluster to manage",
    "Task-level retry configuration handles transient failures without re-running the whole job"
  ],
  cons:[
    "Workflows can't orchestrate non-Databricks systems (Postgres migrations, S3 sync, external APIs) — use Airflow for cross-system orchestration",
    "Complex conditional branching (if task A failed, do C instead of B) is limited vs Airflow"
  ],
  useCase:
`Nightly Euron pipeline: bronze_ingest runs first. On success, silver_transform and ML_feature_compute run in parallel. On both completing, gold_aggregate runs. On failure of any task, email alert to data-engineering@euron.io. Each task uses an auto-terminated job cluster.`,
  alts:[
    "What is Databricks Workflows and how does it differ from Airflow?",
    "How do you create a multi-task pipeline in Databricks?",
    "How do you configure retry and alerting for Databricks jobs?"
  ]
},

"databricks-21": {
  answer:
`**Row and column level security** in Databricks Unity Catalog is implemented via dynamic views (legacy) or native UC policies (current).

**Column masking (UC, current approach):**
\`\`\`sql
-- Define a masking function
CREATE FUNCTION euron_prod.security.mask_pii(val STRING)
RETURNS STRING
RETURN CASE WHEN IS_ACCOUNT_GROUP_MEMBER('pii_readers') THEN val
            ELSE REGEXP_REPLACE(val, '.', '*') END;

-- Attach to a column
ALTER TABLE euron_prod.tickets.customers
ALTER COLUMN email SET MASK euron_prod.security.mask_pii;
-- Now: pii_readers see real emails; others see ***@***.***
\`\`\`

**Row filters (UC, current approach):**
\`\`\`sql
-- Define a row filter function
CREATE FUNCTION euron_prod.security.tenant_row_filter(tenant_id STRING)
RETURNS BOOLEAN
RETURN IS_ACCOUNT_GROUP_MEMBER('super_admin') OR tenant_id = SESSION_USER();

-- Attach to a table
ALTER TABLE euron_prod.tickets.tickets
ADD ROW FILTER euron_prod.security.tenant_row_filter ON (tenant_id);
-- Now: super_admins see all rows; others only see their own tenant
\`\`\`

**Dynamic views (legacy, hive_metastore):**
\`\`\`sql
CREATE VIEW tickets_secure AS
SELECT ticket_id, title,
  CASE WHEN is_member('pii_readers') THEN customer_email ELSE '***' END AS customer_email
FROM tickets_raw
WHERE tenant_id = current_user();  -- row-level filter
\`\`\``,
  pros:[
    "UC row filters and column masks are transparent — consumers query the table directly, policy applies automatically",
    "Functions-based approach allows complex business logic in masking/filtering (e.g., time-based access)"
  ],
  cons:[
    "Dynamic views (legacy) require creating a separate view per access pattern — doesn't scale to many tables",
    "UC row filters add a predicate to every query — plan accordingly for performance impact on large tables"
  ],
  useCase:
`Euron has 3,000 tenants. Each tenant's agents can only see their own tenant's tickets. One row filter function on the tickets table automatically enforces this — regardless of whether access is via SQL, notebooks, or BI tools. No application-level filtering needed.`,
  alts:[
    "How do you implement row-level security in Databricks?",
    "What is the difference between Unity Catalog row filters and dynamic views?",
    "How do you mask PII columns in Databricks?"
  ]
},

"databricks-22": {
  answer:
`**Databricks Feature Store** is a centralized repository for ML features — ensuring features are computed consistently between training and serving.

**Key problem it solves:** training/serving skew. Features computed differently in training (batch Spark) vs serving (real-time Python) lead to prediction errors. Feature Store enforces one definition, used everywhere.

**Creating features:**
\`\`\`python
from databricks.feature_store import FeatureStoreClient
fs = FeatureStoreClient()

# Define a feature table
ticket_features = (
    tickets.groupBy("agent_id")
    .agg(
        avg("resolution_hours").alias("avg_resolution_hours_30d"),
        count("ticket_id").alias("ticket_count_30d"),
        avg("sla_breached").alias("sla_breach_rate_30d")
    )
)

fs.create_table(
    name="euron_prod.ml.agent_features",
    primary_keys=["agent_id"],
    timestamp_keys=["feature_date"],
    df=ticket_features,
    description="Agent performance features for ML models"
)
\`\`\`

**Training with Feature Store:**
\`\`\`python
training_set = fs.create_training_set(
    df=tickets_with_labels,
    feature_lookups=[FeatureLookup(table_name="euron_prod.ml.agent_features", lookup_key="agent_id")],
    label="priority"
)
df_train = training_set.load_df()
model = train_model(df_train)
fs.log_model(model, "priority_model", flavor=mlflow.sklearn, training_set=training_set)
\`\`\`

**Serving:** the logged model metadata tracks which features were used. At serving time, the model automatically retrieves the latest feature values from the Feature Store by \`agent_id\`.`,
  pros:[
    "Eliminates training/serving skew — one feature definition used in both",
    "Feature lineage tracked automatically — know which features each model uses"
  ],
  cons:[
    "Feature Store is a Databricks-specific product — portability requires exporting feature definitions",
    "Online store latency (for real-time feature lookup at serving) requires additional setup"
  ],
  useCase:
`Priority predictor model uses 12 agent-level features. Feature Store computes them nightly from Silver tickets. Training reads them via \`create_training_set\`. The deployed model endpoint automatically fetches the latest feature values for each agent_id at prediction time — same features, same computation.`,
  alts:[
    "What is the Databricks Feature Store and why is it useful?",
    "How does Feature Store prevent training/serving skew?",
    "How do you log a model that uses Feature Store in Databricks?"
  ]
},

"databricks-23": {
  answer:
`**SCENARIO: Multiple teams share Databricks workspace — no cost visibility, no governance. Design multi-team setup.**

**Cost visibility:**

1. **Tags on all compute:** cluster tag policy via cluster policy requires \`team\` and \`project\` tags on every cluster
2. **Databricks Cost Management:** filter billing by cluster tags — cost per team visible in the Azure/AWS cost explorer
3. **DBU budgets per workspace:** set workspace-level DBU budgets with alerts in Databricks Account Console

**Governance:**

1. **Unity Catalog:** separate catalogs per team (\`analytics_catalog\`, \`ml_catalog\`, \`de_catalog\`). Each team owns their catalog — can't accidentally overwrite others' tables.
2. **Cluster policies:** define allowed cluster configs per team group. Analytics team capped at 10 workers; ML team can spin up GPU clusters.
3. **Separate workspaces for prod/non-prod:** dev workspace has permissive policies; prod workspace has strict cluster policies, no all-purpose clusters.

**Implementation:**
\`\`\`
Account Level:
  ├─ Workspace: euron-dev (all teams, permissive)
  ├─ Workspace: euron-prod (restricted, job clusters only)
  └─ Unity Catalog Metastore (shared across workspaces)
       ├─ euron_prod.analytics.*   (analytics team owns)
       ├─ euron_prod.ml.*          (ML team owns)
       └─ euron_prod.raw.*         (data engineering owns)
\`\`\``,
  alts:[
    "How do you set up Databricks for multiple teams?",
    "How do you track Databricks costs per team?",
    "How do you enforce governance across Databricks users?"
  ]
},

"databricks-24": {
  answer:
`**SCENARIO: Delta table has 10,000 small files causing 10-minute reads. Diagnose and fix.**

**Diagnose:**
\`\`\`sql
DESCRIBE DETAIL tickets;
-- Check: numFiles, sizeInBytes, averageFileSize
-- If avgFileSize < 10MB and numFiles > 1000 → small file problem

SELECT count(*) as num_files, avg(size) as avg_size_bytes
FROM (DESCRIBE DETAIL tickets).files;
\`\`\`

**Root cause investigation:**
\`\`\`sql
DESCRIBE HISTORY tickets LIMIT 20;
-- Check: operationName — streaming appends every 30s = small files
-- Many APPEND operations with small writes → small file accumulation
\`\`\`

**Fix 1 — Manual OPTIMIZE (immediate):**
\`\`\`sql
OPTIMIZE tickets;             -- compacts small files to 1GB target
OPTIMIZE tickets ZORDER BY (tenant_id, created_at);  -- + layout optimization
VACUUM tickets RETAIN 168 HOURS;  -- clean up old small files (after 7 days)
\`\`\`

**Fix 2 — Prevent future accumulation:**
\`\`\`python
# Enable auto-compaction + optimized writes
ALTER TABLE tickets SET TBLPROPERTIES (
  'delta.autoCompact.enabled' = 'true',
  'delta.optimizeWrite.enabled' = 'true'
)
\`\`\`

**Fix 3 — For streaming source (write batching):**
\`\`\`python
df.writeStream.trigger(processingTime='10 minutes')  # instead of per-event trigger
\`\`\`
Batch writes every 10 minutes → 10x fewer files vs per-minute trigger.

**Monitor:** track \`numFiles\` and \`averageFileSize\` via \`DESCRIBE DETAIL\` as a daily scheduled job.`,
  alts:[
    "How do you fix the small file problem in Delta Lake?",
    "How do you diagnose a slow Delta table query?",
    "What causes small files to accumulate in Delta Lake?"
  ]
},

"databricks-25": {
  answer:
`**SCENARIO: DLT pipeline failing silently — bad records pass through. Design data quality framework.**

**The problem:** DLT pipeline without expectations doesn't fail on bad data — it just propagates corrupted records to Gold, silently breaking downstream metrics.

**Framework design:**

**1. Expectations at every layer (not just Silver):**
\`\`\`python
# Bronze — existence checks only (don't drop raw data)
@dlt.expect("raw_has_ticket_id", "ticket_id IS NOT NULL")  # warn only

# Silver — enforce quality (quarantine bad records)
@dlt.expect_or_quarantine("valid_status", "status IN ('open','pending','resolved','closed')")
@dlt.expect_or_drop("positive_hours", "resolution_hours >= 0 OR resolution_hours IS NULL")
@dlt.expect_or_fail("no_negative_prices", "amount >= 0")  # fail the pipeline if this breaks

# Gold — business rule assertions
@dlt.expect("sensible_breach_rate", "sla_breach_rate BETWEEN 0 AND 1")
\`\`\`

**2. Quarantine table for investigation:**
\`\`\`python
@dlt.table
def silver_tickets_quarantine():
    return dlt.read_stream("bronze_tickets").filter(
        col("status").isNull() | ~col("status").isin(['open','pending','resolved','closed'])
    ).withColumn("quarantine_reason", lit("invalid_status"))
\`\`\`

**3. Quality metrics monitoring:**
Read DLT event log for expectation metrics → dashboard + alert:
\`\`\`sql
SELECT name, timestamp, details:flow_progress:data_quality:expectations
FROM event_log(TABLE(tickets_silver))
WHERE event_type = 'flow_progress'
\`\`\`

**4. Alert:** if quarantine rate > 1% → notify data engineering Slack channel.`,
  alts:[
    "How do you prevent bad data from passing through a DLT pipeline?",
    "What is the quarantine pattern in Delta Live Tables?",
    "How do you monitor data quality in a DLT pipeline?"
  ]
},

"databricks-26": {
  answer:
`**SCENARIO: Databricks costs increased 3x in 2 months. Investigate and optimize.**

**Step 1 — Identify the cost driver:**
- Databricks Account Console → Cost Management → filter by workspace, cluster type, and time
- Look for: new all-purpose clusters that weren't auto-terminated, new ML training clusters, increased job frequency

**Step 2 — Quick wins:**

**Auto-termination (often the biggest fix):**
\`\`\`python
# Check all clusters without auto-termination:
databricks clusters list --output JSON | jq '.clusters[] | select(.autotermination_minutes == null)'
# Fix: set auto_termination_minutes=30 on all all-purpose clusters
\`\`\`

**Spot instances for job clusters:**
\`\`\`json
{"availability": "SPOT_WITH_FALLBACK", "first_on_demand": 1}
\`\`\`
60-90% cost reduction on worker nodes.

**DBU type optimization:**
- Jobs Light DBU (cheapest) for simple ETL jobs
- Jobs DBU for standard ML/ETL
- Photon DBU (higher DBU rate but faster) — only use if Photon speedup > DBU premium

**Step 3 — Governance to prevent recurrence:**

**Cluster policies:**
\`\`\`json
{
  "autotermination_minutes": {"type": "fixed", "value": 30},
  "num_workers": {"type": "range", "maxValue": 10},
  "node_type_id": {"type": "allowlist", "values": ["Standard_D4s_v3","Standard_D8s_v3"]}
}
\`\`\`

**Budget alerts:** set DBU budget per workspace with email alerts at 80% and 100%.

**Idle cluster detection:** use Databricks REST API to list clusters idle > 2 hours, auto-terminate.`,
  alts:[
    "How do you reduce Databricks costs?",
    "What are the most common causes of unexpected Databricks cost increases?",
    "How do you use cluster policies to control Databricks spending?"
  ]
},

"databricks-27": {
  answer:
`**SCENARIO: Migrate on-prem Hadoop/Hive data warehouse to Databricks.**

**Phase 1 — Discovery and assessment (weeks 1-2):**
\`\`\`bash
# Inventory Hive tables
beeline -e "SHOW DATABASES;" | while read db; do
  beeline -e "USE $db; SHOW TABLES;" >> inventory.txt
done
# Identify: table count, total size, last accessed date, file formats (ORC, Avro, Parquet)
# Identify: scheduled jobs (Oozie, Azkaban), dependencies, data volumes
\`\`\`

**Phase 2 — Schema migration:**
\`\`\`python
# Use Hive Metastore Federation or export DDL and convert to Delta
# Databricks: spark.sql("CREATE TABLE ... USING DELTA ...")
# Migrate Hive DDL → Delta DDL (types, partitioning, SerDe removal)
\`\`\`

**Phase 3 — Data migration (in priority order):**
1. Cold/archive tables → Azure Data Factory or AWS DMS (one-time copy)
2. Active tables → incremental using Hive CDC or full copy + validation
\`\`\`python
# Validate row counts + checksums after migration
assert spark.table("migrated.tickets").count() == hive_df.count()
\`\`\`

**Phase 4 — Job migration:**
- Hive SQL → Spark SQL/Delta SQL (usually 90% compatible)
- MapReduce → Spark DataFrame API
- Oozie workflows → Databricks Workflows
- Test each job: compare output between Hive and Databricks for 7 days

**Phase 5 — Cutover:**
- Parallel run period: new pipelines write to both Hive and Delta
- Validate consistency daily
- Flip consumers (BI tools, downstream jobs) to Databricks endpoints
- Decommission Hadoop cluster`,
  alts:[
    "How do you migrate from Hadoop to Databricks?",
    "How do you migrate Hive tables to Delta Lake?",
    "What is the migration strategy from on-prem data warehouse to Databricks?"
  ]
},

"databricks-28": {
  answer:
`**SCENARIO: Real-time dashboard needing data within 5 minutes. Design Kafka → Streaming → Delta → Dashboard.**

**Architecture:**

\`\`\`
Kafka (ticket events)
    ↓
Structured Streaming (Databricks)
    ↓  [watermark: 2 min, trigger: 1 min, micro-batch]
Delta Lake Silver (append-only, partitioned by minute)
    ↓
Delta Live Tables (optional: continuous refresh of Gold aggregations)
    ↓
SQL Warehouse (auto-refreshing query, 1-min cache)
    ↓
Databricks Dashboard (auto-refresh every 60s)
\`\`\`

**Streaming pipeline:**
\`\`\`python
from pyspark.sql.functions import from_json, window, col

# Read Kafka
kafka_df = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "broker:9092") \
    .option("subscribe", "ticket-events") \
    .load()

# Parse JSON payload
parsed = kafka_df.select(from_json(col("value").cast("string"), schema).alias("data")).select("data.*")

# Watermark + windowed aggregation
agg = parsed \
    .withWatermark("event_time", "2 minutes") \
    .groupBy(window("event_time", "1 minute"), "tenant_id") \
    .agg(count("ticket_id").alias("tickets_per_minute"))

# Write to Delta
agg.writeStream \
    .format("delta") \
    .outputMode("append") \
    .trigger(processingTime="30 seconds") \  # 30-second micro-batch
    .option("checkpointLocation", "s3://checkpoints/ticket-stream/") \
    .toTable("euron_prod.analytics.ticket_stream_silver")
\`\`\`

**End-to-end latency:** Kafka → Delta: ~60s (30s batch + 30s watermark). Dashboard sees data within 2-3 minutes of event.`,
  alts:[
    "How do you build a real-time data pipeline in Databricks?",
    "How do you stream from Kafka to Delta Lake in Databricks?",
    "What is the end-to-end latency for a Databricks Structured Streaming pipeline?"
  ]
},

"databricks-29": {
  answer:
`**SCENARIO: Data engineering team using notebooks in production with no version control or testing. Design proper SDLC.**

**The problem:** notebooks directly modified in production workspace, no test coverage, no code review, pipeline breaks introduced without review. Single point of failure — if the author leaves, nobody understands the code.

**Target state:**

**1. Repos integration (Git-backed notebooks):**
\`\`\`
GitHub Repo: euron-databricks/
  notebooks/
    bronze/ingest_tickets.py
    silver/transform_tickets.py
    gold/agent_sla.py
  src/
    utils/data_quality.py
    utils/schema_registry.py
  tests/
    test_transform_tickets.py
  databricks.yml
\`\`\`
All notebooks in Repos (Git-synced). Changes via PR only — no direct notebook edits in production.

**2. Unit tests for all transformation logic:**
Extract business logic from notebooks into Python functions in \`src/\`. Test with local SparkSession.

**3. CI/CD pipeline (GitHub Actions):**
\`\`\`yaml
on: [pull_request]
jobs:
  test:
    steps:
      - uses: actions/checkout@v3
      - run: pip install pyspark pytest chispa
      - run: pytest tests/
      - run: databricks bundle validate  # validate databricks.yml
  deploy-dev:
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - run: databricks bundle deploy --target dev
\`\`\`

**4. Production deploy via promotion:**
\`\`\`bash
# After dev validation:
databricks bundle deploy --target prod
\`\`\`

**5. Monitoring:** DLT expectations + job failure alerts + data quality dashboard.`,
  alts:[
    "How do you implement proper software development practices for Databricks?",
    "How do you add version control to Databricks notebooks?",
    "What does a good CI/CD pipeline for Databricks look like?"
  ]
},

"databricks-30": {
  answer:
`**SCENARIO: Unity Catalog migration — 500 hive_metastore tables, no ACLs. Plan the migration.**

**Phase 1 — Discovery and inventory (week 1):**
\`\`\`sql
-- List all hive_metastore tables
SELECT table_catalog, table_schema, table_name, table_type, data_source_format, storage_location
FROM hive_metastore.information_schema.tables;

-- Identify: which teams own which tables (from notebook/job history)
-- Identify: external tables (managed by hive_metastore but data in S3/ADLS)
-- Identify: consumers — which jobs/notebooks read each table
\`\`\`

**Phase 2 — Unity Catalog setup:**
\`\`\`sql
-- Create catalogs per domain
CREATE CATALOG IF NOT EXISTS euron_prod;
CREATE CATALOG IF NOT EXISTS euron_dev;
-- Create external location (so UC can access S3)
CREATE EXTERNAL LOCATION IF NOT EXISTS main_storage
URL 's3://euron-datalake/'
WITH (STORAGE CREDENTIAL main_credential);
\`\`\`

**Phase 3 — Table migration (using CLONE or SYNC):**
\`\`\`sql
-- Option 1: Deep clone (copies data + metadata)
CREATE TABLE euron_prod.tickets.silver_tickets
DEEP CLONE hive_metastore.tickets.silver_tickets;

-- Option 2: Upgrade in-place (if managed table)
UPGRADE TABLE hive_metastore.tickets.silver_tickets
SYNC;  -- moves to UC without copying data
\`\`\`

**Phase 4 — Set ownership and permissions:**
\`\`\`sql
ALTER TABLE euron_prod.tickets.silver_tickets OWNER TO `data-engineering`;
GRANT SELECT ON TABLE euron_prod.tickets.silver_tickets TO `analytics-team`;
\`\`\`

**Phase 5 — Validate and update consumers:**
- Test each job/notebook reads from UC path
- Update connection strings in BI tools
- Run parallel reads for 1 week before removing hive_metastore tables`,
  alts:[
    "How do you migrate from hive_metastore to Unity Catalog?",
    "How do you clone a Delta table to Unity Catalog?",
    "What is the UPGRADE TABLE command in Databricks Unity Catalog?"
  ]
}
