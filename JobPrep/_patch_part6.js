// PATCH PART 6: pyspark-1 through pyspark-35
"pyspark-1": {
  answer:
`**Spark architecture is a master-worker system:**

**Driver:** the JVM process that runs your application's main() (or Python script). It hosts the SparkContext, creates the execution plan, coordinates with the Cluster Manager, and schedules tasks on Executors. Runs on one machine.

**Executors:** JVM processes (one per worker node slot) that run the actual tasks. Each has memory (storage + execution) and CPU cores. Executors hold cached data and report task results back to the Driver.

**Cluster Manager:** allocates resources. Options: Spark Standalone, YARN (Hadoop), Mesos, or Kubernetes. In Databricks, the cluster manager is managed for you.

**Execution flow:**
1. Developer writes transformations (map, filter, join) on RDDs/DataFrames
2. Driver builds a **DAG** (Directed Acyclic Graph) of transformations — lazy
3. An **action** (count, write, collect) triggers the DAG Scheduler to convert the DAG to **Stages**
4. Stage boundaries are drawn at shuffle operations (groupBy, join, repartition)
5. **Task Scheduler** dispatches tasks (one per partition) to Executors
6. Executors run tasks, shuffle data across the network as needed, return results

**Key principle:** computation is lazy until an action is called. This allows Catalyst to optimize the full plan before execution.`,
  pros:[
    "Distributed execution scales to petabytes by adding Executor nodes",
    "DAG-based lineage enables fault tolerance — lost partitions are recomputed from lineage"
  ],
  cons:[
    "Network shuffle between stages is expensive — minimize with co-partitioning and broadcast joins",
    "Driver is a single point of coordination — large collects or driver-side operations are bottlenecks"
  ],
  useCase:
`A 500GB log file is processed on a 20-node cluster. The Driver parses the transformation chain, builds a DAG with 3 stages (read → filter → aggregate), and dispatches 4000 tasks (200 per node × 20 nodes). Each node processes its partition independently. Result: 90-second job vs 4-hour single-machine pandas.`,
  alts:[
    "Explain the Spark architecture with Driver and Executors.",
    "What is a DAG in Apache Spark?",
    "What is the role of the Cluster Manager in Spark?"
  ]
},

"pyspark-2": {
  answer:
`Three abstractions, each at a different level of API:

**RDD (Resilient Distributed Dataset):** Spark's original low-level API (Spark 1.x). A distributed collection of Java/Python objects. No schema awareness — Catalyst optimizer can't optimize it. Full control but verbose; Catalyst-bypassed means no automatic optimizations.

**DataFrame:** column-named, typed rows — like a distributed SQL table. Built on RDD under the hood but exposed through the Catalyst optimizer and Tungsten execution engine. The **primary API for PySpark today**. SQL-like API (\`filter\`, \`groupBy\`, \`join\`).

**Dataset (Scala/Java only):** typed DataFrames with compile-time type checking. Not available in Python (Python is dynamically typed — no compile-time benefit).

**Why DataFrames are preferred in PySpark:**
1. **Catalyst optimizer:** transforms your logical plan into an optimized physical plan (predicate pushdown, column pruning, join reordering)
2. **Tungsten engine:** uses off-heap memory and code generation for CPU-efficient execution
3. **Serialization:** DataFrames use binary row format internally — no Python serialization overhead (unlike Python RDDs which serialize Python objects)
4. **SQL interop:** \`df.createOrReplaceTempView('t'); spark.sql("SELECT...")\`
5. **Simpler API:** SQL-like operations are more readable than map/flatMap chains`,
  pros:[
    "Catalyst + Tungsten give DataFrames 5-100x performance advantage over Python RDDs",
    "DataFrame operations are serialization-free in the JVM path — Python overhead only at boundaries"
  ],
  cons:[
    "DataFrames have no compile-time type checking in Python — schema errors surface at runtime",
    "RDDs are still needed for non-tabular operations (graph processing, custom partitioners)"
  ],
  useCase:
`A ticket analytics job replaced a Python RDD pipeline with DataFrames. The RDD job serialized Python objects through pickle for every partition boundary — DataFrames use JVM binary format. Runtime dropped from 45 minutes to 8 minutes on the same cluster.`,
  alts:[
    "What is the difference between RDD, DataFrame, and Dataset in Spark?",
    "Why are Spark DataFrames faster than Python RDDs?",
    "When would you use an RDD instead of a DataFrame in Spark?"
  ]
},

"pyspark-3": {
  answer:
`**Transformations** are lazy — they define what to do but don't execute. They build the DAG:
\`\`\`python
# Transformations (nothing runs yet):
filtered = df.filter(df.status == 'open')
grouped = filtered.groupBy('agent_id').count()
\`\`\`

**Actions** trigger execution — Spark submits the job to the cluster:
\`\`\`python
# Actions (these trigger the DAG):
grouped.count()             # count rows
grouped.show()              # display first 20 rows
grouped.collect()           # bring all data to Driver (dangerous on large data)
grouped.write.parquet(...)  # write to storage
grouped.toPandas()          # convert to pandas DataFrame
\`\`\`

**Lazy evaluation benefits:**
1. **Optimization:** Catalyst sees the full plan before execution — can reorder filters, push predicates to the source, eliminate unused columns
2. **Efficiency:** intermediate DataFrames are never materialized unless cached
3. **Fault tolerance:** lost partitions are recomputed from the transformations (lineage)

**Lineage DAG:** Spark tracks which transformations produced each DataFrame. If an Executor fails, Spark recomputes only the lost partitions by replaying transformations from the last checkpoint or source.

**Common mistake:** calling \`count()\` in a loop for monitoring. Each \`count()\` triggers a full job. Cache the DataFrame or use \`show()\` once.`,
  pros:[
    "Full optimization across the entire transformation chain before any execution begins",
    "Lineage-based fault tolerance — no checkpointing needed for most jobs"
  ],
  cons:[
    "Hard to debug — exceptions appear at action time, not where the transformation was written",
    "Re-running the same transformation chain multiple times without caching recomputes everything"
  ],
  useCase:
`A pipeline reads 10TB of logs, filters to errors, joins with a dimension table, and aggregates. Without lazy evaluation, each step materializes the full dataset. With Catalyst, the filter is pushed to the reader (Parquet row group pruning) and the join is reordered — only relevant data is ever read.`,
  alts:[
    "What is the difference between Spark transformations and actions?",
    "What is lazy evaluation in Spark and why does it matter?",
    "What triggers execution in a Spark job?"
  ]
},

"pyspark-4": {
  answer:
`\`\`\`python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("EuronTicketAnalysis") \
    .master("local[*]")  \                    # local mode: use all cores; for cluster: "yarn" or "k8s://..."
    .config("spark.executor.memory", "4g") \
    .config("spark.executor.cores", "4") \
    .config("spark.sql.shuffle.partitions", "200") \  # default 200; reduce for small data
    .config("spark.driver.memory", "2g") \
    .getOrCreate()
\`\`\`

**Key config parameters:**

| Config | Meaning | Common setting |
|---|---|---|
| \`spark.executor.memory\` | Heap per Executor | 4-16g depending on data |
| \`spark.executor.cores\` | Threads per Executor | 2-5 (balance parallelism vs GC overhead) |
| \`spark.sql.shuffle.partitions\` | Partitions after shuffle | 2-4× number of cores; reduce for small data |
| \`spark.driver.memory\` | Driver heap | 2-4g; increase if collecting large data |
| \`spark.default.parallelism\` | Default RDD partition count | 2× total cores |

**Databricks:** \`SparkSession\` is pre-created as \`spark\` in notebooks — no explicit creation needed.

**\`getOrCreate()\`:** returns existing SparkSession if one exists (important for testing — prevents creating multiple sessions).`,
  pros:[
    "getOrCreate is idempotent — safe to call in library code without creating duplicate sessions",
    "spark.sql.shuffle.partitions is the single most impactful config for small-data performance"
  ],
  cons:[
    "Setting executor memory too high on a shared cluster wastes resources; too low causes OOM",
    "spark.sql.shuffle.partitions=200 on a 10-row DataFrame creates 200 tasks — massive overhead"
  ],
  useCase:
`A dev Databricks notebook sets \`spark.sql.shuffle.partitions\` to 8 (single-node cluster, 4 cores). The same job in production sets it to 400 (50-node cluster, 8 cores each). Config externalised in a config file; code unchanged.`,
  alts:[
    "How do you create a SparkSession in PySpark?",
    "What does spark.sql.shuffle.partitions control?",
    "What is the difference between spark.executor.memory and spark.driver.memory?"
  ]
},

"pyspark-5": {
  answer:
`**Reading:**
\`\`\`python
# CSV — explicit schema avoids inference cost + dtype bugs
from pyspark.sql.types import StructType, StructField, StringType, TimestampType, DoubleType
schema = StructType([
    StructField("ticket_id", StringType(), nullable=False),
    StructField("status", StringType(), nullable=True),
    StructField("resolution_hours", DoubleType(), nullable=True),
])
df = spark.read.csv("s3://bucket/tickets/*.csv", header=True, schema=schema)

# Parquet — schema embedded in file, partition pruning built-in
df = spark.read.parquet("s3://bucket/tickets/year=2024/")

# Delta — ACID, schema enforcement, time travel
df = spark.read.format("delta").load("s3://bucket/delta/tickets")

# JDBC — push filters down to DB when possible
df = spark.read.jdbc(url=jdbc_url, table="tickets",
    properties={"user": "...", "password": "...", "driver": "org.postgresql.Driver"},
    predicates=["created_at >= '2024-01-01'"])  # partition predicate for parallelism
\`\`\`

**Writing:**
\`\`\`python
df.write.mode("overwrite").parquet("s3://bucket/output/")
df.write.mode("append").partitionBy("year","month").parquet("s3://bucket/partitioned/")
df.write.format("delta").mode("merge").save("s3://bucket/delta/tickets")
\`\`\`

**Schema inference vs explicit:** explicit schema is always preferred in production — inference reads a sample of data (time + potential wrong types). JSON's \`inferSchema=True\` reads the full dataset twice.`,
  pros:[
    "Explicit schema eliminates type inference bugs and halves read time for JSON",
    "Parquet partition pruning skips entire directories that don't match filter predicates"
  ],
  cons:[
    "JDBC reads with no predicates load the full table into one Spark partition — always partition the read",
    "Delta write with mode='overwrite' deletes all existing data — verify before running"
  ],
  useCase:
`Reading 5 years of ticket history: \`spark.read.parquet("s3://tickets/year=*/").filter("year >= 2023")\`. Partition pruning skips 3 years of S3 files — only 2024 and 2023 directories are read. Scan is 3x faster.`,
  alts:[
    "How do you read a CSV file in PySpark with an explicit schema?",
    "What is the difference between reading Parquet and CSV in Spark?",
    "How do you read from a JDBC source in PySpark efficiently?"
  ]
},

"pyspark-6": {
  answer:
`**Spark SQL** lets you query DataFrames with standard SQL. The query goes through the same Catalyst optimizer as the DataFrame API — equivalent performance.

\`\`\`python
df.createOrReplaceTempView("tickets")
result = spark.sql("""
    SELECT agent_id, COUNT(*) as ticket_count, AVG(resolution_hours) as avg_resolution
    FROM tickets
    WHERE status = 'resolved'
    GROUP BY agent_id
    ORDER BY avg_resolution ASC
""")
\`\`\`

**Catalyst optimizer pipeline:**
1. **Analysis:** resolve column names, check types against catalog
2. **Logical optimization:** push down predicates, prune columns, constant folding, simplify expressions
3. **Physical planning:** choose join strategy (broadcast vs sort-merge), determine scan strategy
4. **Code generation (Tungsten):** generate bytecode for tight inner loops

**Key optimizations Catalyst performs automatically:**
- **Predicate pushdown:** \`WHERE status = 'open'\` is pushed to the Parquet/Delta reader — unmatched row groups skipped
- **Column pruning:** only selected columns are read from columnar formats
- **Join reordering:** smaller table moved to the build side of hash joins
- **Constant folding:** \`WHERE 1=1 AND status='open'\` simplified to \`WHERE status='open'\`

To see the plan: \`df.explain(mode="extended")\``,
  pros:[
    "Catalyst generates code that often outperforms hand-written RDD code",
    "SQL is accessible to analysts who don't know the DataFrame API"
  ],
  cons:[
    "Complex subqueries or window functions can produce unoptimized plans — check explain()",
    "Catalyst can't optimize Python UDFs — they're treated as black boxes"
  ],
  useCase:
`An analyst writes the SLA report in SQL (\`spark.sql(...)\`) — familiar syntax. A data engineer writes the preprocessing pipeline using the DataFrame API. Same Catalyst optimizer, same performance. The code paths meet at a shared temp view.`,
  alts:[
    "How does the Spark Catalyst optimizer work?",
    "What optimizations does Spark SQL apply automatically?",
    "How do you see the execution plan for a Spark query?"
  ]
},

"pyspark-7": {
  answer:
`**Broadcast variables:** send a read-only dataset to every Executor once, so tasks don't need to fetch it repeatedly from the driver or via shuffle.

\`\`\`python
# Broadcast a lookup dictionary to all workers
agent_lookup = {"A001": "Alice", "A002": "Bob"}
broadcast_agents = sc.broadcast(agent_lookup)

def enrich_ticket(row):
    return (row.ticket_id, broadcast_agents.value.get(row.agent_id, "Unknown"))

rdd.map(enrich_ticket)  # each task uses the broadcast copy locally
\`\`\`

In DataFrames, Spark automatically broadcasts small DataFrames in joins (controlled by \`spark.sql.autoBroadcastJoinThreshold\`, default 10MB).

**Accumulators:** distributed counters or collections that tasks can add to but only the Driver can read.

\`\`\`python
bad_records = sc.accumulator(0)

def process(row):
    if row.amount < 0:
        bad_records.add(1)
        return None
    return row

rdd.map(process).filter(lambda x: x is not None)
rdd_result.count()  # trigger execution
print(f"Bad records: {bad_records.value}")
\`\`\`

**Pitfalls:**
- Accumulators are only guaranteed accurate after an action completes
- Tasks that are re-executed (due to failure or speculation) increment accumulators multiple times — values can be overcounted
- \`broadcast.destroy()\` to free Executor memory when done`,
  pros:[
    "Broadcast variables eliminate shuffle for small lookup tables — huge savings on large joins",
    "Accumulators provide a safe way to count bad records without collecting to Driver"
  ],
  cons:[
    "Large broadcasts consume Executor memory — don't broadcast tables > 200MB",
    "Accumulator double-counting on task retry is a known issue — use for approximate metrics only"
  ],
  useCase:
`Enriching 10B events with a 5MB country-code lookup. Without broadcast: each task shuffles to fetch the lookup. With broadcast: the 5MB map is sent to every Executor once — tasks use their local copy. Shuffle bytes drop from terabytes to zero.`,
  alts:[
    "What is a broadcast variable in Spark and when should I use it?",
    "What is a Spark accumulator and what are its limitations?",
    "How do you broadcast a lookup table in PySpark?"
  ]
},

"pyspark-8": {
  answer:
`**Jobs → Stages → Tasks** is the execution hierarchy.

**Job:** triggered by one action (e.g., \`count()\`). A DAG of stages.

**Stage:** a set of transformations that can run without a shuffle. Stage boundaries are drawn at:
- \`groupBy\` / \`agg\` (requires grouping data across partitions)
- \`join\` that requires shuffle (sort-merge join)
- \`repartition\` / \`coalesce\`
- \`distinct\`

Within a stage, all transformations run in a **pipeline** (one pass over the data) — map and filter are fused.

**Task:** the smallest unit of work. One task processes one partition. If you have 200 partitions and 3 stages, you have 600 tasks total.

**Why shuffle boundaries matter:**
A shuffle writes each task's output to local disk (shuffle write), sends it over the network to the downstream stage's tasks (shuffle read), and the downstream tasks sort and read it. This is the most expensive operation in Spark — minimize shuffles.

**Practical implications:**
- Two consecutive \`groupBy\`s create two shuffles — cache between them if both are needed
- \`repartition(n)\` is a full shuffle; \`coalesce(n)\` is a narrow transformation (no full shuffle)
- The number of tasks per stage = number of partitions entering that stage`,
  pros:[
    "Pipeline within a stage means filter + map + select all run in one pass — no intermediate materialization",
    "Stage boundaries visible in Spark UI — use to identify which shuffle is expensive"
  ],
  cons:[
    "Every groupBy or join creates a shuffle — unoptimized pipelines can have 5-10 shuffles and be 10x slower",
    "Small number of partitions = under-utilized cluster; too many = task overhead dominates"
  ],
  useCase:
`Spark UI shows Stage 2 takes 80% of the job time. Clicking the stage shows 10TB shuffle read. Root cause: joining two large DataFrames without a broadcast or co-partitioning. Fix: add \`/*+ BROADCAST(small_table) */\` hint — Stage 2 shrinks from 10TB to 50MB shuffle.`,
  alts:[
    "What is the relationship between jobs, stages, and tasks in Spark?",
    "What causes a stage boundary in Spark?",
    "How does Spark pipeline transformations within a stage?"
  ]
},

"pyspark-9": {
  answer:
`Partitioning determines how data is distributed across Executors. Wrong partitioning is the most common Spark performance issue.

**Hash partitioning (default for shuffles):** assigns each row to a partition based on \`hash(key) % numPartitions\`. Used by default in groupBy and join shuffles.

**Range partitioning:** assigns rows to partitions by sorted ranges. Used in \`orderBy\` operations.

**\`repartition(n)\` vs \`coalesce(n)\`:**
\`\`\`python
df.repartition(400)        # full shuffle — redistributes evenly. Use to increase or rebalance.
df.coalesce(10)            # narrow — combines partitions locally, no shuffle. Use to reduce.
df.repartition(100, 'agent_id')  # hash-partition by agent_id
\`\`\`

**Optimal partition count:**
- Target ~128MB per partition (Spark default block size)
- Rule of thumb: 2-4× number of total CPU cores
- After a shuffle: \`spark.sql.shuffle.partitions\` (default 200) — tune this

**Repartition use cases:**
- Before a large join: repartition both tables on the join key → co-located data → no shuffle in join
- Writing to storage: repartition to control output file count (1 partition = 1 file)
- Before a heavy groupBy: repartition on groupBy key to eliminate shuffle

\`\`\`python
df.repartition(200).write.mode("overwrite").parquet(output_path)
# 200 output files — each ~128MB for a 25GB dataset
\`\`\``,
  pros:[
    "Pre-partitioning on the join key eliminates the join shuffle entirely — huge for repeated joins",
    "coalesce(1) before write creates a single output file without a full shuffle"
  ],
  cons:[
    "repartition(n, key) with high n creates many small partitions for low-cardinality keys (data skew)",
    "Excessive partitions (>10,000) create task scheduling overhead that dominates for small datasets"
  ],
  useCase:
`Agent performance aggregation runs 20 minutes. Profile: 99% of time in the groupBy shuffle. Fix: \`df.repartition(400, 'agent_id').groupBy('agent_id').agg(...)\` — data already grouped by agent_id, so the groupBy shuffle finds data already on the right partition. Job time: 3 minutes.`,
  alts:[
    "What is the difference between repartition and coalesce in Spark?",
    "How do you choose the right number of Spark partitions?",
    "What is hash vs range partitioning in Spark?"
  ]
},

"pyspark-10": {
  answer:
`Spark has three join strategies. Choosing the wrong one is a common performance issue.

**Broadcast join (map-side join):**
The smaller table is broadcast to every Executor. The join happens locally — zero shuffle. Fastest join type.
\`\`\`python
from pyspark.sql.functions import broadcast
result = large_df.join(broadcast(small_df), on='agent_id')
# Auto-broadcast if small_df < spark.sql.autoBroadcastJoinThreshold (default 10MB)
\`\`\`

**Sort-merge join (default for large-large joins):**
Both tables are shuffled on the join key, sorted, and merged partition by partition. Cost: two full shuffles. Most common for large-large joins.

**Shuffle hash join:**
Smaller side is shuffled and built into a hash table; larger side streams through. Faster than sort-merge for smaller datasets but requires holding one partition of the smaller table in memory.

**How Spark chooses:**
1. If one side < autoBroadcastJoinThreshold → broadcast join
2. If smaller side < estimated partition size → shuffle hash join
3. Otherwise → sort-merge join

**AQE (Adaptive Query Execution):** Spark 3.0+ dynamically re-evaluates join strategy at runtime based on actual row count statistics. Can upgrade to broadcast join if the runtime statistics show the table is small enough.`,
  pros:[
    "Broadcast join eliminates shuffle entirely — 10-100x faster for large-small joins",
    "AQE dynamic broadcast upgrades eliminate manual hints for most cases"
  ],
  cons:[
    "Broadcast join fails with OOM if the broadcast table is larger than executor memory",
    "Sort-merge join requires sortable keys — structs/arrays as join keys need custom comparators"
  ],
  useCase:
`Join of 10TB event table with a 50MB agent lookup. Without hint: Spark defaults to sort-merge (10TB shuffle). With \`broadcast(agent_df)\`: Spark broadcasts 50MB to each Executor — zero shuffle on the large table. Job time: 45 min → 8 min.`,
  alts:[
    "What are the different Spark join types and how does Spark choose between them?",
    "How do you force a broadcast join in PySpark?",
    "What is a sort-merge join in Spark?"
  ]
},

"pyspark-11": {
  answer:
`**AQE (Adaptive Query Execution)** — enabled by default in Spark 3.2+ — re-optimizes the query plan at runtime using actual statistics from completed stages, rather than relying on compile-time estimates.

**Three main features:**

**1. Dynamic partition coalescing:**
After a shuffle with 200 partitions, if the data is small (many empty partitions), AQE merges adjacent small partitions. Prevents the "200 tiny tasks" anti-pattern.
\`\`\`python
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set("spark.sql.adaptive.advisoryPartitionSizeInBytes", "128mb")
\`\`\`

**2. Dynamic skew join optimization:**
AQE detects skewed partitions (one task processes much more data than others) and splits them. Reduces the "one slow task" problem automatically.
\`\`\`python
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.skewedPartitionFactor", "5")  # 5x median
\`\`\`

**3. Dynamic join strategy switching:**
AQE can upgrade a planned sort-merge join to a broadcast join at runtime if the smaller table turns out to be smaller than the threshold after filtering.

**Enabling AQE:**
\`\`\`python
spark.conf.set("spark.sql.adaptive.enabled", "true")  # default True in Spark 3.2+
\`\`\``,
  pros:[
    "Dynamic partition coalescing eliminates manual shuffle partition tuning for most cases",
    "Skew join handling is automatic — previously required manual salting workarounds"
  ],
  cons:[
    "AQE adds planning overhead between stages — not beneficial for very simple queries",
    "AQE's statistics come from shuffle data — the first stage doesn't benefit"
  ],
  useCase:
`Before AQE: a join after a heavy filter produced 200 shuffle partitions but data was only 5MB — 200 tiny tasks, massive scheduling overhead. After enabling AQE: 200 partitions coalesced to 4 automatically. Stage time: 8 minutes → 45 seconds.`,
  alts:[
    "What is Adaptive Query Execution (AQE) in Spark?",
    "How does AQE handle data skew?",
    "What does dynamic partition coalescing do in Spark?"
  ]
},

"pyspark-12": {
  answer:
`Schema evolution is the ability to handle changes in data structure over time — new columns, renamed columns, changed types.

**\`mergeSchema\`:** reads multiple Parquet/Delta files with different schemas and merges them:
\`\`\`python
df = spark.read.option("mergeSchema", "true").parquet("s3://data/tickets/")
# A column added in month 3's files will appear (with null for older files)
\`\`\`

**Delta Lake schema enforcement vs evolution:**
- **Enforcement (default):** writing data with extra columns raises an error — protects data quality
- **Evolution:** opt-in; schema automatically updated to include new columns:
\`\`\`python
df.write.format("delta") \
    .option("mergeSchema", "true") \
    .mode("append") \
    .save(delta_path)
\`\`\`

**Handling nulls for new columns:**
When a column is added to an existing table, historical records get \`null\` for the new column. Use \`coalesce(new_col, lit("default"))\` when the null is problematic.

**Nested structs:**
\`\`\`python
from pyspark.sql.functions import col
df.select(col("metadata.source"), col("metadata.version"))
df.withColumn("metadata_source", col("metadata")["source"])
\`\`\`

**StructType for explicit schema:**
\`\`\`python
from pyspark.sql.types import StructType, StructField, StringType
schema = StructType([StructField("ticket_id", StringType()), ...])
df = spark.read.schema(schema).json("data/*.json")
\`\`\``,
  pros:[
    "Delta Lake schema evolution is atomic — partial schema changes can't corrupt the table",
    "Explicit StructType prevents silently reading wrong data from schema mismatches"
  ],
  cons:[
    "mergeSchema reads all file footers to determine the union schema — adds latency for many files",
    "Schema evolution allows columns to be added but not removed or renamed — those need RENAME COLUMN (Delta 2.0+)"
  ],
  useCase:
`A ticket ingestion pipeline receives JSON with a new \`sentiment_score\` field starting month 6. \`mergeSchema=True\` allows the Delta table to accept both old (without sentiment) and new (with sentiment) records. Old records show \`null\` for sentiment_score — acceptable and expected.`,
  alts:[
    "How do you handle schema evolution in PySpark?",
    "What is the difference between mergeSchema and schema enforcement in Delta Lake?",
    "How do you read nested JSON with PySpark?"
  ]
},

"pyspark-13": {
  answer:
`**Regular Python UDF:**
\`\`\`python
from pyspark.sql.functions import udf
from pyspark.sql.types import StringType

@udf(returnType=StringType())
def classify_priority(hours: float) -> str:
    if hours is None: return None
    return 'P1' if hours < 1 else 'P2' if hours < 4 else 'P3'

df.withColumn('sla_class', classify_priority(df.resolution_hours))
\`\`\`
**Cost:** each row is serialized Python → JVM → Python → JVM. Typically 10-100x slower than built-in functions. Catalyst can't optimize inside the UDF (black box).

**Pandas UDF (vectorized UDF):**
\`\`\`python
from pyspark.sql.functions import pandas_udf
import pandas as pd

@pandas_udf("string")
def classify_priority_vec(hours: pd.Series) -> pd.Series:
    return pd.cut(hours, bins=[-1, 1, 4, float('inf')], labels=['P1','P2','P3'])

df.withColumn('sla_class', classify_priority_vec(df.resolution_hours))
\`\`\`
Data passes in Arrow batches — much faster than row-by-row UDFs. Still slower than built-ins but far better than regular UDFs.

**Built-in functions (always preferred):**
\`\`\`python
from pyspark.sql.functions import when, col
df.withColumn('sla_class', when(col('hours')<1,'P1').when(col('hours')<4,'P2').otherwise('P3'))
\`\`\`
Runs in JVM with Catalyst optimization — 100-1000x faster than Python UDFs.`,
  pros:[
    "Pandas UDF (vectorized) is 10-30x faster than scalar Python UDF via Arrow batch transfer",
    "Built-in functions are always the fastest — always check if a built-in exists before writing a UDF"
  ],
  cons:[
    "Python UDFs disable Catalyst optimization entirely — you're on your own for performance",
    "Pandas UDFs require Arrow to be installed and memory for the batch size"
  ],
  useCase:
`A pipeline had 12 Python UDFs for various text cleaning operations. Replaced 10 with \`regexp_replace\`, \`lower\`, \`trim\`, \`translate\` built-in functions. The 2 remaining complex ones became Pandas UDFs. Job time: 3 hours → 25 minutes.`,
  alts:[
    "What is the difference between a Python UDF and a Pandas UDF in PySpark?",
    "Why are Spark UDFs slow?",
    "How do you write a vectorized Pandas UDF in PySpark?"
  ]
},

"pyspark-14": {
  answer:
`Caching stores a DataFrame in Executor memory (or disk) so it can be reused without recomputing from source.

\`\`\`python
df.cache()               # = persist(StorageLevel.MEMORY_AND_DISK)
df.persist(StorageLevel.MEMORY_ONLY)
df.persist(StorageLevel.MEMORY_AND_DISK)      # spill to disk if memory full
df.persist(StorageLevel.DISK_ONLY)
df.persist(StorageLevel.MEMORY_AND_DISK_SER)  # serialized (less memory, more CPU)
df.unpersist()           # release cached data
\`\`\`

**When caching helps:**
- The DataFrame is used in multiple actions or joined multiple times
- Recomputing it is expensive (complex aggregations, large joins)
- Iterative algorithms (ML training) that scan the same data many times

**When caching hurts:**
- The DataFrame is only used once — caching wastes memory and adds write overhead
- The data doesn't fit in memory — thrashing to disk can be slower than recomputing
- The data changes between uses (e.g., streaming or frequently updated sources)

**Important:** \`cache()\` is lazy in Spark. It doesn't actually cache until the first action is triggered. To force caching:
\`\`\`python
df.cache()
df.count()   # triggers caching of all partitions
\`\`\`

Verify in Spark UI → Storage tab that the DataFrame is cached.`,
  pros:[
    "Caching eliminates redundant source reads and recomputation in iterative workflows",
    "StorageLevel.MEMORY_AND_DISK ensures the cache survives memory pressure by spilling to disk"
  ],
  cons:[
    "Excessive caching evicts other cached DataFrames (LRU eviction) — only cache what's reused",
    "cache() on a streaming DataFrame doesn't work — streaming uses checkpointing instead"
  ],
  useCase:
`A ML pipeline preprocesses tickets (clean, encode, vectorize) once and trains 5 models on the result. Cache the preprocessed DataFrame before the first training call — each model trainer reads from memory instead of re-running preprocessing. Wall time: 2 hours → 45 minutes.`,
  alts:[
    "When should I cache a DataFrame in Spark?",
    "What is the difference between cache() and persist() in Spark?",
    "How do you verify a DataFrame is cached in Spark UI?"
  ]
},

"pyspark-15": {
  answer:
`**Bucketing** pre-partitions data by a column's hash into a fixed number of buckets and saves it to disk (Hive tables or Delta). Unlike partitioning (which creates directory hierarchies), bucketing creates fixed-count files and sorts within each bucket.

\`\`\`python
df.write \
  .bucketBy(256, 'agent_id') \
  .sortBy('created_at') \
  .format('parquet') \
  .saveAsTable('tickets_bucketed')
\`\`\`

**How it eliminates join shuffle:**
If two tables are bucketed on the same key with the same number of buckets, Spark knows that rows with the same key are already co-located. The join can skip the shuffle stage entirely.

\`\`\`python
tickets_bucketed.join(agents_bucketed, on='agent_id')
# Spark UI: 0 shuffle bytes on the join stage
\`\`\`

**Bucketing vs Partitioning:**
| | Partitioning | Bucketing |
|---|---|---|
| Storage | Directory hierarchy (year=2024/month=01/) | Fixed number of files |
| Pruning | Filters on partition columns skip directories | Filters on bucket column route to specific files |
| Join optimization | Doesn't help joins | Eliminates join shuffle if both tables bucketed same way |
| Best for | Time-range queries, high-cardinality key | Repeated joins on the same key |

Use bucketing when: you repeatedly join two large tables on the same key. The upfront cost (writing bucketed tables) pays off after 2-3 joins.`,
  pros:[
    "Eliminates join shuffle entirely for co-bucketed tables — most impactful join optimization",
    "sortBy within buckets enables merge-sort join without sorting at join time"
  ],
  cons:[
    "Number of buckets is fixed at write time — hard to change without rewriting the table",
    "Bucketing only works with Hive-compatible table formats (not plain file paths)"
  ],
  useCase:
`A nightly report joins 5TB of events with a 500GB agent dimension table on agent_id. After bucketing both tables (256 buckets, agent_id), the join stage takes 4 minutes (merge only) instead of 45 minutes (shuffle + merge). Bucketing is a one-time write cost.`,
  alts:[
    "What is Spark bucketing and how does it differ from partitioning?",
    "How does bucketing eliminate join shuffle in Spark?",
    "When should I use bucketing instead of partitioning?"
  ]
},

"pyspark-16": {
  answer:
`PySpark has first-class support for complex types: arrays, maps, and structs.

**Array functions:**
\`\`\`python
from pyspark.sql.functions import array, explode, posexplode, array_contains, size, flatten, array_distinct

df.withColumn("tags_exploded", explode("tags"))  # one row per array element
df.withColumn("pos", posexplode("tags"))          # index + element
df.filter(array_contains("tags", "urgent"))
df.withColumn("tag_count", size("tags"))
\`\`\`

**Map functions:**
\`\`\`python
from pyspark.sql.functions import map_keys, map_values, element_at

df.withColumn("metadata_keys", map_keys("metadata"))
df.withColumn("source", element_at("metadata", "source"))
df.withColumn("src", col("metadata")["source"])  # subscript syntax
\`\`\`

**Struct functions:**
\`\`\`python
from pyspark.sql.functions import struct

df.select("address.city", "address.country")  # dot notation
df.withColumn("location", struct(col("city"), col("country")))  # create struct
\`\`\`

**JSON strings → struct:**
\`\`\`python
from pyspark.sql.functions import from_json
schema = StructType([StructField("source", StringType()), StructField("version", IntegerType())])
df.withColumn("parsed", from_json(col("metadata_json"), schema))
\`\`\`

**explode creates one row per element** — row count increases. \`posexplode\` adds a position index. Use \`explode_outer\` to keep rows with empty/null arrays (returns null instead of dropping the row).`,
  pros:[
    "from_json parses JSON strings into typed structs inline — no UDF needed",
    "explode + groupBy is a clean pattern for flattening nested collections before aggregation"
  ],
  cons:[
    "explode can dramatically increase row count — always check output size after explode",
    "Deeply nested structs are hard to flatten cleanly — use inline() for array-of-structs to struct columns"
  ],
  useCase:
`API logs contain a JSON array of request tags. \`explode('tags')\` creates one row per tag. \`groupBy('tag').count()\` gives tag frequency. The whole pipeline: read JSON log → parse array field → explode → aggregate. 5 lines, no UDF.`,
  alts:[
    "How do you explode an array column in PySpark?",
    "How do you parse a JSON string column in PySpark?",
    "What is the difference between explode and posexplode in PySpark?"
  ]
},

"pyspark-17": {
  answer:
`**Data skew** occurs when some partitions have significantly more data than others. One task processes gigabytes while others process megabytes — the job waits for the slow task.

**Detection — Spark UI:**
- Stages tab → click a slow stage → Tasks tab → sort by "Duration" or "Input Size"
- If a few tasks take 10× longer than the median and have 10× more input bytes → skew

**Common cause:** a join key with many nulls or one dominant value (e.g., 80% of events have \`agent_id = 'system'\`).

**Fix 1 — Broadcast join:** if the skewed side is the larger table but the other side is small, broadcast the small side:
\`\`\`python
large_df.join(broadcast(small_lookup), on='agent_id')
\`\`\`

**Fix 2 — Salting (for aggregations and large-large joins on skewed key):**
\`\`\`python
from pyspark.sql.functions import concat, lit, (col % 10).alias('salt')
# Add random salt 0-9 to the skewed key on the larger side
salted_large = large_df.withColumn('agent_salt', concat(col('agent_id'), lit('_'), (rand()*10).cast('int').cast('string')))
# Explode the smaller side to match all 10 salted versions
from pyspark.sql.functions import explode, array
salted_small = small_df.withColumn('salt', explode(array([lit(i) for i in range(10)])))
                       .withColumn('agent_salt', concat(col('agent_id'), lit('_'), col('salt').cast('string')))
result = salted_large.join(salted_small, on='agent_salt').drop('agent_salt', 'salt')
\`\`\`

**Fix 3 — AQE skew join (automatic, Spark 3.0+):**
\`\`\`python
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
\`\`\`
AQE detects and splits skewed partitions at runtime.`,
  pros:[
    "AQE automatic skew handling eliminates the need for manual salting in most cases",
    "Salting is deterministic and works even without AQE — reliable fallback"
  ],
  cons:[
    "Salting the smaller side (explode) increases its size 10x — more memory needed",
    "AQE skew detection threshold may need tuning for extreme skew"
  ],
  useCase:
`A join on customer_id: 50% of rows have \`customer_id = 'trial_users'\` (a catch-all for unregistered users). AQE detects 4 partitions are 50x the median and splits them into sub-tasks. The 4-hour job completes in 40 minutes.`,
  alts:[
    "What is data skew in Spark and how do you fix it?",
    "How do you detect skewed partitions in Spark UI?",
    "What is salting in Spark and when should you use it?"
  ]
},

"pyspark-18": {
  answer:
`**Unified memory model (Spark 1.6+):** Executor memory is shared between storage (caching) and execution (shuffle, joins, aggregations). The split is dynamic — either can use what the other doesn't need.

\`\`\`
Total Executor Memory (spark.executor.memory, e.g., 8g)
  ├─ Reserved memory (300MB, fixed)
  └─ Usable memory (remaining)
       ├─ User memory (~40%) — Python objects, UDF data, misc
       └─ Spark memory (~60%)
            ├─ Storage memory — cached DataFrames, broadcast vars
            └─ Execution memory — shuffle buffers, sort buffers, join hash tables
\`\`\`

**Tungsten:** off-heap binary memory management. Stores data in compact binary format, bypassing Java object overhead and GC. Code generation produces bytecode for tight inner loops.

**Off-heap memory:**
\`\`\`python
spark.conf.set("spark.memory.offHeap.enabled", "true")
spark.conf.set("spark.memory.offHeap.size", "4g")
\`\`\`
Stores shuffle data off-heap — less GC pressure.

**OOM causes and fixes:**
- **Execution memory OOM:** sort or hash join buffering too much. Fix: increase \`spark.executor.memory\`, repartition to smaller partitions, use external sort (enabled by default).
- **Storage OOM:** too many cached DataFrames. Fix: \`unpersist()\` unneeded caches.
- **Python UDF memory:** Python worker has its own memory outside Spark management. Fix: reduce batch size or switch to Pandas UDFs.
- **Driver OOM:** \`collect()\` brings all data to Driver. Never collect() on large DataFrames.`,
  pros:[
    "Unified memory allows storage and execution to share dynamically — less tuning required",
    "Tungsten off-heap storage reduces GC pauses for long-running jobs"
  ],
  cons:[
    "OOM messages don't always identify the root cause clearly — need Spark UI to correlate",
    "Off-heap config requires understanding native memory limits per container"
  ],
  useCase:
`A sort-merge join OOM on 8GB executors. Investigation: each partition has 2GB of data, sort buffer needs the whole partition in memory. Fix: repartition(400) before the join → 512MB partitions → each sort buffer fits comfortably. OOM gone.`,
  alts:[
    "How does Spark memory management work?",
    "What is Tungsten in Apache Spark?",
    "Why does my Spark job run out of memory and how do I fix it?"
  ]
},

"pyspark-19": {
  answer:
`Performance tuning is systematic — measure first, tune the bottleneck, verify improvement.

**Key levers in priority order:**

**1. Data format and partitioning:**
\`\`\`python
spark.read.parquet("...")    # vs CSV: 3-5x faster reads
df.repartition("year","month")  # avoid many small files
\`\`\`

**2. Shuffle partition count:**
\`\`\`python
spark.conf.set("spark.sql.shuffle.partitions", str(totalCores * 2))
# Default 200 is too high for small data, too low for large data
\`\`\`

**3. Join optimization:**
\`\`\`python
large.join(broadcast(small), on='key')  # eliminate shuffle
\`\`\`

**4. Caching reused DataFrames:**
\`\`\`python
filtered.cache(); filtered.count()  # trigger cache
\`\`\`

**5. Executor sizing:**
- 4 cores per executor (sweet spot for GC vs parallelism)
- Leave 1 core and 1GB per node for Hadoop daemons

**6. Serialization:**
\`\`\`python
spark.conf.set("spark.serializer", "org.apache.spark.serializer.KryoSerializer")
# Faster than Java serializer for RDDs
\`\`\`

**7. Predicate pushdown:** Catalyst does this automatically — but verify with \`explain()\` that filters appear at the scan level, not after a join.

**8. Replace Python UDFs** with built-in functions or Pandas UDFs.`,
  pros:[
    "Reducing shuffle partitions from 200 to 2× cores is often the single biggest win for medium-sized jobs",
    "Parquet vs CSV alone gives 3-5x read speedup with column pruning"
  ],
  cons:[
    "Tuning too many things at once makes it impossible to know what helped",
    "Over-tuning for one dataset's characteristics can hurt another dataset's performance"
  ],
  useCase:
`3-step process for a slow 90-minute job: (1) check explain() → predicate not pushed to scan. Fix: move filter before join. (2) Spark UI → 200 tiny tasks after shuffle. Fix: set shuffle.partitions=40. (3) Two scans of same large DF. Fix: cache it. Result: 12 minutes.`,
  alts:[
    "How do you tune a slow Spark job?",
    "What is the most important Spark configuration for performance?",
    "What is the recommended executor sizing for Spark jobs?"
  ]
},

"pyspark-20": {
  answer:
`**Shuffle** is the redistribution of data across partitions for operations that need specific rows together. It's the most expensive operation in Spark.

**Operations that cause shuffle:** groupBy, join (non-broadcast), distinct, repartition, orderBy, union + distinct.

**Minimize shuffle strategies:**

**1. Broadcast small tables:**
\`\`\`python
large.join(broadcast(small), on='key')  # 0 shuffle bytes
\`\`\`

**2. Co-partitioning (pre-bucket or pre-repartition):**
\`\`\`python
# Pre-repartition both on the join key
a_part = a.repartition(200, 'agent_id')
b_part = b.repartition(200, 'agent_id')
a_part.join(b_part, 'agent_id')  # Spark sees co-partitioned data — can skip shuffle
\`\`\`
Note: Spark only skips the shuffle if both tables are bucketed (written to Hive tables). Pre-repartition() in memory doesn't always skip it — check the plan.

**3. Avoid redundant groupBys:**
\`\`\`python
# ✗ Two shuffles:
df.groupBy('agent').count().groupBy('status').sum()
# ✓ One shuffle:
df.groupBy('agent','status').count()
\`\`\`

**4. Filter aggressively before shuffle:**
Push all filters before groupBy/join to reduce the data being shuffled.

**5. Pre-bucketing for repeated joins:**
Write both tables bucketed on the join key — eliminates shuffle on every subsequent join.`,
  pros:[
    "Broadcast join is the most reliable way to eliminate shuffle for large-small joins",
    "Pre-filtering before shuffle can reduce shuffle size 10-100x"
  ],
  cons:[
    "Repartition() in memory doesn't guarantee Spark skips the join shuffle — only bucketed tables do",
    "Avoiding all shuffles is impossible for groupBy/distinct — focus on reducing shuffle data size"
  ],
  useCase:
`5 daily jobs all join the same large event table with the same 5 lookup tables. Writing all 6 tables bucketed on the join key (one-time cost) eliminates shuffle on every subsequent join. Daily jobs go from 60 minutes to 8 minutes.`,
  alts:[
    "How do you minimize Spark shuffle?",
    "What Spark operations cause a shuffle?",
    "How does co-partitioning reduce Spark join cost?"
  ]
},

"pyspark-21": {
  answer:
`The **Spark UI** (port 4040) is your primary debugging tool for slow jobs.

**Navigation:**

**Jobs tab:** list of all jobs (triggered by actions). Click a job to see its stages.

**Stages tab:** list all stages with duration, input/output/shuffle bytes, and task counts. Find the slow stage here.

**Stage detail → Tasks:** table of all tasks in the stage. Sort by Duration to find slow tasks. Key columns:
- **Duration:** wall time for the task
- **GC Time:** time spent in Java GC — if > 20% of duration, GC is a bottleneck
- **Input Size:** data read from source/cache — large tasks → skewed partitions
- **Shuffle Read/Write:** shuffle bytes per task

**DAG visualization:** shows the transformation graph, which stages ran in parallel, and which waited.

**SQL tab:** for DataFrame/SQL queries, shows the physical plan with timing per node. Key nodes to look for:
- \`Exchange\` (HashPartitioning): shuffle — look at bytes
- \`BroadcastExchange\`: broadcast join — look at broadcast size
- \`Sort\`, \`SortMergeJoin\`: expensive — check if can be replaced by broadcast

**Common findings:**
- One task in a stage takes 100x longer than others → data skew
- 99% of stage time is shuffle read → large shuffle → need broadcast or pre-partition
- High GC time → too many objects in heap → switch to Pandas UDF or use Kryo serializer
- Stage runs in 1 task → insufficient parallelism → repartition before`,
  pros:[
    "Task-level timing in Spark UI shows skew clearly — a visual distribution of task durations makes it obvious",
    "SQL tab's plan view shows which physical operators are expensive without reading explain() output"
  ],
  cons:[
    "Spark UI is ephemeral — gone when the job ends unless you configure a History Server",
    "Interpreting the DAG for complex jobs with many stages requires experience"
  ],
  useCase:
`Stage 3 takes 3 hours; all other stages take 5 minutes. Click Stage 3 → Tasks → sort by Duration → one task took 2.9 hours. Input Size: 150GB; all others ~500MB. Root cause: skew on null join key — 30% of data has null agent_id. Fix: filter nulls before join or handle them separately.`,
  alts:[
    "How do you debug a slow Spark job using the Spark UI?",
    "What should I look for in the Spark UI to find a performance problem?",
    "How do you detect data skew from the Spark UI?"
  ]
},

"pyspark-22": {
  answer:
`**Predicate pushdown** moves filter conditions from the Spark execution layer down to the data source level — so the source only reads and returns matching rows.

**Column pruning** reads only the columns referenced in the query from columnar storage.

Both happen automatically for supported sources (Parquet, ORC, Delta, JDBC).

**Verify with explain():**
\`\`\`python
df.filter(col('status') == 'open').select('ticket_id','created_at').explain(True)
# Look for: PushedFilters: [IsNotNull(status), EqualTo(status,open)]
# And: ReadSchema: struct<ticket_id:string,created_at:timestamp>  (only 2 cols, not all)
\`\`\`

**When pushdown doesn't happen:**
- Filter on a derived column: \`df.withColumn('x', udf(col('a'))).filter(col('x') == 1)\` — UDF result can't be pushed
- Complex expressions the source can't evaluate: \`col('a') + col('b') > 10\` — some sources don't support this
- Non-pushdown sources: in-memory DataFrames, RDDs

**Force pushdown for JDBC:** use the \`predicates\` option to split and filter at the DB level:
\`\`\`python
spark.read.jdbc(url=url, table="tickets",
    predicates=["status = 'open' AND created_at >= '2024-01-01'"],
    properties=props)
\`\`\``,
  pros:[
    "Parquet + predicate pushdown can skip entire row groups — 10-100x less data read",
    "Column pruning is critical for wide tables — reading 5 of 200 columns is 40x less I/O"
  ],
  cons:[
    "UDFs in filters prevent pushdown — pure built-in expressions always push down",
    "Verifying pushdown requires reading explain() output — easy to assume it's happening when it's not"
  ],
  useCase:
`A query reads 100TB Parquet table but only needs 2 of 50 columns and recent data. Column pruning: reads 4% of column data. Predicate pushdown: Parquet row group statistics skip 90% of data. Effective scan: ~400GB instead of 100TB. Query time: 3 minutes instead of hours.`,
  alts:[
    "What is predicate pushdown in Spark?",
    "What is column pruning in Spark?",
    "How do you verify that Spark is pushing down filters to the data source?"
  ]
},

"pyspark-23": {
  answer:
`File format choice significantly impacts Spark job performance and cost.

**Format comparison:**

| | Parquet | ORC | Delta | CSV/JSON |
|---|---|---|---|---|
| Storage model | Columnar | Columnar | Parquet + txn log | Row |
| Compression | Snappy/Zstd | Zlib/Zstd | Snappy/Zstd | None/Gzip |
| Schema | Embedded | Embedded | Schema enforcement | None (inferred) |
| ACID | No | No | Yes | No |
| Predicate pushdown | Yes | Yes | Yes | No |
| Spark native | Yes | Yes | Best with Databricks | Yes |

**Parquet:** the default for Spark workloads. Columnar — excellent for analytics. Snappy compression is fast to decompress; Zstd gives better compression ratio.

**Delta Lake:** Parquet + transaction log. Adds ACID, schema enforcement, time travel, Z-ordering. Best choice for data lake tables that are updated.

**ORC:** Apache Hive's native format. Slightly better compression in some cases. Use when you're in a Hive-heavy ecosystem.

**Compression codecs:**
\`\`\`python
df.write.option("compression","snappy").parquet(path)   # fast decompress, moderate size
df.write.option("compression","zstd").parquet(path)     # best ratio, fast enough
df.write.option("compression","gzip").parquet(path)     # small size, slow decompress
\`\`\`
Snappy for intermediate data (speed matters). Zstd for final storage (size matters). Never Gzip for frequently-read data.`,
  pros:[
    "Parquet + Zstd reduces storage cost 5-10x vs CSV while improving read speed",
    "Delta adds ACID without changing the read pattern — \`spark.read.format('delta').load(path)\`"
  ],
  cons:[
    "Parquet is write-once — partial updates require rewriting files (Delta solves this)",
    "Too many small Parquet files cause long listing times and slow reads — compact with OPTIMIZE"
  ],
  useCase:
`Migrating daily CSV exports (100GB/day) to Delta Lake with Zstd compression: storage drops to 12GB/day, queries run 15x faster (columnar + pushdown), and the pipeline can now do incremental updates via MERGE instead of full overwrites.`,
  alts:[
    "What is the best file format for Spark and why?",
    "What is the difference between Parquet, ORC, and Delta in Spark?",
    "When should I use Zstd vs Snappy compression in Parquet?"
  ]
},

"pyspark-24": {
  answer:
`**Speculative execution** is Spark's mechanism for handling "straggler" tasks — tasks that run much slower than their peers, typically due to hardware issues (slow disk, network, hot CPU).

Spark launches a duplicate copy of the slow task on another Executor. Whichever finishes first wins; the other is killed.

**Configuration:**
\`\`\`python
spark.conf.set("spark.speculation", "true")              # disabled by default
spark.conf.set("spark.speculation.interval", "100ms")    # check interval
spark.conf.set("spark.speculation.multiplier", "1.5")    # 1.5x median = straggler
spark.conf.set("spark.speculation.quantile", "0.75")     # wait until 75% tasks done
\`\`\`

**When to enable:**
- Heterogeneous clusters (mix of fast and slow nodes — cloud spot instances)
- Long-running stages where one slow node blocks the stage for minutes

**When to disable (or be careful):**
- Jobs that write to external systems (DB, Kafka): speculative tasks can write twice — causes duplicates. Must ensure idempotent writes.
- Jobs with accumulators: speculative tasks increment accumulators twice — overcounting.
- Very short tasks: speculation overhead outweighs benefit.

**Alternative for stragglers:** Exclude unhealthy nodes via \`spark.excludeOnFailure\` (formerly blacklist). AQE's dynamic partition coalescing also reduces the number of tasks susceptible to stragglers.`,
  pros:[
    "Provides automatic insurance against slow nodes without manual intervention",
    "Most effective in cloud environments with heterogeneous VMs or spot instance evictions"
  ],
  cons:[
    "Non-idempotent writers will produce duplicates from speculative tasks — risky for JDBC writes",
    "Speculation adds Executor load — on memory-constrained clusters, may cause OOM on the duplicate task"
  ],
  useCase:
`A Databricks job on spot instances occasionally has one node running at 10% of normal speed (throttled storage). Without speculation: the stage waits 40 minutes for that node. With speculation enabled: a duplicate task starts on a healthy node after 2 minutes of lagging, finishes in 5 minutes. Stage completes in 7 minutes total.`,
  alts:[
    "What is speculative execution in Spark and when should I enable it?",
    "How does Spark handle straggler tasks?",
    "Why can speculative execution cause duplicate writes in Spark?"
  ]
},

"pyspark-25": {
  answer:
`**Spark Structured Streaming** processes real-time data using the same DataFrame API as batch, treating a stream as an unbounded table.

**Triggers** control when Spark processes micro-batches:
\`\`\`python
df.writeStream.trigger(processingTime='1 minute')   # every 1 minute
df.writeStream.trigger(once=True)                   # run once, then stop (backfill)
df.writeStream.trigger(availableNow=True)            # process all available, stop
df.writeStream.trigger(continuous='1 second')        # experimental: low-latency continuous
\`\`\`

**Output modes:**
- **Append:** only new rows appended to the result table. Works for simple filters/projections without aggregation.
- **Update:** only changed rows in the result table are output. Good for stateful aggregations.
- **Complete:** entire result table output every trigger. Only for small aggregations (total counts, etc.).

**Watermarks:** define how late data can arrive before it's dropped:
\`\`\`python
df.withWatermark("event_time", "10 minutes")  # events more than 10 min late are dropped
  .groupBy(window("event_time", "5 minutes"), "agent_id")
  .count()
\`\`\`

**Exactly-once:** Spark writes offset checkpoints and uses idempotent sinks (Delta, Kafka transactions) to guarantee each record is processed exactly once.`,
  pros:[
    "Same DataFrame API for batch and streaming — one mental model, shared business logic",
    "Watermark-based late data handling avoids unbounded state growth"
  ],
  cons:[
    "Complete mode requires keeping the entire aggregation result in state — expensive for high-cardinality keys",
    "Checkpointing latency adds seconds to each micro-batch — not for sub-second latency requirements"
  ],
  useCase:
`Real-time ticket SLA monitoring: Kafka → Structured Streaming → watermark of 5 minutes on event_time → 1-minute window aggregation of ticket creation rate per tenant → Update mode to Delta sink → SQL Warehouse reads Delta for the live dashboard.`,
  alts:[
    "What are the output modes in Spark Structured Streaming?",
    "What is a watermark in Spark Structured Streaming?",
    "How does exactly-once processing work in Spark Structured Streaming?"
  ]
},

"pyspark-26": {
  answer:
`**Late data** is records that arrive after the expected time window has closed. Without handling it, you have two options: wait forever (unbounded state), or drop late records silently.

**Watermarks** define the "event time lag" you're willing to tolerate:
\`\`\`python
df.withWatermark("event_time", "10 minutes")
\`\`\`
Spark maintains state for windows until the watermark passes the window's end. A 5-minute window \`[10:00, 10:05)\` is finalized when the max seen event_time reaches \`10:05 + 10 min = 10:15\`.

**State cleanup:** once the watermark passes a window boundary, state for that window is removed from memory. This is critical for long-running streaming jobs — without watermarks, state grows without bound.

**Windowed aggregations:**
\`\`\`python
from pyspark.sql.functions import window
df.withWatermark("event_time", "10 minutes") \
  .groupBy(window("event_time", "5 minutes", "1 minute"), "agent_id") \  # 5-min sliding, 1-min slide
  .agg(count("ticket_id").alias("ticket_count"))
\`\`\`

**Output mode with late data:**
- **Append mode:** row only emitted when the window is finalized (after watermark passes). Latency = watermark delay.
- **Update mode:** rows emitted as they update. Late data triggers an update to the window's result.

**Exactly-once with late data:** Spark's checkpoint stores the watermark state — on restart, watermark is recovered, so no window is processed twice.`,
  pros:[
    "Watermarks bound state size — essential for production streaming jobs that run for months",
    "Sliding windows give finer-grained aggregation than tumbling windows at the cost of more state"
  ],
  cons:[
    "With append mode, you don't see results until the watermark passes — adds latency equal to the watermark",
    "Setting watermark too tight drops valid late records; too loose keeps too much state in memory"
  ],
  useCase:
`Real-time SLA monitoring: events from mobile clients can arrive up to 8 minutes late due to offline buffering. Watermark of 10 minutes ensures these late events are included in their correct time window. Windows finalize 10 minutes after the window closes — acceptable for a monitoring dashboard.`,
  alts:[
    "How do you handle late arriving data in Spark Structured Streaming?",
    "What is a watermark in Spark and how does it control state size?",
    "What is the difference between tumbling and sliding windows in Spark Streaming?"
  ]
},

"pyspark-27": {
  answer:
`**Spark Connect** (introduced in Spark 3.4) is a client-server architecture that decouples the Spark client (where you write code) from the Spark cluster (where it runs).

**Traditional Spark:** your Python script runs in a Python process that directly talks to the Spark Driver via SparkContext. Your code must run on the same machine as (or have network access to) the Driver.

**Spark Connect:**
\`\`\`
Python Client (thin)  ──gRPC──>  Spark Connect Server  ──>  Spark Cluster
(your laptop/IDE)                 (runs on the cluster)
\`\`\`

The client sends a protobuf-encoded DataFrame plan. The server executes it on the cluster. Results stream back to the client.

**Benefits:**
- **Remote execution:** write PySpark code locally in any IDE, execute on a remote cluster
- **Language-agnostic:** gRPC protocol works for Python, Scala, Go, etc. from the same server
- **Better isolation:** client failures don't affect the cluster
- **Databricks Connect v2:** uses Spark Connect — run Databricks notebooks' logic locally with your local IDE/debugger

**How it changes deployment:**
- Applications are thin clients — no Spark dependency on the client side beyond the PySpark SDK
- Easier CI/CD — no need to submit JAR/Python packages to the cluster; the plan is serialized
- Local development with remote execution becomes standard`,
  pros:[
    "Local development against a remote cluster — full IDE support, debugger, unit tests without submitting jobs",
    "Thin client architecture means cluster upgrades don't require client-side Spark version changes"
  ],
  cons:[
    "Spark Connect is still maturing — some RDD operations and context managers aren't supported yet",
    "Network round-trip for each operation adds latency in interactive sessions"
  ],
  useCase:
`A data engineer writes PySpark DataFrame code in VS Code locally. Databricks Connect v2 sends the plan to a Databricks cluster via Spark Connect gRPC. Debug breakpoints, local unit tests with \`DatabricksSession\`, and full IDE autocomplete — all while running on the real production cluster.`,
  alts:[
    "What is Spark Connect and why was it introduced?",
    "How does Databricks Connect use Spark Connect?",
    "What is the difference between Spark Connect and traditional Spark deployment?"
  ]
},

"pyspark-28": {
  answer:
`Testing PySpark code requires a local SparkSession and attention to Spark-specific behaviors.

**Local SparkSession for tests:**
\`\`\`python
import pytest
from pyspark.sql import SparkSession

@pytest.fixture(scope="session")
def spark():
    return (SparkSession.builder
            .master("local[2]")
            .appName("test")
            .config("spark.sql.shuffle.partitions", "2")  # small for tests
            .getOrCreate())
\`\`\`

**\`pyspark.testing\` utilities (Spark 3.1+):**
\`\`\`python
from pyspark.testing import assertDataFrameEqual, assertSchemaEqual

def test_ticket_enrichment(spark):
    input_df = spark.createDataFrame([("T001", "open", 2.5)], ["ticket_id","status","hours"])
    result = enrich_tickets(input_df)
    expected = spark.createDataFrame([("T001","open",2.5,"P2")], ["ticket_id","status","hours","sla_class"])
    assertDataFrameEqual(result, expected, checkRowOrder=False)
\`\`\`

**chispa library:** provides \`assert_df_equality\` with clearer diff messages than the built-in:
\`\`\`python
from chispa.dataframe_comparer import assert_df_equality
assert_df_equality(actual, expected, ignore_row_order=True, ignore_nullable=True)
\`\`\`

**Mock data generation:**
\`\`\`python
def make_tickets(spark, n=100):
    return spark.range(n).toDF("ticket_id") \
        .withColumn("status", lit("open")) \
        .withColumn("hours", rand() * 48)
\`\`\`

**What to test:** pure transformation functions (filter, aggregation, join logic). Don't test Spark internals — test business logic.`,
  pros:[
    "assertDataFrameEqual handles unordered comparison — avoids brittle tests that fail on partition order",
    "fixture(scope='session') creates SparkSession once for all tests — fast test suite startup"
  ],
  cons:[
    "Local SparkSession doesn't test cluster-specific behavior (shuffle, broadcast thresholds)",
    "Spark tests start slower than pure Python tests — keep the session fixture at session scope"
  ],
  useCase:
`A pipeline has 15 transformation functions. Each is tested with a local SparkSession, 3-5 input rows, and assertDataFrameEqual. Tests run in 45 seconds locally. CI runs the same tests — catches schema regressions before the 6-hour production job runs.`,
  alts:[
    "How do you test PySpark code?",
    "What is assertDataFrameEqual in PySpark?",
    "What is the chispa library for PySpark testing?"
  ]
},

"pyspark-29": {
  answer:
`Monitoring goes beyond just watching job completion — you need visibility into performance, failures, and resource utilization.

**Spark UI (live):**
- Port 4040 on the Driver (or via Databricks Spark UI)
- Jobs, Stages, Tasks, Storage, Executors tabs
- Real-time — gone after the job ends without History Server

**Event logs + History Server:**
\`\`\`python
spark.conf.set("spark.eventLog.enabled", "true")
spark.conf.set("spark.eventLog.dir", "s3://bucket/spark-logs/")
# Then run: spark-history-server.sh
\`\`\`
Stores event logs permanently — post-mortem analysis of completed jobs.

**Prometheus + Grafana:**
\`\`\`python
spark.conf.set("spark.metrics.conf", "metrics.properties")
# metrics.properties: *.sink.prometheus.class = ...PrometheusServlet
\`\`\`
Scrape Spark's metrics endpoint into Prometheus. Build Grafana dashboards for: active tasks, GC time, shuffle bytes, failed tasks.

**Custom metrics via SparkListener (Scala only natively; Py4J in Python):**
Track per-job metrics, alert on threshold breaches.

**Databricks:** built-in job monitoring, Ganglia metrics, cluster event logs, MLflow for model jobs.

**What to monitor:**
- GC time > 20% of task time → heap pressure → tune executor memory or switch to Tungsten off-heap
- Shuffle read > shuffle write → skew or missing filter pushdown
- Failed tasks (retry count) → instability, bad data, or resource contention`,
  pros:[
    "Prometheus + Grafana enables alerting on Spark job health — on-call gets paged when GC spikes",
    "Event logs in S3 enable post-mortem analysis of production failures without the live UI"
  ],
  cons:[
    "History Server is a single point of failure for log access — use S3-backed event logs, not local disk",
    "Prometheus metric cardinality for Spark is high — label carefully to avoid Prometheus OOM"
  ],
  useCase:
`A nightly Spark job silently degrades over weeks — each night runs 5 minutes longer. Grafana shows GC time increasing (heap fragmentation from a cache that grows daily). Alert threshold is GC > 15% of task time → on-call investigates → cache rotated weekly. Issue caught before it breaks the SLA.`,
  alts:[
    "How do you monitor Spark jobs in production?",
    "How do you set up Prometheus monitoring for Spark?",
    "What metrics should you track for a Spark job?"
  ]
},

"pyspark-30": {
  answer:
`**SCENARIO: 4-hour Spark job processing 500GB daily. Optimize to under 1 hour.**

**Step 1 — Profile (don't guess):**
Open Spark UI → find the slowest stage → check task duration distribution (skew?), shuffle bytes, input size, GC time.

**Step 2 — Systematically apply fixes:**

**Data format (often biggest win):**
\`\`\`python
# If reading CSV → convert to Parquet/Delta (one-time)
spark.read.parquet(...)  # vs CSV: 3-5x faster, column pruning, predicate pushdown
\`\`\`

**Partitioning:**
\`\`\`python
spark.conf.set("spark.sql.shuffle.partitions", "400")  # tune to 2x total cores
df = df.repartition("date","tenant_id")  # distribute evenly
\`\`\`

**Join optimization:**
\`\`\`python
large_df.join(broadcast(lookup_df), on='agent_id')  # if lookup < 200MB
\`\`\`

**Caching reused DataFrames:**
\`\`\`python
base_df.cache(); base_df.count()  # if used multiple times downstream
\`\`\`

**Skew handling:**
\`\`\`python
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
\`\`\`

**Remove Python UDFs:**
\`\`\`python
# Replace: df.withColumn('x', my_python_udf(col('a')))
# With:    df.withColumn('x', when(col('a') < 0, lit('low')).otherwise('high'))
\`\`\`

**Expected result:** format change (CSV→Parquet) alone often gives 3x. Broadcast join + shuffle partition tuning + AQE → another 3x. Total: 4 hours → 20-30 minutes is achievable.`,
  alts:[
    "How do you optimize a slow PySpark job?",
    "What are the most impactful ways to speed up a Spark job?",
    "What is the correct order of operations for Spark performance tuning?"
  ]
},

"pyspark-31": {
  answer:
`**SCENARIO: OOM on 50-node cluster processing skewed data.**

**Diagnosis using Spark UI:**
1. Jobs → click the failed job → find the failed stage
2. Stage detail → Tasks → sort by Duration → find one task that's 50-100x larger than others
3. Check "Input Size" for that task — it's processing far more data
4. Note the key that's causing skew (from your business logic knowledge)

**Fix strategy selection:**

**Option 1 — Broadcast join (if the smaller table can be broadcast):**
\`\`\`python
large.join(broadcast(small_lookup), on='skewed_key')
\`\`\`

**Option 2 — AQE skew join (Spark 3.0+, easiest):**
\`\`\`python
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes", "256mb")
\`\`\`

**Option 3 — Salting (for aggregations or large-large joins):**
\`\`\`python
from pyspark.sql.functions import concat, lit, (rand()*10).cast('int').cast('string')
large_df = large_df.withColumn('salt_key',
    concat(col('agent_id'), lit('_'), (rand()*10).cast('int').cast('string')))
# Aggregate on salt_key, then reduce:
intermediate = large_df.groupBy('salt_key').agg(...)
final = intermediate.withColumn('agent_id', split('salt_key','_')[0]).groupBy('agent_id').agg(...)
\`\`\`

**Option 4 — Null key handling:**
If the skew is due to null keys, handle them separately:
\`\`\`python
nulls = large_df.filter(col('agent_id').isNull())
non_nulls = large_df.filter(col('agent_id').isNotNull())
result = non_nulls.join(lookup, 'agent_id').union(nulls.withColumn(...))
\`\`\``,
  alts:[
    "How do you fix a Spark OOM caused by data skew?",
    "How do you use salting to fix skew in PySpark?",
    "What is the AQE skew join optimization in Spark?"
  ]
},

"pyspark-32": {
  answer:
`**SCENARIO: Join between 1TB table and 50MB lookup table is slow.**

This is the canonical broadcast join case.

**Diagnosis:**
Check explain() → look for \`SortMergeJoin\` — Spark planned a shuffle join even though one side is small.

**Why it's happening:**
The default \`autoBroadcastJoinThreshold\` is 10MB. The lookup table is 50MB — above the threshold.

**Fix 1 — Raise the threshold:**
\`\`\`python
spark.conf.set("spark.sql.autoBroadcastJoinThreshold", "200mb")
# Spark will now auto-broadcast tables up to 200MB
\`\`\`

**Fix 2 — Explicit broadcast hint:**
\`\`\`python
from pyspark.sql.functions import broadcast
result = large_df.join(broadcast(lookup_df), on='agent_id')
\`\`\`
More reliable than threshold — doesn't depend on size estimation accuracy.

**Fix 3 — Pre-filter the large table before join:**
\`\`\`python
# Push filters as close to the source as possible
filtered = large_df.filter(col('event_date') >= '2024-01-01')  # reduces to 50GB
result = filtered.join(broadcast(lookup_df), 'agent_id')
\`\`\`

**Fix 4 — Bucket the large table (for repeated joins):**
\`\`\`python
large_df.write.bucketBy(256, 'agent_id').saveAsTable('events_bucketed')
# Future joins: no shuffle on the bucketed side
\`\`\`

Verify the fix worked: \`result.explain()\` → should show \`BroadcastHashJoin\` instead of \`SortMergeJoin\`.`,
  alts:[
    "How do you optimize a join between a large and small table in PySpark?",
    "What is the difference between BroadcastHashJoin and SortMergeJoin?",
    "How do you force a broadcast join in PySpark?"
  ]
},

"pyspark-33": {
  answer:
`**SCENARIO: Streaming checkpoint grows unbounded; restart takes 30 minutes.**

**Root causes of checkpoint growth:**

**1. State not expiring — no watermark:**
Aggregation state is kept indefinitely without a watermark. Every key ever seen accumulates state.
\`\`\`python
# ✗ No watermark — state grows forever
df.groupBy('agent_id').count()
# ✓ Watermark bounds state retention
df.withWatermark('event_time', '2 hours').groupBy('agent_id', window('event_time','1h')).count()
\`\`\`

**2. Checkpoint accumulating old offset metadata:**
Delta/Kafka source checkpoints store all offsets. Old checkpoints aren't cleaned.
\`\`\`python
spark.conf.set("spark.sql.streaming.minBatchesToRetain", "5")  # keep only 5 batches' checkpoints
\`\`\`

**3. Compacting state store:**
\`\`\`python
spark.conf.set("spark.sql.streaming.stateStore.rocksdb.changelogCheckpointing.enabled", "true")
# RocksDB state store with changelog compaction — much smaller than default HDFS-based state store
\`\`\`

**4. Slow restart = large state recovery:**
RocksDB state backend recovers faster than default memory-mapped state. Also: store checkpoints on fast storage (SSD-backed S3, local NVMe).

**Best practices:**
- Always use watermarks for stateful streaming
- Set \`minBatchesToRetain\` to limit checkpoint accumulation
- Use RocksDB state store for large state (> 1GB)
- Monitor checkpoint directory size as an alert metric`,
  alts:[
    "Why does my Spark Structured Streaming checkpoint grow unbounded?",
    "How do you compact a Spark streaming checkpoint?",
    "What is the RocksDB state store in Spark Structured Streaming?"
  ]
},

"pyspark-34": {
  answer:
`**SCENARIO: PySpark works locally but fails on cluster.**

This is one of the most common production headaches. Systematic diagnosis approach:

**1. Dependency conflicts:**
Local has library version X; cluster has version Y.
\`\`\`python
# Check versions locally vs on cluster:
spark.range(1).select(lit(pd.__version__).alias('pandas_version')).show()
# Submit with explicit dependencies:
spark.conf.set("spark.jars.packages", "io.delta:delta-core_2.12:2.4.0")
\`\`\`
Fix: use \`%pip install\` in Databricks or \`--packages\`/\`--py-files\` in spark-submit.

**2. Serialization failures (pickling):**
Local Python objects that can't be pickled (lambda closures over complex objects, database connections).
Look for: \`PicklingError\` or \`AttributeError\` in the Executor logs.
Fix: move DB connections inside the function body; don't close over unpicklable objects.

**3. Path issues:**
\`/local/path\` doesn't exist on cluster nodes. Use S3/HDFS paths for all data.

**4. Executor config differences:**
Less memory on cluster → OOM that didn't happen locally. Check \`spark.executor.memory\`.

**5. Java/Scala version mismatch:**
If using JARs: local JVM vs cluster JVM version.

**Debug strategy:**
1. Read the full Executor logs (not just the Driver error) — the actual failure is in the Executor
2. Reproduce on a single-node cluster with \`master("local[1]")\` but with cluster config
3. Add logging inside map functions to identify which record fails`,
  alts:[
    "How do you debug a PySpark job that works locally but fails on a cluster?",
    "What causes pickling errors in PySpark?",
    "How do you handle dependency conflicts in PySpark on a cluster?"
  ]
},

"pyspark-35": {
  answer:
`**SCENARIO: Team writes PySpark with UDFs everywhere, jobs are 10x slower. Refactor strategy.**

**Assessment — quantify the UDF problem:**
\`\`\`python
df.explain()  # look for PythonEval nodes — each one is a UDF
# Run the job with UDFs, check Spark UI stage times
\`\`\`

**Refactoring strategy:**

**Step 1 — Replace with built-in functions (highest impact):**
\`\`\`python
# ✗ @udf: def lower_clean(s): return s.lower().strip() if s else None
# ✓ Built-in:
df.withColumn('clean', trim(lower(col('text'))))

# ✗ @udf: def classify(hours): return 'P1' if hours < 1 else 'P2'
# ✓ when/otherwise:
df.withColumn('class', when(col('hours')<1,'P1').when(col('hours')<4,'P2').otherwise('P3'))
\`\`\`

**Step 2 — Replace complex logic with Pandas UDFs:**
\`\`\`python
@pandas_udf("string")
def complex_nlp(s: pd.Series) -> pd.Series:
    return s.apply(my_nlp_model.predict)
\`\`\`
Uses Arrow batching — 10-30x faster than scalar UDF.

**Step 3 — SparkSQL for readable logic:**
\`\`\`python
spark.sql("SELECT CASE WHEN hours < 1 THEN 'P1' ... END FROM tickets")
\`\`\`

**Process:**
1. Identify UDFs in the codebase: \`grep -r "@udf\|@pandas_udf" src/\`
2. For each UDF, check if a built-in equivalent exists
3. Prioritize UDFs in the hottest stages (most tasks, most time)
4. A/B test refactored functions against original with assertDataFrameEqual`,
  alts:[
    "How do you refactor PySpark code that uses too many Python UDFs?",
    "What built-in Spark functions replace common UDF patterns?",
    "How do you improve PySpark performance by replacing UDFs?"
  ]
}
