// PATCH PART 8: databricks-pyspark-pandas-1 through databricks-pyspark-pandas-45
"databricks-pyspark-pandas-1": {
  answer:
`**Series** is a 1-D labeled array (one column or one row). **DataFrame** is a 2-D labeled table of Series.

\`\`\`python
import pandas as pd

s = pd.Series([1, 2, 3], index=['a','b','c'])   # Series
df = pd.DataFrame({'ticket_id': ['T1','T2'], 'status': ['open','closed']})
\`\`\`

**loc vs iloc:**

| | loc | iloc |
|---|---|---|
| Basis | Label-based | Integer position-based |
| Row select | \`df.loc['a':'c']\` (inclusive end) | \`df.iloc[0:3]\` (exclusive end) |
| Column select | \`df.loc[:, 'col']\` | \`df.iloc[:, 0]\` |
| Single cell | \`df.loc['r', 'col']\` | \`df.iloc[0, 0]\` |

\`\`\`python
df.loc[df['status'] == 'open', 'ticket_id']        # label-based filter + column select
df.iloc[0:10, [0, 2]]                              # rows 0-9, columns 0 and 2
df.loc[:, ['ticket_id', 'status']]                 # all rows, named columns
\`\`\`

**Boolean filtering:**
\`\`\`python
df[df['status'] == 'open']                         # simple filter
df[(df['status'] == 'open') & (df['priority'] == 'P1')]  # compound (& not 'and')
df[df['status'].isin(['open','pending'])]          # isin
df[~df['status'].isna()]                           # not null
df.query("status == 'open' and priority == 'P1'") # query string (readable)
\`\`\``,
  pros:[
    "loc with label slicing is inclusive on both ends — different from iloc and Python slices",
    "query() is more readable than chained boolean masks for complex filters"
  ],
  cons:[
    "Mixing loc and iloc is a common bug source — be explicit about which you're using",
    "Boolean indexing creates a copy; chained assignment (df[mask]['col'] = x) silently does nothing"
  ],
  useCase:
`Filtering a 1M-row ticket DataFrame to get P1 tickets from the last 7 days: \`df.loc[(df['priority']=='P1') & (df['created_at'] >= cutoff), ['ticket_id','agent_id','status']]\`. loc selects rows by condition and only the 3 needed columns — pandas reads only those columns if the source is Parquet.`,
  alts:[
    "What is the difference between loc and iloc in pandas?",
    "How do you filter a pandas DataFrame?",
    "What is the difference between a pandas Series and DataFrame?"
  ]
},

"databricks-pyspark-pandas-2": {
  answer:
`Every pandas column has a **dtype**. The dtype determines memory usage and available operations.

**Common dtypes:**

| dtype | Usage | Memory |
|---|---|---|
| \`int64\` | default integers | 8 bytes/value |
| \`float64\` | default floats | 8 bytes/value |
| \`object\` | strings (Python str) | ~50+ bytes/value |
| \`bool\` | True/False | 1 byte/value |
| \`datetime64[ns]\` | timestamps | 8 bytes/value |
| \`category\` | low-cardinality strings | ~1-4 bytes/value |
| \`Int64\` (nullable) | integers with NaN | 8 bytes + bitmask |

**Mixed types in object columns:** when a column has mixed types (int + string), pandas uses \`object\` dtype — slow and memory-heavy. Fix:
\`\`\`python
df['amount'] = pd.to_numeric(df['amount'], errors='coerce')  # coerce non-numeric → NaN
\`\`\`

**Category dtype — biggest memory win for low-cardinality strings:**
\`\`\`python
df['status'].nunique()   # 4 unique values out of 1M rows → perfect for category
df['status'] = df['status'].astype('category')
# Memory: from ~50MB (object) to ~1MB (category) for 1M rows
\`\`\`

**Downcasting numerics:**
\`\`\`python
df['priority_level'] = df['priority_level'].astype('int8')   # if values 1-4
df['score'] = df['score'].astype('float32')                  # halves float memory
\`\`\`

**Check memory usage:**
\`\`\`python
df.memory_usage(deep=True).sum() / 1e6   # MB
df.dtypes
\`\`\``,
  pros:[
    "Converting status/priority to category dtype can reduce memory 10-50x for high-row DataFrames",
    "Explicit dtype on read_csv avoids wrong inference (numeric IDs read as float due to NaN)"
  ],
  cons:[
    "category dtype adds overhead for high-cardinality columns — only use when unique values < 50% of total",
    "Nullable Int64 dtype is slower than int64 for arithmetic — use only when NaN in integer column is needed"
  ],
  useCase:
`A 5M-row ticket DataFrame with \`status\` (4 values), \`priority\` (4 values), \`channel\` (6 values) as object dtype: 1.2GB memory. Converting all three to category: 180MB. The 6x reduction allows the entire DataFrame to fit in a 512MB Lambda function.`,
  alts:[
    "What is the category dtype in pandas and when should I use it?",
    "How do you reduce memory usage in a pandas DataFrame?",
    "What causes mixed-type object columns in pandas?"
  ]
},

"databricks-pyspark-pandas-3": {
  answer:
`Missing data in pandas is represented as \`NaN\` (float), \`None\` (object), \`NaT\` (datetime), or \`pd.NA\` (nullable types).

**Detection:**
\`\`\`python
df.isna()              # boolean mask
df.isna().sum()        # count per column
df.isna().any()        # any null per column
\`\`\`

**dropna:**
\`\`\`python
df.dropna()                          # drop rows with ANY null
df.dropna(subset=['ticket_id'])      # drop only if ticket_id is null
df.dropna(thresh=3)                  # keep rows with at least 3 non-null values
\`\`\`

**fillna:**
\`\`\`python
df['status'].fillna('unknown')                    # fill with constant
df['resolution_hours'].fillna(df['resolution_hours'].median())  # fill with stat
df.fillna(method='ffill')                         # forward-fill (time series)
df.fillna(method='bfill')                         # backward-fill
\`\`\`

**interpolate (numeric time series):**
\`\`\`python
df['metric'].interpolate(method='linear')         # linear between known values
df['metric'].interpolate(method='time')           # time-aware interpolation
\`\`\`

**Production best practices:**
1. **Document null semantics:** \`NaN\` in \`resolution_hours\` means "not yet resolved" — don't fill with 0
2. **Validate after fill:** assert no nulls remain in required columns
3. **Separate required vs optional:** drop rows with null primary keys; fill optional fields
4. **Track null rates:** log \`df.isna().mean()\` as a data quality metric`,
  pros:[
    "interpolate is far better than ffill for numeric time series — produces smooth estimates",
    "dropna(subset=) targets only the columns that matter — preserves rows with nulls in optional fields"
  ],
  cons:[
    "fillna(method='ffill') with pandas 2.0: deprecated — use df.ffill() directly",
    "interpolate on non-time-ordered data can produce misleading results — always sort first"
  ],
  useCase:
`Ticket SLA pipeline: \`ticket_id\` null → drop row (invalid). \`resolution_hours\` null → keep as NaN (unresolved ticket, valid state). \`agent_name\` null → fill 'Unassigned'. \`response_time_ms\` null in time series → \`interpolate('time')\` for SLA trend chart.`,
  alts:[
    "How do you handle missing data in pandas?",
    "What is the difference between fillna, dropna, and interpolate in pandas?",
    "What are best practices for handling nulls in a production pandas pipeline?"
  ]
},

"databricks-pyspark-pandas-4": {
  answer:
`**groupby** implements **split-apply-combine**: split data by key, apply a function to each group, combine results.

\`\`\`python
g = df.groupby('agent_id')
\`\`\`

**agg — aggregate to one row per group:**
\`\`\`python
g.agg({'resolution_hours': ['mean','median','count'], 'sla_breached': 'sum'})
g.agg(avg_hours=('resolution_hours','mean'), breach_count=('sla_breached','sum'))  # named agg
\`\`\`

**transform — return same-length result (broadcasts back to original DataFrame):**
\`\`\`python
df['agent_avg_hours'] = g['resolution_hours'].transform('mean')
# Each row gets its group's average — same row count as input
# Use for: rank within group, z-score, % of group total
df['pct_of_agent'] = df['resolution_hours'] / g['resolution_hours'].transform('sum')
\`\`\`

**apply — general-purpose (slowest, most flexible):**
\`\`\`python
def top_n(group, n=3):
    return group.nlargest(n, 'resolution_hours')
g.apply(top_n, n=3)  # can return different row counts per group
# Use only when agg/transform can't express the logic
\`\`\`

**filter — keep/drop entire groups:**
\`\`\`python
g.filter(lambda x: x['resolution_hours'].mean() > 5)  # keep agents with avg > 5h
\`\`\`

**Key distinction:**
- \`agg\`: N groups → N rows
- \`transform\`: N rows → N rows (group-level value broadcast)
- \`apply\`: N groups → M rows (flexible, can reshape)
- \`filter\`: N groups → ≤N groups (keep or drop)`,
  pros:[
    "transform is the right tool for within-group standardization — avoids a separate merge",
    "named aggregation syntax (named_col=('col','func')) gives clean output column names"
  ],
  cons:[
    "apply is 10-100x slower than agg/transform — avoid for large DataFrames",
    "groupby.apply with group_keys=True/False behavior changed in pandas 2.0 — verify output shape"
  ],
  useCase:
`Agent SLA report: \`groupby('agent_id').agg(ticket_count=('ticket_id','count'), avg_hours=('resolution_hours','mean'))\` gives per-agent summary. Then \`transform('mean')\` adds a team-average column to the original DataFrame for deviation analysis — no merge needed.`,
  alts:[
    "What is the difference between groupby agg, transform, apply, and filter in pandas?",
    "How does groupby transform work in pandas?",
    "When should I use groupby apply vs agg in pandas?"
  ]
},

"databricks-pyspark-pandas-5": {
  answer:
`**merge** (SQL-style), **join** (index-based), **concat** (stacking) — three different combination operations.

**merge (most common):**
\`\`\`python
pd.merge(tickets, agents, on='agent_id', how='left')      # left join
pd.merge(t, a, left_on='assigned_to', right_on='id')      # different column names
pd.merge(t, a, on='agent_id', how='inner')                # inner (default)
# how options: inner, left, right, outer, cross
\`\`\`

**Merge types:**
- **inner:** only matching rows in both
- **left:** all left rows, matching right rows (NaN if no match)
- **right:** all right rows, matching left rows
- **outer:** all rows from both (NaN for non-matches)

**Diagnosis — unexpected row count:**
\`\`\`python
assert tickets['ticket_id'].nunique() == len(tickets), "Duplicate keys before merge"
result = pd.merge(tickets, metadata, on='ticket_id')
assert len(result) == len(tickets), f"Row explosion: {len(result)} vs {len(tickets)}"
\`\`\`

**join (index-based):**
\`\`\`python
df1.join(df2, how='left')           # join on index
df1.join(df2.set_index('agent_id'), on='agent_id')  # right DF's column as index
\`\`\`

**concat (stacking):**
\`\`\`python
pd.concat([df1, df2], ignore_index=True)      # stack rows
pd.concat([df1, df2], axis=1)                 # add columns side by side
pd.concat([df1, df2], keys=['jan','feb'])      # add MultiIndex for source tracking
\`\`\`

**Performance:** merge on integer keys is faster than string keys. Sort merge (sort=True) is faster for large DataFrames when keys are sortable.`,
  pros:[
    "validate='one_to_one' in merge raises an error if keys aren't unique — catches bugs early",
    "concat with ignore_index=True avoids duplicate index values when stacking monthly files"
  ],
  cons:[
    "outer merge produces NaN for all unmatched columns — always check dtypes after merge",
    "merging on float keys is unreliable due to floating-point precision — convert to string or int first"
  ],
  useCase:
`Building a ticket enrichment pipeline: merge tickets (1M rows) with agents (5K rows) on agent_id (left join), then merge with tenants (1K rows) on tenant_id (left join). Validate row count stays at 1M after each merge. Outer join on agent_id reveals 500 tickets with no assigned agent.`,
  alts:[
    "What is the difference between merge, join, and concat in pandas?",
    "How do you do a left join in pandas?",
    "How do you prevent row explosion when merging DataFrames in pandas?"
  ]
},

"databricks-pyspark-pandas-6": {
  answer:
`Operations from fastest to slowest: **built-in vectorized** >> **NumPy ufuncs** >> **apply with vectorized internals** >> **apply row-by-row** >> **iterrows**.

**Vectorized (always prefer):**
\`\`\`python
df['priority_score'] = df['hours'] * 1.5 + df['escalations'] * 10  # pure vectorized
df['is_breach'] = df['hours'] > df['sla_limit']                     # comparison
df['label'] = df['status'].str.upper()                               # str accessor
from numpy import where
df['tier'] = where(df['hours'] < 1, 'P1', where(df['hours'] < 4, 'P2', 'P3'))
\`\`\`

**apply with scalar function (row-by-row, slow):**
\`\`\`python
# ✗ Slow — 10-100x slower than vectorized
df['result'] = df['text'].apply(lambda x: some_python_function(x))
\`\`\`

**When apply is acceptable:**
- Complex multi-column logic that can't be vectorized
- Calling external API or ML model per row
- Non-standard return types (list, dict) per row

**iterrows (almost never):**
\`\`\`python
# ✗✗✗ Worst — converts each row to a Series (copies + boxing overhead)
for idx, row in df.iterrows():
    df.at[idx, 'result'] = process(row['col'])
# Better: use itertuples() if you must iterate — 5-10x faster than iterrows
for row in df.itertuples():
    ...
\`\`\`

**Performance benchmark (1M rows):**
- Vectorized: 10ms
- np.where: 15ms
- apply (lambda): 3000ms
- iterrows: 30,000ms+`,
  pros:[
    "NumPy ufuncs and pandas built-in string/datetime accessors are fully vectorized — use them always",
    "itertuples() is 5-10x faster than iterrows() when row iteration is unavoidable"
  ],
  cons:[
    "apply() performance varies wildly — applying a vectorized NumPy function to a Series is fast; a pure-Python function is slow",
    "Vectorized operations create intermediate arrays — for very large DataFrames, chain operations can use 3x the memory"
  ],
  useCase:
`Ticket priority scoring: \`np.where\` replaces an apply-based classifier. Processing 5M rows dropped from 15 minutes (apply) to 4 seconds (np.where). The logic (\`if hours < 1 → P1 elif hours < 4 → P2 else P3\`) maps directly to nested np.where.`,
  alts:[
    "What is the fastest way to apply a function to a pandas DataFrame?",
    "When should I use apply vs vectorized operations in pandas?",
    "Why is iterrows so slow in pandas?"
  ]
},

"databricks-pyspark-pandas-7": {
  answer:
`When data doesn't fit in memory, you need chunked reading, memory optimization, or a distributed framework.

**Chunked reading:**
\`\`\`python
chunks = []
for chunk in pd.read_csv('big.csv', chunksize=100_000):
    processed = chunk[chunk['status'] == 'open']   # filter in each chunk
    chunks.append(processed)
result = pd.concat(chunks, ignore_index=True)
\`\`\`

**Memory profiling:**
\`\`\`python
df.memory_usage(deep=True).sum() / 1e9  # GB
# Use memory_profiler library for line-by-line profiling
\`\`\`

**Dtype optimization on read:**
\`\`\`python
dtypes = {'status': 'category', 'priority': 'category', 'hours': 'float32', 'count': 'int16'}
df = pd.read_csv('tickets.csv', dtype=dtypes, parse_dates=['created_at'])
\`\`\`

**Parquet instead of CSV:**
\`\`\`python
df.to_parquet('tickets.parquet')
df = pd.read_parquet('tickets.parquet', columns=['ticket_id','status'])  # column pruning
\`\`\`
Parquet: 5-10x smaller than CSV, 3-5x faster to read, supports column selection.

**When pandas isn't enough → switch tools:**
- **Polars:** 5-20x faster than pandas, stays in-process
- **Dask:** parallelizes pandas across cores/nodes, same API
- **PySpark:** distribute across a cluster for petabyte scale
- **DuckDB:** in-process SQL on Parquet files, very fast for analytics`,
  pros:[
    "Specifying dtypes on read_csv prevents inference cost and wrong types (numeric IDs read as float)",
    "Parquet with column pruning reads only needed columns — critical for wide tables"
  ],
  cons:[
    "Chunked processing can't do cross-chunk operations (sort, groupby across all rows) without final concat",
    "float32 precision loss (7 significant digits) can cause subtle rounding bugs in financial calculations"
  ],
  useCase:
`20GB CSV of ticket events: naive pd.read_csv OOMs on 8GB RAM. Fix: \`read_csv(chunksize=500_000, dtype={'status':'category','priority':'category'})\` processes 40 chunks of 400MB each. After filtering to open tickets (10%), concat produces a 2GB result that fits in memory.`,
  alts:[
    "How do you handle large datasets in pandas that don't fit in memory?",
    "What is chunked reading in pandas?",
    "When should I switch from pandas to PySpark for large data?"
  ]
},

"databricks-pyspark-pandas-8": {
  answer:
`**MultiIndex** is a hierarchical index — multiple levels of row or column labels.

\`\`\`python
df.set_index(['tenant_id','agent_id'])           # two-level row index
df.loc[('T001', 'A01')]                          # access specific level combination
df.loc['T001']                                   # all rows for tenant T001
df.reset_index()                                 # flatten back to columns
\`\`\`

**pivot_table — reshape from long to wide with aggregation:**
\`\`\`python
pd.pivot_table(df,
    values='resolution_hours',
    index='agent_id',
    columns='priority',
    aggfunc='mean',
    fill_value=0
)
# Result: one row per agent, one column per priority, value = mean hours
\`\`\`

**crosstab — frequency table:**
\`\`\`python
pd.crosstab(df['agent_id'], df['priority'], margins=True)
# Row: agent, Column: priority, Value: count
\`\`\`

**melt — wide to long (unpivot):**
\`\`\`python
df_melted = df.melt(id_vars=['ticket_id'], value_vars=['p1_count','p2_count','p3_count'],
    var_name='priority', value_name='count')
\`\`\`

**stack/unstack:**
\`\`\`python
df.stack()     # moves innermost column level to innermost row level (wide → long)
df.unstack()   # moves innermost row level to innermost column level (long → wide)
\`\`\`

**When to use each:**
- pivot_table: aggregate + reshape in one step (Excel-style)
- melt: undo a pivot (wide → long for tidy data)
- crosstab: frequency/contingency tables
- stack/unstack: move index levels between row/column`,
  pros:[
    "pivot_table handles duplicates (aggregates), unlike pivot which requires unique index+column combinations",
    "melt is the correct tool for converting multi-column wide data to tidy format for ML or visualization"
  ],
  cons:[
    "MultiIndex operations have complex syntax — reset_index() often produces clearer code",
    "pivot_table with aggfunc='first' hides data loss when there are duplicates — be explicit about aggregation"
  ],
  useCase:
`SLA report: \`pivot_table(df, values='breach_rate', index='agent_id', columns='month', aggfunc='mean')\` produces an agent × month matrix of breach rates. Then \`melt\` converts it back to long format for a Plotly time-series chart.`,
  alts:[
    "What is the difference between pivot_table, melt, and crosstab in pandas?",
    "What is a MultiIndex in pandas?",
    "How do you reshape a pandas DataFrame from wide to long?"
  ]
},

"databricks-pyspark-pandas-9": {
  answer:
`**Spark architecture is a master-worker distributed computing system:**

**Driver:** JVM process that runs your main() function. Hosts SparkContext, creates the execution plan, schedules tasks on Executors. One per application.

**Executors:** JVM processes on worker nodes. Execute actual tasks. Each has memory (storage + execution pool) and CPU cores. Report results to Driver.

**Cluster Manager:** allocates resources — Spark Standalone, YARN, Kubernetes, or Mesos. In Databricks, this is fully managed.

**Execution model:**
1. You write transformations → **DAG** (Directed Acyclic Graph) builds lazily
2. An **action** (\`count()\`, \`write\`, \`collect()\`) triggers the DAG Scheduler
3. DAG Scheduler splits the DAG into **Stages** at shuffle boundaries (\`groupBy\`, \`join\`, \`repartition\`)
4. **Task Scheduler** sends one **Task** per partition to available Executors
5. Executors shuffle data between stages (expensive — network + disk I/O)
6. Results return to Driver

**Key insight:** stages within a job can run in parallel if there's no dependency; tasks within a stage always run in parallel (one per partition).`,
  pros:[
    "DAG-based lineage: if an Executor fails, Spark recomputes only the lost partitions from the lineage — no checkpoint needed",
    "Lazy evaluation allows Catalyst to optimize the full plan before any execution"
  ],
  cons:[
    "Driver is a single point of coordination — large collects or driver-side operations are bottlenecks",
    "Network shuffle between stages is the primary performance bottleneck — design to minimize it"
  ],
  useCase:
`Processing 1TB of daily ticket events: Driver creates a 4-stage DAG (read → filter → join → aggregate). 200 tasks execute in parallel across 40 Executors. Stage 3 requires shuffle (join) — 80GB of data crosses the network. Total time: 12 minutes vs 8 hours on a single machine.`,
  alts:[
    "What is the Spark Driver and Executor?",
    "How does Spark schedule tasks?",
    "What is a DAG in Apache Spark?"
  ]
},

"databricks-pyspark-pandas-10": {
  answer:
`Three abstraction levels in Spark:

**RDD (Resilient Distributed Dataset):** Spark's original low-level API. Untyped, distributed collection of Java/Python objects. No schema. Catalyst optimizer blind to it. Full control but verbose and slow for Python (serialization overhead).

**DataFrame:** column-named, schema-aware table. The primary PySpark API. Goes through Catalyst optimizer and Tungsten execution engine. Built on RDD internally but exposes a SQL-like API.

**Dataset (Scala/Java only):** typed DataFrames with compile-time type checking. Not available in Python.

**Why DataFrames beat Python RDDs:**
1. **Catalyst optimizer:** rewrites logical → physical plan (predicate pushdown, join reorder, constant folding)
2. **Tungsten:** off-heap binary format, SIMD operations, code generation — avoids JVM GC
3. **No Python serialization:** DataFrame operations run in JVM; Python overhead only at boundaries (UDFs, toPandas)
4. **SQL interop:** \`df.createOrReplaceTempView('t'); spark.sql("SELECT...")\`

\`\`\`python
# DataFrame API:
df.filter(col('status') == 'open').groupBy('agent_id').count()
# Equivalent SQL:
spark.sql("SELECT agent_id, COUNT(*) FROM tickets WHERE status='open' GROUP BY agent_id")
\`\`\`
Both produce identical physical plans via Catalyst.`,
  pros:[
    "DataFrame operations avoid Python serialization entirely — the JVM processes all data",
    "explain() shows the full Catalyst-optimized plan — visible, debuggable, predictable"
  ],
  cons:[
    "No compile-time schema checking in Python — column name typos fail at runtime, not at write time",
    "RDDs are still needed for non-tabular operations (graph processing, arbitrary binary data)"
  ],
  useCase:
`A Python RDD pipeline that processed 500M rows in 3 hours was rewritten as a DataFrame pipeline. The Catalyst optimizer pushed a filter to the Parquet reader (skipping 90% of data) and chose a broadcast join for the small lookup table. New runtime: 18 minutes.`,
  alts:[
    "What is the difference between RDD, DataFrame, and Dataset in Spark?",
    "Why are PySpark DataFrames faster than Python RDDs?",
    "When would you choose an RDD over a DataFrame?"
  ]
},

"databricks-pyspark-pandas-11": {
  answer:
`**Transformations** are lazy — they build the DAG but execute nothing. **Actions** trigger execution.

\`\`\`python
# Transformations (nothing runs):
filtered = df.filter(col('status') == 'open')        # narrow transformation
grouped = filtered.groupBy('agent_id').count()       # wide transformation (shuffle)
cached = filtered.cache()                            # marks for caching, still lazy

# Actions (trigger execution):
grouped.show()       # display
grouped.count()      # count
grouped.collect()    # bring to Driver (dangerous on large data)
grouped.write.parquet(path)  # write to storage
grouped.toPandas()   # convert to pandas
\`\`\`

**Lazy evaluation benefits:**
1. Catalyst sees the entire transformation chain before execution — can reorder, simplify, push down
2. No intermediate DataFrames materialized unless cached
3. Lineage enables fault tolerance — lost partitions recomputed from source

**Lineage:** Spark tracks the parent → child relationships of DataFrames. If an Executor holding partition 5 of \`filtered\` fails, Spark recomputes it from \`df\` (reading from source again) — not from a checkpoint.

**Common pitfall:** calling \`count()\` in a loop for progress monitoring triggers a full job per iteration. Cache the DataFrame and count once, or use an accumulator.`,
  pros:[
    "Lazy evaluation prevents unnecessary computation — if you filter then only select 2 columns, unneeded columns never load",
    "Lineage graph means you never need explicit checkpoints for most jobs"
  ],
  cons:[
    "Errors in transformations surface at action time — the stack trace points to the action, not the bad transformation",
    "Without caching, calling two actions on the same DataFrame recomputes everything twice"
  ],
  useCase:
`A pipeline filters 10TB of logs to errors (0.1% of data), joins with a 50MB lookup, and aggregates. With lazy evaluation + Catalyst: the filter pushes to Parquet reader (99.9% of data skipped before reading), the join uses broadcast (zero shuffle). One action (\`write\`) triggers one optimized job.`,
  alts:[
    "What is lazy evaluation in Spark?",
    "What is the difference between Spark transformations and actions?",
    "How does Spark lineage enable fault tolerance?"
  ]
},

"databricks-pyspark-pandas-12": {
  answer:
`**Partitioning** determines how data is distributed across Executors. Wrong partitioning is the most common Spark performance issue.

**Hash partitioning (default for shuffles):** \`hash(key) % numPartitions\` — all rows with the same key go to the same partition. Used by groupBy, join shuffles.

**Range partitioning:** rows assigned by sorted key ranges. Used in orderBy.

**repartition vs coalesce:**
\`\`\`python
df.repartition(400)              # full shuffle — redistributes evenly; use to increase partitions
df.repartition(400, 'agent_id') # hash-partition by agent_id
df.coalesce(10)                  # narrow (no full shuffle) — only reduces partitions by merging locally
\`\`\`

**Optimal partition count:**
- Target ~128MB per partition
- Rule of thumb: 2-4× total CPU cores in cluster
- After shuffle: controlled by \`spark.sql.shuffle.partitions\` (default 200)

**When to repartition:**
- Rebalance skewed data (one partition has 10x more data)
- Before a large join: repartition both tables on join key
- Control output file count: \`repartition(50)\` before write = 50 output files

\`\`\`python
spark.conf.set("spark.sql.shuffle.partitions", "400")  # tune before running jobs
\`\`\``,
  pros:[
    "Pre-repartitioning on join key can eliminate the join shuffle for co-located tables",
    "coalesce(1) before write produces a single file without a full shuffle (just local merge)"
  ],
  cons:[
    "repartition() always triggers a full shuffle — even when increasing partition count from 200 to 201",
    "The default spark.sql.shuffle.partitions=200 is too high for small data and too low for very large data"
  ],
  useCase:
`Nightly job joins 2 tables on agent_id, then aggregates by agent_id. Pre-repartitioning both on agent_id means the join finds co-located data. shuffle.partitions reduced from 200 to 80 (matching 2× cluster cores). Runtime: 90 min → 22 min.`,
  alts:[
    "What is the difference between repartition and coalesce in Spark?",
    "How do you choose the number of Spark partitions?",
    "What is hash partitioning in Spark?"
  ]
},

"databricks-pyspark-pandas-13": {
  answer:
`**Catalyst optimizer** transforms your logical plan into an optimized physical plan through 4 phases:

**1. Analysis:** resolve column names against catalog, check types, validate schema.

**2. Logical optimization:** rule-based rewrites:
- **Predicate pushdown:** \`WHERE status='open'\` moves as close to the data source as possible (to Parquet reader, before any joins)
- **Column pruning:** remove unused columns before reading
- **Constant folding:** evaluate \`WHERE 1=1 AND status='open'\` → \`WHERE status='open'\`
- **Join reordering:** smaller table goes to build side
- **Boolean simplification**

**3. Physical planning:** choose physical algorithms:
- Broadcast join vs sort-merge join vs shuffle hash join
- Scan strategy (full scan vs index scan for JDBC)
- Shuffle strategy

**4. Code generation (Tungsten):** generate Java bytecode for tight inner loops — eliminates virtual dispatch overhead, uses CPU registers efficiently.

**Verify the plan:**
\`\`\`python
df.explain()                    # physical plan only
df.explain(mode='extended')     # all 4 plan stages
df.explain(mode='formatted')    # human-readable columnar format
# Look for: PushedFilters, ReadSchema, BroadcastHashJoin, SortMergeJoin
\`\`\`

**Catalyst is bypassed by Python UDFs** — they're black boxes. Catalyst cannot optimize inside them, cannot push predicates through them, and cannot generate code for them.`,
  pros:[
    "Catalyst predicate pushdown is automatic — no code changes needed, just verify with explain()",
    "Physical plan shows exactly which join strategy was chosen — helps debug performance"
  ],
  cons:[
    "Catalyst can't optimize Python UDFs — always use built-in functions to stay inside Catalyst",
    "Complex subqueries or nested correlated queries may not optimize well — check the plan"
  ],
  useCase:
`A query filters by date then joins. Without Catalyst: full table scan then filter then join. With Catalyst: date filter pushed to Parquet reader (skips 95% of row groups), join size reduced 20x before execution. Plan shows \`PushedFilters: [IsNotNull(date), GreaterThanOrEqual(date,2024-01-01)]\`.`,
  alts:[
    "How does the Spark Catalyst optimizer work?",
    "What is predicate pushdown in Spark?",
    "How do you view the Spark execution plan?"
  ]
},

"databricks-pyspark-pandas-14": {
  answer:
`Spark has three join strategies. Catalyst picks one based on table size estimates and hints.

**Broadcast join (fastest — zero shuffle on large side):**
Small table sent to every Executor. Join happens locally. Zero network transfer for the large table.
\`\`\`python
from pyspark.sql.functions import broadcast
large.join(broadcast(small), 'agent_id')
# Auto-broadcast if small < spark.sql.autoBroadcastJoinThreshold (default 10MB)
\`\`\`

**Sort-merge join (default for large-large):**
Both tables shuffled on join key, sorted, merged. Two full shuffles. Most common for large-large joins.

**Shuffle hash join:**
Smaller side shuffled and loaded into hash table per partition; larger side streams through. Faster than sort-merge when smaller side fits in memory per partition.

**Catalyst decision order:**
1. Either side < autoBroadcastJoinThreshold → broadcast join
2. Either side < spark.sql.join.preferSortMergeJoin (spark 3.3+) → shuffle hash
3. Otherwise → sort-merge join

**AQE (Spark 3.0+) dynamic upgrade:**
AQE can upgrade a planned sort-merge to broadcast at runtime if actual statistics show the table is small enough:
\`\`\`python
spark.conf.set("spark.sql.adaptive.enabled", "true")
\`\`\``,
  pros:[
    "Broadcast join eliminates the most expensive operation (shuffle) for small-large joins",
    "AQE dynamic broadcast upgrade handles cases where the table size is only small after filtering"
  ],
  cons:[
    "Broadcasting a table > 200MB causes Executor OOM — threshold should reflect available Executor memory",
    "Sort-merge join requires sortable keys — joins on complex types need custom ordering"
  ],
  useCase:
`Join of 5TB event log with 80MB agent lookup. Without broadcast hint: sort-merge join, 5TB shuffle on event table. With \`broadcast(agent_df)\`: 80MB sent to all 50 Executors, zero shuffle on the 5TB table. Stage time: 2h → 12 min.`,
  alts:[
    "What are the different Spark join strategies?",
    "When does Spark choose a broadcast join?",
    "What is a sort-merge join in Spark and when is it used?"
  ]
},

"databricks-pyspark-pandas-15": {
  answer:
`**Data skew:** some partitions have significantly more data than others. One task processes 100GB while others process 100MB — the stage blocks until the slow task finishes.

**Detection (Spark UI):**
Stage detail → Tasks → sort by Duration. If one task takes 50× median → skew. Input Size column shows 100GB vs 1GB per task → confirms skew on data volume.

**Fix 1 — Broadcast join (if smaller side):**
\`\`\`python
large.join(broadcast(small), 'skewed_key')  # eliminates shuffle entirely
\`\`\`

**Fix 2 — AQE skew join (automatic, Spark 3.0+):**
\`\`\`python
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.skewedPartitionFactor", "5")  # 5× median = skewed
\`\`\`
AQE detects skewed partitions and splits them into sub-tasks automatically.

**Fix 3 — Salting (for aggregations or non-broadcastable joins):**
\`\`\`python
from pyspark.sql.functions import concat, lit, (rand()*10).cast('int').cast('string')
# Add salt to spread the skewed key across 10 partitions
large = large.withColumn('key_salt', concat(col('agent_id'), lit('_'), (rand()*10).cast('int').cast('string')))
# Explode small side to match all 10 salt values
small = small.crossJoin(spark.range(10).toDF('n')) \
             .withColumn('key_salt', concat(col('agent_id'), lit('_'), col('n').cast('string')))
result = large.join(small, 'key_salt').drop('key_salt','n')
\`\`\`

**Fix 4 — Handle nulls separately:**
\`\`\`python
nulls = df.filter(col('agent_id').isNull())
non_nulls = df.filter(col('agent_id').isNotNull())
result = non_nulls.join(lookup, 'agent_id').union(nulls.withColumn(...))
\`\`\``,
  pros:[
    "AQE automatic skew handling eliminates manual salting for most cases in Spark 3.0+",
    "Null key separation is clean and eliminates the most common skew cause"
  ],
  cons:[
    "Salting increases the smaller table size by 10× — needs enough memory for the exploded small side",
    "AQE can't fix skew caused by null keys — that requires explicit null handling"
  ],
  useCase:
`Join on customer_id: 40% of rows have \`customer_id = 'guest'\`. AQE detects 3 partitions are 20× median size and splits them into sub-tasks. Stage time drops from 3 hours to 25 minutes with zero code changes.`,
  alts:[
    "What is data skew in Spark and how do you fix it?",
    "How does AQE handle skewed partitions?",
    "What is salting in Spark?"
  ]
},

"databricks-pyspark-pandas-16": {
  answer:
`**Unified memory model:** Executor memory is shared between storage (caching) and execution (shuffle, sort, joins). Dynamic allocation — either can use what the other doesn't need.

\`\`\`
Executor memory (e.g., 8GB)
  ├─ Reserved (300MB, system)
  └─ Usable (7.7GB)
       ├─ User memory (40%) — Python objects, UDF data
       └─ Spark memory (60%)
            ├─ Storage — cached DataFrames, broadcast vars
            └─ Execution — shuffle buffers, sort, hash tables
\`\`\`

**Tungsten:** C++ binary memory format (off-heap), SIMD operations, bytecode generation. Eliminates JVM GC pressure for SQL/DataFrame operations.

**OOM causes and fixes:**

| Cause | Symptom | Fix |
|---|---|---|
| Partition too large | "java.lang.OutOfMemoryError: GC overhead" | Repartition to more partitions |
| collect() on large DF | Driver OOM | Never collect() large data; write to storage |
| Cache overflow | Executor OOM | Unpersist unused caches; use MEMORY_AND_DISK |
| Python UDF | "Py4JNetworkError" | Switch to Pandas UDF or built-in |
| Shuffle | "Unable to acquire memory" | Increase shuffle.partitions; increase executor.memory |

\`\`\`python
spark.conf.set("spark.memory.offHeap.enabled", "true")
spark.conf.set("spark.memory.offHeap.size", "4g")  # extra off-heap for shuffle
\`\`\``,
  pros:[
    "Dynamic storage/execution split removes the need to tune a fixed ratio — Spark adapts to the workload",
    "Off-heap memory reduces GC pauses for memory-intensive operations"
  ],
  cons:[
    "OOM messages are generic — need Spark UI + Executor logs to determine which subsystem failed",
    "Python UDF memory is outside Spark's management — sizing it requires knowing the Python worker's working set"
  ],
  useCase:
`A sort-merge join OOM at 8GB per Executor. Investigation: 2GB partitions need to be sorted in execution memory. Fix: repartition(400) before the join → 512MB partitions → fits comfortably in execution memory (60% of 8GB = 4.8GB shared across tasks). OOM resolved.`,
  alts:[
    "How does Spark memory management work?",
    "What is Tungsten in Spark?",
    "Why does my Spark job run out of memory and how do I fix it?"
  ]
},

"databricks-pyspark-pandas-17": {
  answer:
`Schema evolution handles changes in data structure over time — new columns, changed types, renamed columns.

**mergeSchema (Parquet/Delta):**
\`\`\`python
df = spark.read.option("mergeSchema", "true").parquet("s3://tickets/")
# Reads files with different schemas; union of all columns; null for missing
\`\`\`

**Delta Lake — enforcement (default) vs evolution (opt-in):**
\`\`\`python
# Enforcement: extra columns raise error → protects data quality
df.write.format("delta").mode("append").save(path)  # fails if schema doesn't match

# Evolution: new columns added to table schema automatically
df.write.format("delta").option("mergeSchema","true").mode("append").save(path)
\`\`\`

**Handling nulls for new columns:**
When a column is added, historical rows get \`null\`. Downstream code must handle nulls:
\`\`\`python
df.withColumn('new_field', coalesce(col('new_field'), lit('default')))
\`\`\`

**Nested structs:**
\`\`\`python
df.select(col("metadata.source"), col("metadata.version"))   # dot notation
from pyspark.sql.functions import from_json
schema = StructType([StructField("source", StringType()), ...])
df.withColumn("parsed", from_json(col("json_string"), schema))
\`\`\`

**Schema registry pattern:** for Kafka/JSON streams, maintain a central schema registry (Confluent or custom). Validate incoming schema against expected schema before processing.`,
  pros:[
    "Delta mergeSchema is atomic — partial schema changes can't leave the table in an inconsistent state",
    "Schema enforcement catches upstream issues before they corrupt Gold tables"
  ],
  cons:[
    "mergeSchema reads all file footers to compute the union — slow for tables with many files",
    "Adding columns is easy; removing or renaming requires ALTER COLUMN (Delta 2.0+) or full rewrite"
  ],
  useCase:
`API adds a \`sentiment_score\` field to ticket events in month 4. \`mergeSchema=True\` allows the Silver pipeline to accept both old (no sentiment) and new (with sentiment) Bronze records. Old records show \`null\` for sentiment — handled downstream with \`coalesce(col('sentiment_score'), lit(0.5))\`.`,
  alts:[
    "How do you handle schema evolution in PySpark?",
    "What is the difference between schema enforcement and schema evolution in Delta Lake?",
    "How do you read nested JSON in PySpark?"
  ]
},

"databricks-pyspark-pandas-18": {
  answer:
`**Regular Python UDF:** row-by-row, Python serialization overhead, Catalyst black box.
\`\`\`python
from pyspark.sql.functions import udf
from pyspark.sql.types import StringType

@udf(StringType())
def classify(hours):
    return 'P1' if hours and hours < 1 else 'P2' if hours and hours < 4 else 'P3'

df.withColumn('class', classify(col('hours')))
# Cost: JVM→Python→JVM per row. Catalyst can't optimize.
\`\`\`

**Pandas UDF (vectorized) — preferred when UDF is unavoidable:**
\`\`\`python
from pyspark.sql.functions import pandas_udf
import pandas as pd

@pandas_udf("string")
def classify_vec(hours: pd.Series) -> pd.Series:
    return pd.cut(hours, bins=[-1,1,4,float('inf')], labels=['P1','P2','P3']).astype(str)

df.withColumn('class', classify_vec(col('hours')))
# Data sent as Arrow batches — 10-30x faster than scalar UDF
\`\`\`

**Built-in functions (always fastest):**
\`\`\`python
from pyspark.sql.functions import when, col
df.withColumn('class', when(col('hours')<1,'P1').when(col('hours')<4,'P2').otherwise('P3'))
# Runs in JVM, Catalyst-optimized, code-generated — 100-1000x faster than Python UDF
\`\`\`

**Decision tree:**
1. Built-in function exists? → Use it (always)
2. Logic is complex but operates on one column? → Pandas UDF
3. External API/ML model call? → Pandas UDF with batch processing
4. Must use scalar UDF? → Last resort, be aware of performance cost`,
  pros:[
    "Pandas UDFs use Apache Arrow for zero-copy batch transfer — order of magnitude faster than scalar UDFs",
    "Built-in functions remain inside Catalyst — predicate pushdown and code generation apply"
  ],
  cons:[
    "Python UDFs disable Catalyst entirely for that column — surrounding operations can't be pushed through the UDF",
    "Pandas UDFs require Arrow to be installed and add memory overhead for the batch size"
  ],
  useCase:
`Priority classification UDF processing 50M rows: scalar UDF took 45 min. Replaced with \`when().when().otherwise()\` built-in: 2 min. Where a custom NLP function was unavoidable, Pandas UDF with batch_size=10000 reduced the 45 min UDF pipeline from 6 hours to 25 minutes.`,
  alts:[
    "What is the performance difference between a Python UDF and a Pandas UDF in PySpark?",
    "When should I use a built-in function instead of a UDF in Spark?",
    "How do you write a vectorized Pandas UDF in PySpark?"
  ]
},

"databricks-pyspark-pandas-19": {
  answer:
`**Databricks** is a cloud-based unified analytics platform built on Apache Spark by the Spark creators (Databricks was founded by the original Spark team at UC Berkeley).

**What Databricks adds over vanilla Spark:**

| Component | Vanilla Spark | Databricks |
|---|---|---|
| Runtime | OSS Spark | Databricks Runtime (DBR) — optimized Spark build |
| Engine | JVM SQL | **Photon** — C++ vectorized engine (2-8x SQL speedup) |
| Storage layer | Parquet/ORC | **Delta Lake** — ACID, time travel, schema enforcement |
| Governance | None | **Unity Catalog** — unified ACLs, lineage, data discovery |
| Notebooks | External (Jupyter) | Built-in collaborative multi-language notebooks |
| Clusters | Self-managed | Auto-scaling, auto-termination, managed by Databricks |
| Orchestration | External (Airflow) | **Databricks Workflows** — built-in job orchestration |
| ML | MLlib separately | **MLflow** integrated, Feature Store, Model Serving |

**Photon engine:** C++ vectorized columnar execution. Drop-in replacement for Spark SQL JVM engine — same API, faster for SQL and Delta reads. Enabled by default on Databricks Runtime 9.1+.

**Delta Lake:** open-source; ACID on cloud storage via transaction log. Default storage format in Databricks.

**Unity Catalog:** three-level namespace (catalog.schema.table), column masking, row filters, lineage tracking, audit logs.`,
  pros:[
    "Managed infrastructure eliminates cluster management, version updates, and security patching",
    "Photon + Delta Lake provide significant performance gains over open-source equivalents without code changes"
  ],
  cons:[
    "Databricks-specific features (Photon, Unity Catalog) create vendor dependency",
    "Cost is significantly higher than self-managed EMR or Kubernetes-based Spark for teams with strong ops capability"
  ],
  useCase:
`Euron migrates from self-managed Spark on EMR to Databricks: ETL pipeline time drops 3x from Photon. Delta Lake MERGE replaces complex S3 file management. Unity Catalog replaces custom Lake Formation + Ranger policies. Total operational overhead: 60% reduction.`,
  alts:[
    "What is Databricks and how is it different from Apache Spark?",
    "What is the Photon engine in Databricks?",
    "What is the Unity Catalog in Databricks?"
  ]
},

"databricks-pyspark-pandas-20": {
  answer:
`**Delta Lake** adds enterprise data warehouse guarantees to cloud object storage (S3, ADLS, GCS).

**ACID transactions:** via the \`_delta_log/\` transaction log. Each write is an atomic JSON commit file. Concurrent writers use optimistic concurrency — conflict detection without a central lock.

**Time travel:**
\`\`\`sql
SELECT * FROM tickets VERSION AS OF 10;
SELECT * FROM tickets TIMESTAMP AS OF '2024-03-01';
RESTORE TABLE tickets TO VERSION AS OF 10;
\`\`\`

**Schema enforcement (default):** writing with wrong or extra columns raises an error.
**Schema evolution (opt-in):** \`option("mergeSchema","true")\` adds new columns to the schema.

**Z-ordering (data layout optimization):**
\`\`\`sql
OPTIMIZE tickets ZORDER BY (tenant_id, created_at);
\`\`\`
Co-locates related data in files → queries that filter on those columns skip more files (data skipping via min/max statistics in the transaction log).

**VACUUM (file cleanup):**
\`\`\`sql
VACUUM tickets RETAIN 168 HOURS;  -- delete files older than 7 days not in current state
\`\`\`
Without VACUUM, old Parquet files from time travel accumulate indefinitely.

**Auto-compaction:** merges small files automatically on write.
\`\`\`python
ALTER TABLE tickets SET TBLPROPERTIES ('delta.autoCompact.enabled' = 'true')
\`\`\``,
  pros:[
    "Time travel enables point-in-time recovery without maintaining separate backups",
    "Schema enforcement prevents upstream data quality issues from corrupting production tables"
  ],
  cons:[
    "VACUUM with short retention breaks streaming readers that are still reading old files",
    "High-frequency writes create many small files — auto-compaction or scheduled OPTIMIZE is needed"
  ],
  useCase:
`Bad priority mapping deployed for 2 hours writes incorrect data to Delta. Fix: \`RESTORE TABLE tickets TO VERSION AS OF {version_before_bad_deploy}\`. Recovery in 3 minutes vs 4-hour re-ingest. Delta's transaction log identifies the exact version where the bad data started.`,
  alts:[
    "What is Delta Lake and what does it add to a data lake?",
    "How does Delta Lake time travel work?",
    "What is Z-ordering in Delta Lake?"
  ]
},

"databricks-pyspark-pandas-21": {
  answer:
`**Unity Catalog (UC)** is Databricks' unified governance layer for data and AI assets across all workspaces in a Databricks account.

**Three-level namespace:**
\`\`\`sql
catalog.schema.table
-- e.g.: euron_prod.tickets.silver_tickets
\`\`\`
Before UC: each workspace had an isolated Hive metastore — no sharing, no lineage, inconsistent ACLs.

**Fine-grained access control:**
\`\`\`sql
-- Column masking:
CREATE FUNCTION mask_email(email STRING) RETURNS STRING
  RETURN CASE WHEN IS_ACCOUNT_GROUP_MEMBER('pii_readers') THEN email ELSE '***' END;
ALTER TABLE customers ALTER COLUMN email SET MASK mask_email;

-- Row filtering:
CREATE FUNCTION tenant_filter(tenant_id STRING) RETURNS BOOLEAN
  RETURN IS_ACCOUNT_GROUP_MEMBER('admin') OR tenant_id = CURRENT_USER();
ALTER TABLE tickets ADD ROW FILTER tenant_filter ON (tenant_id);
\`\`\`

**Data lineage:** UC automatically tracks column-level lineage — which upstream tables/columns produced each downstream column. Critical for GDPR impact analysis ("which tables contain data for customer X?").

**External locations:** UC manages cloud storage access (S3/ADLS) — all storage access goes through UC with proper credentials and audit logging.

**Metastore hierarchy:**
\`\`\`
Account → Metastore (one per region) → Workspaces → Catalogs → Schemas → Tables
\`\`\``,
  pros:[
    "Row filters and column masks are transparent to consumers — same query, different users see different data",
    "Automatic lineage is invaluable for compliance audits — trace data from source to dashboard"
  ],
  cons:[
    "Migrating from legacy hive_metastore to UC requires table migration and access policy re-implementation",
    "UC is Databricks-specific — metadata and policies don't transfer to other platforms"
  ],
  useCase:
`Euron: 3,000 tenants, each must see only their own tickets. UC row filter on \`tenant_id = CURRENT_USER()\` enforces this across SQL, notebooks, and BI tools. Support engineers see customer emails; data scientists see masked emails. Audit log records every query that accessed PII columns.`,
  alts:[
    "What is Unity Catalog in Databricks?",
    "How do you implement row-level security in Databricks?",
    "What is the difference between Unity Catalog and the Hive metastore?"
  ]
},

"databricks-pyspark-pandas-22": {
  answer:
`Databricks provides three compute types with different scaling behaviors:

**All-purpose clusters:**
- Multi-user, persistent, interactive
- Auto-scaling: adds/removes workers based on job queue + idle time
- Auto-termination: configurable idle timeout (recommend 30 min)
- More expensive — pay for idle time between notebook executions

**Job clusters:**
- Ephemeral — created for a specific job run, terminated on completion
- Cheaper: no idle time; can use Spot instances (60-90% savings)
- Clean state per run — no shared mutable state from previous runs

**SQL Warehouses:**
- Auto-scale to zero when not in use (Serverless)
- Startup in <5 seconds (Serverless) vs 2-4 minutes (Classic)
- SQL-only — no Python/Scala

**Cluster policies (governance):**
\`\`\`json
{
  "autotermination_minutes": {"type": "fixed", "value": 30},
  "num_workers": {"type": "range", "maxValue": 10},
  "aws_attributes.availability": {"type": "fixed", "value": "SPOT_WITH_FALLBACK"}
}
\`\`\`

**Instance pools:** pre-allocated idle instances reduce job cluster startup from 4 min to 30-60 sec.

**Spot instances:**
\`\`\`json
{"first_on_demand": 1, "availability": "SPOT_WITH_FALLBACK"}
\`\`\`
First node (Driver) is on-demand for stability; workers are spot.`,
  pros:[
    "Job clusters with spot workers provide the best cost profile for scheduled ETL — only pay for execution time",
    "Cluster policies prevent individual users from spinning up oversized clusters"
  ],
  cons:[
    "Spot eviction during a job causes task retries — verify jobs are idempotent and retryable",
    "All-purpose clusters without auto-termination are the #1 cause of unexpected Databricks cost spikes"
  ],
  useCase:
`Euron production setup: data engineers use all-purpose clusters (auto-terminate at 20 min idle). Nightly ETL uses job clusters with spot instances (save 70%). Analytics team uses Serverless SQL Warehouse (scales to zero on weekends — no weekend cost). Cluster policies enforce these configs.`,
  alts:[
    "What is the difference between all-purpose clusters and job clusters in Databricks?",
    "How do you use spot instances in Databricks?",
    "What is a Databricks SQL Warehouse?"
  ]
},

"databricks-pyspark-pandas-23": {
  answer:
`**Databricks Workflows** is the built-in job orchestration system — the Databricks-native alternative to Airflow for Databricks-centric pipelines.

**Key concepts:**

**Jobs:** top-level units with a schedule, compute settings, and tasks.

**Tasks:** units of work within a job — can be notebooks, Python scripts, SQL, DLT pipelines, dbt runs, or other jobs.

**Dependencies:** tasks form a DAG:
\`\`\`yaml
tasks:
  - task_key: ingest
    notebook_task: { notebook_path: /pipelines/bronze }
  - task_key: transform
    depends_on: [{task_key: ingest}]
    notebook_task: { notebook_path: /pipelines/silver }
  - task_key: gold_and_ml        # runs in parallel after transform
    depends_on: [{task_key: transform}]
    python_task: { python_file: /src/gold_compute.py }
\`\`\`

**Retry and alerting:**
\`\`\`json
{
  "max_retries": 3,
  "retry_on_timeout": true,
  "timeout_seconds": 3600,
  "email_notifications": {
    "on_failure": ["data-team@euron.io"],
    "on_success": [],
    "on_start": []
  }
}
\`\`\`

**Parameters to notebooks:**
\`\`\`python
dbutils.widgets.get("run_date")  # notebook reads runtime param
\`\`\`

**Limitations vs Airflow:** can't orchestrate non-Databricks systems, limited conditional branching, no sensor operators for external triggers.`,
  pros:[
    "No separate orchestration cluster to manage — Workflows is fully managed by Databricks",
    "Task-level retry configuration handles transient failures without re-running successful tasks"
  ],
  cons:[
    "Cross-system orchestration (Databricks + Postgres + S3 sync + external API) needs Airflow",
    "Complex if/else branching based on task output isn't natively supported"
  ],
  useCase:
`Euron's nightly pipeline: ingest → [transform, validate] in parallel → gold_aggregate (waits for both) → [report_refresh, ml_prediction] in parallel. Each task has a 3-retry policy. Failure sends a PagerDuty alert via webhook. Total wall time: 35 min (vs 90 min sequential).`,
  alts:[
    "What is Databricks Workflows and when would I use it over Airflow?",
    "How do you create a multi-task job in Databricks?",
    "How do you pass parameters to a Databricks notebook at runtime?"
  ]
},

"databricks-pyspark-pandas-24": {
  answer:
`**Medallion architecture** organizes data lake tables into quality tiers, with data flowing Bronze → Silver → Gold.

**Bronze (raw / landed):**
- Ingest data exactly as received — no business logic, no schema changes
- Append-only; preserves original state for debugging and reprocessing
- Add metadata: \`_ingest_timestamp\`, \`_source_file\`, \`_batch_id\`

**Silver (refined / conformed):**
- Clean, deduplicate, validate, join with reference data
- Enforce types; handle nulls per business rules
- Data quality expectations enforced here (DLT or custom checks)
- Schema matches business concepts — one row per business entity

**Gold (business / aggregated):**
- Aggregated, denormalized tables optimized for consumption
- One table per business domain or KPI report
- Read by BI tools, analysts, ML models, APIs

**When to break the pattern:**
- Simple reference data (country codes) → ingest directly to Silver (Bronze adds no value)
- Very large real-time feeds → Streaming Silver directly, skip Bronze if replay isn't needed
- Report-only aggregations → add Gold **views** instead of materialized tables (reduce storage)
- ML features → Feature Store instead of Gold table (Feature Store adds training/serving consistency)

**Data quality at each layer:**
- Bronze: existence check only (is it there?)
- Silver: validity rules (format, range, referential integrity)
- Gold: business rule assertions (metrics within expected range)`,
  pros:[
    "Bronze preservation enables reprocessing when business logic changes — without re-ingesting from source",
    "Clear layer boundaries make debugging straightforward: find where the data diverges"
  ],
  cons:[
    "3× storage duplication (same data in Bronze, Silver, Gold) increases cost",
    "Pipeline depth means more failure points — each layer must be monitored independently"
  ],
  useCase:
`Euron: Bronze stores raw API events (append-only, exactly as received). Silver deduplicates events, parses timestamps, joins with tenant/agent reference data. Gold \`agent_sla_daily\` aggregates one row per agent per day — powers the admin analytics dashboard and the weekly management report.`,
  alts:[
    "What is the Medallion architecture?",
    "What is the difference between Bronze, Silver, and Gold tables?",
    "When would you skip a layer in the Medallion architecture?"
  ]
},

"databricks-pyspark-pandas-25": {
  answer:
`**Photon** is Databricks' C++ vectorized query execution engine — a drop-in replacement for the JVM-based Spark SQL engine on Databricks clusters.

**How it works:**
- Processes data in columnar Arrow-format batches using SIMD (Single Instruction, Multiple Data) CPU instructions
- Generates native C++ code instead of JVM bytecode — bypasses GC overhead
- Integrated with Delta Lake Parquet reader for end-to-end native execution
- Enabled automatically on Photon-enabled cluster runtimes and all SQL Warehouses

**Operations with significant speedup:**
- SQL aggregations (SUM, COUNT, AVG, GROUP BY)
- Delta Lake / Parquet reads (columnar scan, predicate pushdown)
- Sort-merge and hash joins
- Window functions
- Built-in string and date operations
- Parquet/Delta writes

**Operations that fall back to JVM Spark (no speedup):**
- Python UDFs (always require Python serialization)
- Scala UDFs
- Complex custom aggregations not in built-in function catalog
- RDD operations
- MLlib training operations

**Typical speedups:**
- SQL aggregations on Delta: 3-8×
- Wide table scan with column pruning: 4-10×
- Sort-merge join on large tables: 2-4×
- Python UDFs: 0× (unchanged)

**Cost note:** Photon clusters cost more DBUs per hour but run faster — net cost often similar or lower.`,
  pros:[
    "Photon provides speedup with zero code changes — just enable the right cluster runtime",
    "Photon is most effective exactly where Spark is weakest: high-throughput columnar SQL"
  ],
  cons:[
    "Python UDFs don't benefit — this is the primary reason to replace UDFs with built-in functions",
    "Photon is Databricks-exclusive — workflows built around Photon performance won't replicate on open-source Spark"
  ],
  useCase:
`Migration from Standard to Photon runtime: SLA aggregation query reading 3TB Delta table dropped from 18 minutes to 2 minutes. No code changes. The query is pure SQL aggregations on columnar Delta data — Photon's ideal workload.`,
  alts:[
    "What is Photon in Databricks?",
    "Which operations benefit from the Photon engine?",
    "Why doesn't Photon speed up Python UDFs?"
  ]
},

"databricks-pyspark-pandas-26": {
  answer:
`CI/CD for Databricks requires source control for notebooks, automated testing, environment promotion, and deployment automation.

**Source control — Repos:**
All notebooks live in Repos (Git-backed). Changes via PR only — no direct edits to production workspace.

**Asset Bundles (recommended):**
\`\`\`yaml
# databricks.yml
bundle:
  name: euron_pipeline
  environments:
    dev: { workspace: { host: https://adb-dev.databricks.net } }
    prod: { workspace: { host: https://adb-prod.databricks.net } }
resources:
  jobs:
    nightly_etl:
      name: "Nightly ETL"
      tasks:
        - task_key: ingest
          notebook_task: { notebook_path: /Repos/main/notebooks/bronze }
\`\`\`

\`\`\`bash
databricks bundle deploy --target dev   # deploy to dev
databricks bundle run --target dev      # test in dev
databricks bundle deploy --target prod  # promote to prod
\`\`\`

**Testing pipeline:**
\`\`\`yaml
# .github/workflows/ci.yml
on: [pull_request]
jobs:
  test:
    steps:
      - run: pip install pyspark pytest chispa
      - run: pytest tests/                      # unit tests (local SparkSession)
      - run: databricks bundle validate          # validate bundle config
  deploy-dev:
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - run: databricks bundle deploy --target dev
      - run: databricks bundle run --target dev nightly_etl   # integration test
\`\`\`

**Testing notebooks:** extract business logic to Python functions in \`src/\`. Test with local SparkSession + \`assertDataFrameEqual\`.`,
  pros:[
    "Asset Bundles version-control all Databricks resources (jobs, permissions, clusters) as code — Infrastructure as Code for Databricks",
    "Environment promotion is a single CLI command — no manual UI recreation in prod"
  ],
  cons:[
    "Notebook unit testing without a cluster requires Databricks Connect setup — adds CI complexity",
    "Asset Bundles require Databricks CLI 0.200+ — teams on older tooling need migration"
  ],
  useCase:
`Euron Databricks CI/CD: PR → GitHub Actions unit tests (pytest, local Spark) → \`bundle validate\` → merge to main → auto-deploy to dev → smoke test → manual approval → \`bundle deploy --target prod\`. No manual clicks in production. Deployment history tracked in Git.`,
  alts:[
    "How do you implement CI/CD for Databricks?",
    "What are Databricks Asset Bundles?",
    "How do you test Databricks notebooks in CI?"
  ]
},

"databricks-pyspark-pandas-27": {
  answer:
`**MLflow** is the open-source ML lifecycle platform, deeply integrated into Databricks. It covers tracking, model registry, and serving.

**Experiment tracking:**
\`\`\`python
import mlflow
mlflow.autolog()  # auto-capture params/metrics for sklearn, XGBoost, PyTorch, etc.

with mlflow.start_run(run_name="priority_v2"):
    mlflow.log_param("max_depth", 6)
    model = XGBClassifier(max_depth=6).fit(X_train, y_train)
    mlflow.log_metric("auc", roc_auc_score(y_val, model.predict_proba(X_val)[:,1]))
    mlflow.xgboost.log_model(model, "model")
\`\`\`

**Model Registry:**
\`\`\`python
mlflow.register_model(f"runs:/{run_id}/model", "ticket_priority_classifier")
# Lifecycle: None → Staging → Production → Archived
client.transition_model_version_stage("ticket_priority_classifier", version=3, stage="Production")
\`\`\`

**Feature Store:**
\`\`\`python
from databricks.feature_store import FeatureStoreClient
fs = FeatureStoreClient()
training_set = fs.create_training_set(df, feature_lookups=[
    FeatureLookup(table_name="euron_prod.ml.agent_features", lookup_key="agent_id")
], label="priority")
fs.log_model(model, "priority_model", flavor=mlflow.sklearn, training_set=training_set)
\`\`\`

**Model Serving:** deploy a registered model as a REST endpoint. Real-time inference via HTTP. Auto-scales (serverless) or cluster-backed. A/B traffic splitting between versions.`,
  pros:[
    "MLflow autolog with one line captures all framework hyperparameters and metrics — minimal boilerplate",
    "Feature Store eliminates training/serving skew — one definition, used in both training and inference"
  ],
  cons:[
    "Model Serving (serverless) has cold start latency — not suitable for sub-100ms SLA endpoints",
    "MLflow experiment storage is Databricks-proprietary at scale — migration requires artifact export"
  ],
  useCase:
`Ticket priority model: trained weekly, tracked in MLflow (AUC, F1, feature importance). Best run registered to Model Registry. Data science lead promotes version to Production after evaluation. Serving endpoint called by ticket ingestion API for real-time priority assignment. Feature Store ensures same agent features used in training and serving.`,
  alts:[
    "How does MLflow integrate with Databricks?",
    "What is the Databricks Model Registry?",
    "What is the Databricks Feature Store and why is it useful?"
  ]
},

"databricks-pyspark-pandas-28": {
  answer:
`Databricks costs consist of cloud compute (VM cost) + DBUs (Databricks Units, billed per instance-hour by cluster type).

**Top cost drivers and fixes:**

**1. Idle all-purpose clusters (biggest waste):**
\`\`\`python
# Set auto-termination on all all-purpose clusters
# Cluster policy: {"autotermination_minutes": {"type": "fixed", "value": 30}}
databricks clusters list --output JSON | jq '.clusters[] | select(.autotermination_minutes == null)'
\`\`\`

**2. Spot instances for job clusters:**
\`\`\`json
{"first_on_demand": 1, "availability": "SPOT_WITH_FALLBACK"}
\`\`\`
60-90% savings on worker nodes. Driver stays on-demand for stability.

**3. Right-size clusters:**
- Don't allocate 10-node cluster for a 1GB daily job
- Use cluster policies to cap max workers
- Monitor CPU utilization in Ganglia — if < 30%, cluster is oversized

**4. Photon for SQL workloads:**
Higher DBU rate but faster execution — often cheaper net cost for SQL-heavy workloads.

**5. Serverless SQL Warehouse for analytics:**
Pay per second consumed, scale to zero — no cost on weekends.

**6. DBU tracking and budgets:**
\`\`\`
Account Console → Cost Analysis → filter by workspace, cluster tag
Set budget alerts at 80% and 100% of monthly budget
\`\`\`

**7. Cluster policies for governance:**
\`\`\`json
{
  "num_workers": {"type": "range", "maxValue": 8},
  "node_type_id": {"type": "allowlist", "values": ["Standard_D4s_v3"]}
}
\`\`\``,
  pros:[
    "Auto-termination enforcement via cluster policies is the fastest win — often cuts costs 40% immediately",
    "Serverless SQL Warehouse scaling to zero eliminates the wasted weekend compute cost"
  ],
  cons:[
    "Spot instances can be preempted mid-job — verify idempotent writes and retryable tasks before enabling",
    "DBU rate varies by cluster type — compare total cost (DBU × rate × hours) not just VM cost"
  ],
  useCase:
`Databricks bill increased 3× in 2 months: audit found 3 all-purpose clusters running 24/7 with no auto-termination. Enabling auto-terminate (30 min) + spot workers for job clusters + Serverless SQL Warehouse for analytics cut the bill by 65% with no impact to pipeline SLAs.`,
  alts:[
    "How do you reduce Databricks costs?",
    "What is the most impactful way to lower Databricks spend?",
    "How do you use cluster policies to control Databricks costs?"
  ]
},

"databricks-pyspark-pandas-29": {
  answer:
`**Delta Live Tables (DLT)** is Databricks' declarative framework for building managed data pipelines. You declare the tables; DLT manages orchestration, checkpointing, and error handling.

\`\`\`python
import dlt
from pyspark.sql.functions import col

@dlt.table(comment="Raw ticket events")
def bronze_tickets():
    return spark.readStream.format("cloudFiles") \
        .option("cloudFiles.format", "json") \
        .load("s3://raw/ticket-events/")

@dlt.table
@dlt.expect_or_drop("valid_ticket_id", "ticket_id IS NOT NULL")
@dlt.expect("valid_status", "status IN ('open','pending','resolved','closed')")
def silver_tickets():
    return dlt.read_stream("bronze_tickets").filter(col("ticket_id").isNotNull())

@dlt.table
def gold_agent_sla():
    return dlt.read("silver_tickets").groupBy("agent_id","date").agg(...)
\`\`\`

**Key concepts:**

**Expectations (data quality):**
- \`expect\`: warn only — data passes, metric recorded
- \`expect_or_drop\`: remove violating rows
- \`expect_or_fail\`: stop the pipeline if violated

**Streaming tables** (\`readStream\`): continuously append new records from source.
**Materialized views** (\`read\`): auto-refreshed on upstream changes.

**CDC with \`apply_changes\`:**
\`\`\`python
dlt.apply_changes(target="silver_tickets", source="cdc_stream",
    keys=["ticket_id"], sequence_by="updated_at",
    apply_as_deletes=expr("op = 'DELETE'"))
\`\`\`
Implements SCD Type 1 (overwrite) or Type 2 (history).`,
  pros:[
    "Expectations provide built-in data quality monitoring with metrics tracked in the DLT event log",
    "DLT handles exactly-once semantics, checkpointing, and retries automatically"
  ],
  cons:[
    "DLT abstracts away cluster control — fine-tuning Spark configs is harder than plain Spark jobs",
    "Debugging DLT pipeline failures requires reading event logs rather than direct exception stack traces"
  ],
  useCase:
`Euron's ingestion pipeline in DLT: Bronze (Auto Loader from S3) → Silver (15 expectations, bad records quarantined) → Gold (SLA aggregations, auto-refreshed). Pipeline failures alert via webhook. Data engineers monitor expectation pass rates on the DLT pipeline dashboard.`,
  alts:[
    "What is Delta Live Tables (DLT) in Databricks?",
    "What are DLT expectations and what actions can they take?",
    "How does apply_changes work in Delta Live Tables?"
  ]
},

"databricks-pyspark-pandas-30": {
  answer:
`Data quality enforcement should happen at multiple layers with different enforcement levels.

**Layer 1 — DLT Expectations (declarative, automatic):**
\`\`\`python
@dlt.expect_or_drop("not_null_ticket_id", "ticket_id IS NOT NULL")
@dlt.expect_or_quarantine("valid_priority", "priority IN ('P1','P2','P3','P4')")
@dlt.expect_or_fail("no_negative_sla", "resolution_hours >= 0")
\`\`\`

**Layer 2 — Great Expectations (standalone, flexible):**
\`\`\`python
import great_expectations as gx
context = gx.get_context()
batch = context.sources.pandas_default.read_dataframe(df)
expectation_suite = context.create_expectation_suite("tickets")
expectation_suite.add_expectation(gx.expectations.ExpectColumnValuesToNotBeNull(column="ticket_id"))
results = context.run_checkpoint(checkpoint_name="tickets_checkpoint", batch_request=batch)
\`\`\`

**Layer 3 — Custom PySpark assertions:**
\`\`\`python
def validate_silver(df):
    null_ids = df.filter(col("ticket_id").isNull()).count()
    if null_ids > 0:
        raise ValueError(f"Found {null_ids} null ticket_ids")
    invalid_status = df.filter(~col("status").isin(['open','pending','resolved','closed'])).count()
    assert invalid_status == 0, f"Invalid status values: {invalid_status}"
\`\`\`

**Quarantine pattern:**
\`\`\`python
valid = df.filter(is_valid(df))
invalid = df.subtract(valid).withColumn("quarantine_reason", lit("validation_failed"))
invalid.write.mode("append").save("s3://quarantine/tickets/")
\`\`\`

**Monitoring:** daily job reads quarantine table; alert if quarantine rate > 1%.`,
  pros:[
    "DLT expectations provide the lowest-friction approach — co-located with pipeline, metrics automatic",
    "Quarantine pattern preserves bad records for investigation instead of silently dropping them"
  ],
  cons:[
    "Custom PySpark assert fails the entire job — DLT expect_or_quarantine is more graceful for production",
    "Great Expectations has significant initial setup complexity — simpler to start with DLT expectations"
  ],
  useCase:
`Silver pipeline enforces 10 DLT expectations. Bad records (< 0.5% of volume) go to quarantine table. Data engineering reviews quarantine weekly — found a recurring source system bug (null agent_id on weekend tickets). Fixed at source; quarantine empties. Quality monitoring caught an upstream issue before it reached Gold.`,
  alts:[
    "How do you implement data quality checks in Databricks?",
    "What is the quarantine pattern in data engineering?",
    "How do DLT expectations compare to Great Expectations?"
  ]
},

"databricks-pyspark-pandas-31": {
  answer:
`**When to use pandas vs PySpark** depends on data size, team context, and operational requirements.

| Factor | Use pandas | Use PySpark |
|---|---|---|
| Data size | < 10-50GB (fits in RAM) | > 50GB or growing |
| Processing model | single machine | distributed cluster |
| Latency | milliseconds | seconds-minutes (startup) |
| API familiarity | most data scientists | data engineers |
| Iteration speed | fast (interactive) | slower (job startup) |
| Libraries | full ML ecosystem | limited (MLlib, MLflow) |

**Transition patterns:**

**toPandas() — PySpark → pandas (collect to driver):**
\`\`\`python
# PySpark processing → pandas for final ML/viz
summary_df = spark_df.groupBy('agent_id').agg(...)   # distributed aggregation
pandas_df = summary_df.toPandas()                    # collect small result to driver
model.fit(pandas_df[features], pandas_df[label])
\`\`\`

**createDataFrame() — pandas → PySpark:**
\`\`\`python
spark_df = spark.createDataFrame(pandas_df)  # small pandas lookup → join with large PySpark DF
\`\`\`

**Pandas API on Spark (pandas-on-Spark / Koalas):**
\`\`\`python
import pyspark.pandas as ps           # drop-in pandas API on Spark engine
psdf = ps.read_parquet("s3://data/") # familiar API, distributed execution
psdf.groupby('agent_id').mean()       # same as pandas.groupby
\`\`\`
90% pandas API compatible. Good for migrating pandas code to distributed — run same code on any scale.`,
  pros:[
    "pandas-on-Spark lets data scientists use familiar pandas API while running on distributed cluster",
    "toPandas() pattern lets you use the full Python ML ecosystem (scikit-learn, matplotlib) on Spark aggregation results"
  ],
  cons:[
    "pandas-on-Spark has performance overhead vs native PySpark — avoid for performance-critical pipelines",
    "toPandas() on a large DataFrame brings all data to the Driver — OOM risk; only use on already-aggregated small results"
  ],
  useCase:
`Euron's analytics pipeline: PySpark aggregates 500GB of ticket events to a 10K-row agent summary (distributed). \`summary.toPandas()\` collects it to the driver. scikit-learn trains a clustering model on the 10K rows (pandas). Results written back via \`spark.createDataFrame(cluster_assignments)\`.`,
  alts:[
    "When should I use pandas versus PySpark?",
    "What is pandas API on Spark (Koalas)?",
    "How do you transition from pandas to PySpark?"
  ]
},

"databricks-pyspark-pandas-32": {
  answer:
`Converting pandas code to PySpark requires understanding the key conceptual differences.

**No row index in PySpark:**
\`\`\`python
# pandas:
df.iloc[0]                    # positional row access
df.reset_index()              # index → column

# PySpark: no index concept
df.limit(1).collect()[0]      # first row (expensive — triggers job)
df.withColumn('row_num', monotonically_increasing_id())  # synthetic ID
\`\`\`

**Immutable DataFrames:**
\`\`\`python
# pandas: in-place mutation
df['new_col'] = df['a'] + df['b']     # mutates df

# PySpark: always returns a new DataFrame
df = df.withColumn('new_col', col('a') + col('b'))  # must reassign
\`\`\`

**Lazy evaluation (most common gotcha):**
\`\`\`python
# pandas: immediate — prints result
df.groupby('agent').count()         # executes immediately

# PySpark: nothing happens until action
df.groupBy('agent').count()         # builds DAG only
df.groupBy('agent').count().show()  # triggers execution
\`\`\`

**Column references:**
\`\`\`python
# pandas: string column names work
df['status']                        # ok
df[df['status'] == 'open']          # ok

# PySpark: use col() or df['col']
from pyspark.sql.functions import col
df.filter(col('status') == 'open')  # correct
df.filter("status = 'open'")        # SQL string also works
\`\`\`

**No apply() equivalent — use when/otherwise or Pandas UDFs:**
\`\`\`python
# pandas:
df['class'] = df['hours'].apply(lambda h: 'P1' if h < 1 else 'P2')
# PySpark:
df = df.withColumn('class', when(col('hours')<1,'P1').otherwise('P2'))
\`\`\``,
  pros:[
    "when/otherwise is more readable than nested lambdas and runs in JVM — always use it over UDFs",
    "SQL string expressions in filter() and selectExpr() let you port pandas query() strings directly"
  ],
  cons:[
    "Forgetting to reassign after withColumn is a common bug — DataFrame is immutable",
    "Pandas code that uses the index extensively is hard to port — PySpark has no equivalent"
  ],
  useCase:
`Data scientist's 50-line pandas notebook ported to PySpark: 3 main changes — (1) df['col'] = x → df = df.withColumn(...), (2) apply(lambda) → when().otherwise(), (3) df.groupby().apply() → groupBy().agg(). Code runs on 1TB instead of 50GB without RAM overflow.`,
  alts:[
    "How do you convert pandas code to PySpark?",
    "What are the key differences between pandas and PySpark API?",
    "Why doesn't PySpark have a row index like pandas?"
  ]
},

"databricks-pyspark-pandas-33": {
  answer:
`**Structured Streaming** treats a stream as an unbounded table, using the same DataFrame API as batch.

**Triggers:**
\`\`\`python
.trigger(processingTime='1 minute')   # micro-batch every 1 min
.trigger(once=True)                   # process all available then stop (backfill)
.trigger(availableNow=True)           # all available, one batch, then stop (Spark 3.3+)
.trigger(continuous='1 second')       # experimental low-latency continuous mode
\`\`\`

**Output modes:**
- **Append:** only new rows output. Works for stateless transformations and watermarked aggregations.
- **Update:** only changed rows output. Works for stateful aggregations (intermediate results update).
- **Complete:** full result table every trigger. Only for small total aggregations.

**Watermarks (handling late data):**
\`\`\`python
df.withWatermark("event_time", "10 minutes") \  # tolerate up to 10 min late arrival
  .groupBy(window("event_time", "5 minutes"), "agent_id") \
  .count()
\`\`\`
Windows finalize when \`max_event_time - 10 min > window_end\`. State is cleared after finalization.

**Exactly-once:** Spark writes offset checkpoints atomically and uses idempotent sinks (Delta Lake, Kafka transactions). On restart, processing resumes from the last committed offset.

\`\`\`python
df.writeStream \
  .format("delta") \
  .outputMode("append") \
  .option("checkpointLocation", "s3://checkpoints/stream/") \
  .toTable("silver_tickets")
\`\`\``,
  pros:[
    "Same DataFrame API for batch and streaming — one mental model, shared business logic",
    "Watermarks bound state size — essential for long-running jobs that can't accumulate unbounded state"
  ],
  cons:[
    "Append output mode delays results until watermark passes — adds latency equal to the watermark delay",
    "Complete mode requires the full aggregation in state memory — expensive for high-cardinality keys"
  ],
  useCase:
`Real-time ticket SLA monitoring: Kafka → Structured Streaming → \`withWatermark("event_time","5 minutes")\` → 1-minute tumbling window aggregation → \`Update\` mode → Delta Silver. SQL Warehouse queries Delta for the live SLA dashboard updating every 60 seconds.`,
  alts:[
    "What are the output modes in Spark Structured Streaming?",
    "What is a watermark in Spark Structured Streaming?",
    "How does exactly-once processing work in Spark Structured Streaming?"
  ]
},

"databricks-pyspark-pandas-34": {
  answer:
`**Spark UI** (port 4040, or Databricks Spark UI) is the primary debugging tool.

**Navigation for performance debugging:**

**Jobs tab:** find the slow job. Look at total duration.

**Stages tab:** find the slow stage. Key metrics: Duration, Input Size, Shuffle Read/Write bytes.

**Stage detail → Tasks:** sort by Duration. One task 100× slower → data skew. Large Input Size for one task → skewed partition.

**SQL tab:** for DataFrame/SQL jobs. Shows physical plan with timing per operator node. Look for:
- \`Exchange\` (shuffle) — note the bytes
- \`SortMergeJoin\` — can it be replaced with \`BroadcastHashJoin\`?
- \`Scan\` — check PushedFilters (should be non-empty for filtered reads)

**Event logs + History Server:**
\`\`\`python
spark.conf.set("spark.eventLog.enabled", "true")
spark.conf.set("spark.eventLog.dir", "s3://logs/spark-events/")
\`\`\`
Persists logs for post-mortem analysis of completed jobs.

**Key metrics to watch:**
- **GC Time > 20% of task duration** → heap pressure → add executor memory or switch to off-heap
- **Shuffle Write >> Shuffle Read** → data reduction by aggregation (good) or data explosion (bad)
- **1 task per stage** → insufficient partitions → repartition input
- **Failed tasks (retry count > 0)** → instability — check Executor logs for root cause`,
  pros:[
    "SQL tab's operator-level timing pinpoints which physical operation is slow without reading explain() text",
    "Event logs in S3 enable post-mortem analysis — don't lose debugging context when the job ends"
  ],
  cons:[
    "Live Spark UI is ephemeral — gone after job completes unless History Server is configured",
    "GC metrics in the UI are JVM GC only — Python UDF memory issues don't appear there"
  ],
  useCase:
`Stage 4 takes 3h; others take 5 min. Stage detail: one task with 150GB input vs others with 800MB. Root cause: 35% of rows have null agent_id, all hash to the same partition. Fix: handle nulls separately. Stage 4 drops from 3h to 8 min.`,
  alts:[
    "How do you use the Spark UI to debug performance?",
    "What does high GC time in the Spark UI mean?",
    "What should I look for in the Spark Stages tab?"
  ]
},

"databricks-pyspark-pandas-35": {
  answer:
`Security in Databricks covers identity, data access, network, secrets, and encryption.

**Table ACLs (Unity Catalog):**
\`\`\`sql
GRANT SELECT ON TABLE euron_prod.tickets.silver_tickets TO \`analytics-team\`;
GRANT MODIFY ON TABLE euron_prod.tickets.silver_tickets TO \`data-engineering\`;
REVOKE SELECT ON TABLE ... FROM ...;
\`\`\`

**Row/column level security:**
\`\`\`sql
-- Column masking for PII
ALTER TABLE customers ALTER COLUMN email SET MASK euron_prod.security.mask_email;
-- Row filter for tenant isolation
ALTER TABLE tickets ADD ROW FILTER euron_prod.security.tenant_filter ON (tenant_id);
\`\`\`

**Encryption:**
- Data at rest: cloud-provider encryption (S3-SSE, ADLS encryption) + optional Customer Managed Keys (CMK)
- Data in transit: TLS for all network communication (cluster → S3, cluster → driver)
- Shuffle encryption: \`spark.authenticate=true\`, \`spark.io.encryption.enabled=true\`

**Secrets management:**
\`\`\`python
# Never hardcode secrets — use Databricks Secrets
dbutils.secrets.get(scope="euron-prod", key="openai-api-key")
# Secrets are redacted in notebook output and Spark logs
\`\`\`

**Network isolation (VNet injection):**
Databricks clusters deployed into your VNet (Azure) or VPC (AWS). Private endpoints for S3/ADLS. No public IP. Traffic stays within your network boundary.

**IP allowlisting + Private Link:** restrict workspace access to corporate IPs. Private Link prevents traffic from traversing the public internet.`,
  pros:[
    "Databricks Secrets redacts values in notebook output and logs — prevents accidental secret exposure",
    "VNet injection + Private Link gives network-level isolation without application code changes"
  ],
  cons:[
    "VNet injection requires careful CIDR planning — Databricks requires specific subnet ranges",
    "Shuffle encryption adds CPU overhead (~5-10%) — evaluate trade-off for highly sensitive data"
  ],
  useCase:
`Euron's security posture: PII columns (email, phone) masked via UC column masks. Tenant isolation via row filters. Secrets stored in Databricks Secrets (not in notebooks). Clusters deployed in private subnet with no public IP. Workspace accessible only from corporate VPN IP range.`,
  alts:[
    "How do you secure data in Databricks?",
    "How do you use Databricks Secrets for credentials management?",
    "What is VNet injection in Databricks?"
  ]
},

"databricks-pyspark-pandas-36": {
  answer:
`Data pipeline quality goes beyond just "does it run?" — it covers **freshness**, **completeness**, **accuracy**, and **consistency**.

**Freshness (data latency SLA):**
\`\`\`python
# Alert if the latest record is older than expected
latest_ts = spark.sql("SELECT MAX(updated_at) FROM silver_tickets").collect()[0][0]
lag_hours = (datetime.now() - latest_ts).seconds / 3600
assert lag_hours < 2, f"Data freshness violation: {lag_hours:.1f}h lag (SLA: 2h)"
\`\`\`

**Completeness (row count validation):**
\`\`\`python
source_count = source_df.count()
target_count = target_df.count()
completeness = target_count / source_count
assert completeness >= 0.99, f"Completeness: {completeness:.1%} (threshold: 99%)"
\`\`\`

**Accuracy (business rule validation):**
\`\`\`python
breach_rate = df.filter(col('sla_breached')).count() / df.count()
assert 0 <= breach_rate <= 1, "breach_rate must be between 0 and 1"
\`\`\`

**Schema drift detection:**
\`\`\`python
from pyspark.sql import functions as F
current_schema = set(df.columns)
expected_schema = set(['ticket_id','status','priority','created_at'])
new_columns = current_schema - expected_schema
removed_columns = expected_schema - current_schema
if new_columns or removed_columns:
    alert(f"Schema drift: added={new_columns}, removed={removed_columns}")
\`\`\`

**Metrics to log per pipeline run:**
- Row count in vs row count out
- Null rates per column
- Duplicate key count
- Max/min/mean for numeric columns
- Schema fingerprint (hash of column names + types)`,
  pros:[
    "Freshness SLA checks are the fastest way to catch a failed pipeline before stakeholders notice",
    "Schema fingerprinting catches upstream changes before they cause downstream failures"
  ],
  cons:[
    "Row count checks don't catch quality issues — a complete but wrong dataset passes count validation",
    "Statistical validations (mean within range) require historical baselines which take time to establish"
  ],
  useCase:
`Euron's pipeline quality checks: (1) freshness alert if Silver table > 3h old, (2) row count within 95-105% of yesterday's count, (3) null rate < 0.1% on ticket_id/status, (4) schema fingerprint matches expected. Any check failure → PagerDuty alert before data reaches Gold/dashboard.`,
  alts:[
    "How do you measure data pipeline quality?",
    "What is data freshness SLA and how do you monitor it?",
    "How do you detect schema drift in a data pipeline?"
  ]
},

"databricks-pyspark-pandas-37": {
  answer:
`Long-term maintainability of Spark jobs requires discipline in dependencies, configuration, testing, and documentation.

**Dependency management:**
\`\`\`python
# requirements.txt — pin exact versions
pyspark==3.5.1
delta-spark==3.1.0
mlflow==2.14.1
# Use: pip install -r requirements.txt in cluster init script or %pip install
\`\`\`
Pin exact versions; upgrade in a branch with full test suite before merging.

**Config externalization:**
\`\`\`python
# Never hardcode: paths, thresholds, cluster sizes
config = {
    "input_path": os.environ["TICKET_INPUT_PATH"],
    "shuffle_partitions": int(os.environ.get("SHUFFLE_PARTITIONS", "200")),
    "sla_threshold_hours": float(os.environ.get("SLA_HOURS", "24"))
}
\`\`\`
Use Databricks widgets or Job parameters for runtime config.

**Library versioning — use init scripts or cluster libraries:**
\`\`\`bash
# cluster init script:
pip install my-company-utils==1.2.3
\`\`\`
Avoid installing libraries in notebook cells for production jobs.

**Testing strategy:**
- Unit tests: pure Python functions, local SparkSession (no cluster)
- Integration tests: run on dev cluster with sample data
- Regression tests: compare output to known-good golden dataset
- End-to-end tests: run full pipeline, validate output metrics

**Code organization:**
- Business logic in Python modules/packages (not notebooks)
- Notebooks for orchestration and exploration only
- Shared utilities in a company library published to a package registry`,
  pros:[
    "Externalized config allows the same code to run in dev/staging/prod without changes",
    "Library versioning via cluster init scripts prevents surprise upgrades when new packages are released"
  ],
  cons:[
    "Pinning exact versions requires active maintenance — outdated dependencies accumulate security debt",
    "Testing Spark jobs is slower than testing pure Python — build in time for integration test runs"
  ],
  useCase:
`Euron's pipeline maintenance: all config in environment variables, all business logic in \`src/euron_etl/\` package (installable via pip), notebooks only for orchestration. Version bumps go through PRs with \`pytest\` + Databricks integration test run. Dependency updates monthly via automated Renovate PRs.`,
  alts:[
    "How do you manage Spark job dependencies long-term?",
    "How do you test Spark jobs effectively?",
    "How do you externalize configuration for Databricks jobs?"
  ]
},

"databricks-pyspark-pandas-38": {
  answer:
`**SCENARIO: Spark job takes 4 hours for 500GB daily. Target: under 1 hour.**

**Step 1 — Profile (don't guess):**
Open Spark UI → find the slowest stage → check task duration distribution, shuffle bytes, GC time.

**Step 2 — Apply fixes in priority order:**

**File format (often 3-5× win):**
\`\`\`python
# CSV → Parquet: column pruning, predicate pushdown, 3-5x faster reads
df = spark.read.parquet("s3://tickets/")  # vs read.csv
\`\`\`

**Shuffle partition tuning:**
\`\`\`python
spark.conf.set("spark.sql.shuffle.partitions", str(totalCores * 2))
# Default 200 is too high for < 10GB, too low for > 1TB
\`\`\`

**Broadcast small tables:**
\`\`\`python
large_df.join(broadcast(lookup_df), 'agent_id')  # eliminates shuffle
\`\`\`

**Cache reused DataFrames:**
\`\`\`python
base_df.cache(); base_df.count()  # if used multiple times
\`\`\`

**AQE (auto-tuning):**
\`\`\`python
spark.conf.set("spark.sql.adaptive.enabled", "true")  # default in Spark 3.2+
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
\`\`\`

**Replace Python UDFs:**
\`\`\`python
# ✗ 10-100x slower: df.withColumn('x', my_udf(col('a')))
# ✓ Built-in: df.withColumn('x', when(col('a')<0,'low').otherwise('high'))
\`\`\`

**Cluster sizing (if underprovisioned):**
- Add workers until CPU > 80% during peak stages
- 4 cores per Executor is the sweet spot

**Expected result:** CSV→Parquet (3×) + broadcast join (3×) + UDF removal (5×) = 4h → 15-20 min.`,
  alts:[
    "How do you optimize a slow Spark job?",
    "What is the checklist for Spark performance tuning?",
    "In what order should I apply Spark optimizations?"
  ]
},

"databricks-pyspark-pandas-39": {
  answer:
`**SCENARIO: Pipeline producing duplicates after reprocessing. Design idempotent pipeline with Delta MERGE.**

**Root cause of duplicates:** re-running an append pipeline overwrites the same records again. Each run adds new copies.

**Fix — Delta MERGE (upsert) instead of append:**
\`\`\`python
from delta.tables import DeltaTable

target = DeltaTable.forName(spark, "euron_prod.tickets.silver_tickets")
source = spark.read.format("delta").table("bronze_tickets") \
    .filter(col("batch_id") == current_batch_id)  # only process this batch

target.alias("tgt").merge(
    source.alias("src"),
    "tgt.ticket_id = src.ticket_id"
).whenMatchedUpdate(
    condition="src.updated_at > tgt.updated_at",  # only update if newer
    set={"status": "src.status", "updated_at": "src.updated_at"}
).whenNotMatchedInsertAll().execute()
\`\`\`

**Idempotency via batch_id tracking:**
\`\`\`python
# Track which batches have been processed
processed = spark.sql("SELECT DISTINCT batch_id FROM silver_tickets_meta")
unprocessed = all_batches.subtract(processed)  # only run unprocessed batches
\`\`\`

**Streaming exactly-once:** Structured Streaming with Delta sink + checkpoint:
\`\`\`python
df.writeStream \
    .format("delta") \
    .option("checkpointLocation", "s3://checkpoints/silver/") \
    .toTable("silver_tickets")  # Delta + checkpoint = exactly-once
\`\`\`

**Key principle:** any pipeline step that can be re-run must produce the same result as the first run. MERGE on a primary key guarantees this — a duplicate input row updates the same target row to the same value.`,
  alts:[
    "How do you make a Spark pipeline idempotent?",
    "How does Delta Lake MERGE prevent duplicates during reprocessing?",
    "How do you implement exactly-once semantics in a batch pipeline?"
  ]
},

"databricks-pyspark-pandas-40": {
  answer:
`**SCENARIO: PySpark job OOM on 50-node cluster. Data is skewed.**

**Step 1 — Diagnose with Spark UI:**
Jobs → click the failed job → find the failed stage. Stage detail → Tasks → sort by Input Size. If one task shows 100GB while others show 500MB → **data skew** is the cause of OOM (one Executor must hold 100GB in memory).

**Check for skew root cause:**
\`\`\`python
# Find the distribution of the join/groupBy key
df.groupBy('agent_id').count().orderBy('count', ascending=False).show(10)
# If top key has 40% of rows → skew confirmed
\`\`\`

**Fix 1 — Enable AQE (easiest, Spark 3.0+):**
\`\`\`python
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes", "256mb")
spark.conf.set("spark.sql.adaptive.skewJoin.skewedPartitionFactor", "5")
\`\`\`
AQE detects partitions > 5× median size and splits them automatically.

**Fix 2 — Broadcast join (if smaller table):**
\`\`\`python
large_df.join(broadcast(small_lookup), 'agent_id')  # eliminates shuffle on large side
\`\`\`

**Fix 3 — Handle null keys separately:**
\`\`\`python
nulls = df.filter(col('agent_id').isNull())
non_nulls = df.filter(col('agent_id').isNotNull())
result = non_nulls.join(lookup, 'agent_id').union(nulls.withColumn('agent_name', lit('Unknown')))
\`\`\`

**Fix 4 — Salting for aggregations:**
\`\`\`python
df = df.withColumn('salt', (rand()*20).cast('int'))
df = df.withColumn('key_salt', concat(col('agent_id'), lit('_'), col('salt').cast('string')))
intermediate = df.groupBy('key_salt').agg(...)
final = intermediate.withColumn('agent_id', split('key_salt','_')[0]).groupBy('agent_id').agg(...)
\`\`\``,
  alts:[
    "How do you fix a PySpark OOM caused by data skew?",
    "How do you use AQE to fix skew in Spark?",
    "What is salting in Spark and when do you use it?"
  ]
},

"databricks-pyspark-pandas-41": {
  answer:
`**SCENARIO: Multiple teams, no cost attribution, no governance. Design multi-team Databricks setup.**

**Cost attribution:**

**1. Mandatory cluster tags via policy:**
\`\`\`json
{
  "custom_tags.team": {"type": "fixed", "value": "data-engineering"},
  "custom_tags.project": {"type": "allowlist", "values": ["etl","analytics","ml"]}
}
\`\`\`

**2. Cost analysis by tag:** Account Console → Cost Analysis → filter by tag.

**3. DBU budgets per workspace** with email alerts at 80%/100%.

**Data governance via Unity Catalog:**
\`\`\`
Account → Unity Catalog Metastore
  ├─ euron_prod.analytics.*    (analytics team)
  ├─ euron_prod.ml.*           (ML team)
  └─ euron_prod.raw.*          (data engineering)
\`\`\`
Each team owns their catalog — can't accidentally write to another team's tables.

**Workspace structure:**
\`\`\`
euron-dev workspace   → all teams (permissive, shared)
euron-prod workspace  → restricted (job clusters only, cluster policy enforced)
\`\`\`

**Per-team cluster policies:**
- ML team: can launch GPU clusters (g5.xlarge), max 4 workers
- Analytics team: can launch memory-optimized, max 8 workers, no GPU
- Data engineering: job clusters only in prod

**Access control:**
\`\`\`sql
GRANT USE CATALOG ON CATALOG euron_prod TO \`all-users\`;
GRANT ALL PRIVILEGES ON CATALOG euron_prod.ml TO \`ml-team\`;
GRANT SELECT ON CATALOG euron_prod.analytics TO \`analytics-team\`;
\`\`\``,
  alts:[
    "How do you set up Databricks for multiple teams with cost attribution?",
    "How do you enforce governance across teams in Databricks?",
    "What is the recommended workspace architecture for multiple teams in Databricks?"
  ]
},

"databricks-pyspark-pandas-42": {
  answer:
`**SCENARIO: Real-time dashboard needs data within 5 minutes. Design end-to-end streaming pipeline.**

**Architecture:**
\`\`\`
Mobile/Web Events → Kafka → Structured Streaming → Delta Silver → SQL Warehouse → Dashboard
(event time)        (broker)  (30s micro-batch)    (Delta table)  (1-min refresh)   (auto-refresh)
\`\`\`

**Streaming pipeline:**
\`\`\`python
from pyspark.sql.functions import from_json, window, col

# 1. Read from Kafka
kafka_df = spark.readStream.format("kafka") \
    .option("kafka.bootstrap.servers", "broker:9092") \
    .option("subscribe", "ticket-events") \
    .option("startingOffsets", "latest").load()

# 2. Parse and watermark
events = kafka_df.select(from_json(col("value").cast("string"), schema).alias("d")).select("d.*") \
    .withWatermark("event_time", "2 minutes")

# 3. Window aggregation
agg = events.groupBy(window("event_time", "1 minute"), "tenant_id") \
    .agg(count("ticket_id").alias("tickets_per_minute"), avg("priority_score").alias("avg_priority"))

# 4. Write to Delta (append mode — watermark finalizes windows)
agg.writeStream.format("delta").outputMode("append") \
    .trigger(processingTime="30 seconds") \
    .option("checkpointLocation", "s3://checkpoints/ticket-stream/") \
    .toTable("euron_prod.analytics.ticket_realtime")
\`\`\`

**End-to-end latency breakdown:**
- Kafka lag: < 1s
- Micro-batch: 30s trigger
- Watermark: 2 min (late data tolerance)
- SQL Warehouse refresh: 60s

**Total time event → dashboard: ~3-4 minutes**. Meets the 5-minute SLA.`,
  alts:[
    "How do you build a real-time data pipeline in Databricks?",
    "How do you stream from Kafka to Delta Lake in Databricks?",
    "What is the end-to-end latency for a Structured Streaming pipeline?"
  ]
},

"databricks-pyspark-pandas-43": {
  answer:
`**SCENARIO: pandas script crashes with MemoryError on 50GB CSV. Design migration to PySpark/Databricks.**

**Why it fails:** 50GB CSV → pandas in-memory → needs 3-5× memory (intermediate copies) = 150-250GB RAM required. A typical machine has 16-64GB.

**Migration path (progressive):**

**Option 1 — Fix in pandas first (chunked reading):**
\`\`\`python
result = []
for chunk in pd.read_csv('data.csv', chunksize=500_000,
    dtype={'status':'category','priority':'category'}):
    result.append(chunk.groupby('agent_id')['hours'].mean())
final = pd.concat(result).groupby(level=0).mean()
\`\`\`
Works if the aggregation fits in memory. Low migration cost.

**Option 2 — DuckDB (zero-copy, SQL on files):**
\`\`\`python
import duckdb
result = duckdb.execute("""
    SELECT agent_id, AVG(resolution_hours) as avg_hours
    FROM read_csv_auto('data.csv')
    WHERE status = 'open'
    GROUP BY agent_id
""").df()  # returns pandas DataFrame
\`\`\`
No cluster needed — processes 50GB with constant memory via streaming scans.

**Option 3 — Polars (in-process, fast):**
\`\`\`python
import polars as pl
result = pl.scan_csv('data.csv').filter(pl.col('status')=='open').groupby('agent_id').agg(pl.col('hours').mean()).collect()
\`\`\`

**Option 4 — PySpark/Databricks (for > 500GB or growth expected):**
\`\`\`python
df = spark.read.csv('s3://data/tickets/', header=True, inferSchema=True)
df.filter(col('status')=='open').groupBy('agent_id').agg(avg('hours')).write.parquet('s3://output/')
\`\`\`
Convert CSV to Parquet first (one-time) — future reads are 5-10× faster.`,
  alts:[
    "What do you do when pandas runs out of memory on a large file?",
    "How do you migrate a pandas pipeline to PySpark?",
    "What are the alternatives to pandas for large datasets?"
  ]
},

"databricks-pyspark-pandas-44": {
  answer:
`**SCENARIO: Delta table with 10,000 small files causing 10-minute read times. Diagnose and fix.**

**Diagnose:**
\`\`\`sql
DESCRIBE DETAIL euron_prod.tickets.silver_tickets;
-- Check: numFiles=10000, sizeInBytes=500GB → avgFileSize = 50MB (target is 128-256MB)

DESCRIBE HISTORY silver_tickets LIMIT 20;
-- Check operationName: many STREAMING UPDATE or APPEND every 30s → small file accumulation
\`\`\`

**Why small files are slow:** S3 LIST API calls, Parquet footer reads, task scheduling overhead — all per-file. 10,000 files = 10,000× the overhead of 100 files.

**Immediate fix — OPTIMIZE:**
\`\`\`sql
OPTIMIZE euron_prod.tickets.silver_tickets;               -- compact all small files
OPTIMIZE euron_prod.tickets.silver_tickets ZORDER BY (tenant_id, created_at);  -- + layout
VACUUM euron_prod.tickets.silver_tickets RETAIN 168 HOURS; -- clean old files after 7 days
\`\`\`

**Prevent recurrence — auto-compaction:**
\`\`\`python
ALTER TABLE euron_prod.tickets.silver_tickets SET TBLPROPERTIES (
  'delta.autoCompact.enabled' = 'true',
  'delta.optimizeWrite.enabled' = 'true',
  'delta.autoCompact.minNumFiles' = '5'
)
\`\`\`

**For streaming source — increase trigger interval:**
\`\`\`python
.trigger(processingTime='10 minutes')  # 1 write per 10 min vs 1 write per 30 sec
\`\`\`
60× fewer files generated for the same data volume.

**Monitor:** daily job checks \`DESCRIBE DETAIL\` and alerts if numFiles > 1000 or avgFileSize < 50MB.`,
  alts:[
    "How do you fix the small file problem in Delta Lake?",
    "What does OPTIMIZE do in Delta Lake?",
    "How do you prevent small files from accumulating in a streaming Delta table?"
  ]
},

"databricks-pyspark-pandas-45": {
  answer:
`**SCENARIO: DLT pipeline failing silently — bad records pass through to Gold tables.**

**Root cause:** DLT pipeline with no expectations propagates all records regardless of quality. Null ticket_ids, invalid statuses, and corrupt records flow into Silver and eventually corrupt Gold aggregations.

**Fix — Add expectations at every layer:**

**Bronze — warn only (preserve all raw data):**
\`\`\`python
@dlt.table(comment="Raw ticket events")
@dlt.expect("has_ticket_id", "ticket_id IS NOT NULL")   # warn, don't drop
def bronze_tickets():
    return spark.readStream.format("cloudFiles").load(path)
\`\`\`

**Silver — enforce quality:**
\`\`\`python
@dlt.table
@dlt.expect_or_drop("valid_ticket_id", "ticket_id IS NOT NULL")
@dlt.expect_or_quarantine("valid_status", "status IN ('open','pending','resolved','closed')")
@dlt.expect_or_quarantine("non_negative_hours", "resolution_hours >= 0 OR resolution_hours IS NULL")
@dlt.expect_or_fail("no_test_data", "NOT (tenant_id LIKE 'test%' AND env = 'prod')")  # fail if test data in prod
def silver_tickets():
    return dlt.read_stream("bronze_tickets")
\`\`\`

**Quarantine table for investigation:**
\`\`\`python
@dlt.table(comment="Records that failed Silver quality checks")
def silver_tickets_quarantine():
    return dlt.read_stream("bronze_tickets").filter(
        col("ticket_id").isNull() |
        ~col("status").isin(['open','pending','resolved','closed'])
    ).withColumn("quarantine_reason", lit("quality_check_failed")) \
     .withColumn("quarantined_at", current_timestamp())
\`\`\`

**Gold — assert business rules:**
\`\`\`python
@dlt.table
@dlt.expect("valid_breach_rate", "sla_breach_rate BETWEEN 0 AND 1")
def gold_agent_sla():
    return dlt.read("silver_tickets").groupBy("agent_id","date").agg(...)
\`\`\`

**Monitoring:** read DLT event log for expectation pass rates. Alert if quarantine rate > 1%.`,
  alts:[
    "How do you prevent bad data from passing through a DLT pipeline?",
    "How do you add data quality checks to Delta Live Tables?",
    "What is the quarantine pattern in DLT?"
  ]
}
