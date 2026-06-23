// PATCH PART 5: pandas-1 through pandas-30
"pandas-1": {
  answer:
`**DataFrame** is a 2D labeled data structure — think a spreadsheet or SQL table. Columns can have different dtypes. **Series** is a 1D labeled array — a single column of a DataFrame.

**Indexing and selection:**

\`\`\`python
df.loc[label_or_condition]    # label-based (inclusive end)
df.iloc[integer_position]     # position-based (exclusive end)
df['col']                     # single column → Series
df[['col1','col2']]           # multiple columns → DataFrame
\`\`\`

**Boolean selection:**
\`\`\`python
df[df['status'] == 'open']                          # simple mask
df[(df['status'] == 'open') & (df['priority'] == 'high')]  # combine with & | ~
\`\`\`

**Fancy indexing (selecting specific rows + columns):**
\`\`\`python
df.loc[df['status']=='open', ['title','created_at']]
df.iloc[0:10, 2:5]
\`\`\`

**Common gotchas:**
- \`loc\` end is **inclusive**; \`iloc\` end is **exclusive**
- \`df[col]\` is a view (might warn about chained assignment); use \`.copy()\` to get a true copy
- \`at\` and \`iat\` are scalar-access versions of \`loc\`/\`iloc\` — faster for single values`,
  pros:[
    "loc with boolean masks is expressive and readable",
    "iloc is useful when you don't know column names (reading raw data)"
  ],
  cons:[
    "Chained indexing (df[x][y]) can silently modify a copy — use df.loc[mask, col] instead",
    "Integer-index DataFrames confuse loc vs iloc — reset_index to avoid ambiguity"
  ],
  useCase:
`Reading a CSV of support tickets. \`df.loc[df['priority']=='urgent', ['ticket_id','title','assigned_to']]\` filters to urgent tickets and selects only the columns needed for the agent dashboard.`,
  alts:[
    "What is the difference between loc and iloc in pandas?",
    "How do you filter a DataFrame by multiple conditions?",
    "What is the difference between a pandas DataFrame and a Series?"
  ]
},

"pandas-2": {
  answer:
`Pandas dtype determines how data is stored in memory and what operations are valid.

**Common dtypes:**
- \`int64\`, \`float64\`: default numeric (numpy-backed)
- \`object\`: Python strings or mixed types — memory-inefficient
- \`bool\`: boolean
- \`datetime64[ns]\`: timestamps
- \`category\`: for low-cardinality string columns

**Category dtype — biggest memory win:**
\`\`\`python
df['status'] = df['status'].astype('category')
# 'open','pending','resolved','closed' repeated 1M times
# object: 64 bytes × 1M = 64MB
# category: stores integer codes + a 4-value lookup = ~1MB
\`\`\`

**Downcasting numerics:**
\`\`\`python
df['priority_score'] = pd.to_numeric(df['priority_score'], downcast='integer')
# int64 → int8 if values fit — 8x memory reduction
\`\`\`

**Nullable dtypes (pandas 1.0+):** \`Int64\`, \`Float64\`, \`StringDtype\`, \`BooleanDtype\`
Use these instead of numpy dtypes when the column can have missing values — they use \`pd.NA\` instead of \`NaN\`, which is more correct for integers (an integer NaN doesn't exist in numpy).

**ArrowDtype (pandas 2.0+):** backed by PyArrow — better performance and interop with Parquet.`,
  pros:[
    "Category dtype cuts memory by 10-100x for string columns with < 50 unique values",
    "Explicit dtypes on read_csv prevent wrong inference (e.g., id column read as int vs string)"
  ],
  cons:[
    "Category columns can't be appended to with new categories without explicitly adding them",
    "Mixed-type object columns hide subtle type bugs until an operation fails"
  ],
  useCase:
`A 5M-row DataFrame with a \`status\` column (4 values) and \`priority\` column (4 values). Converting both to category reduces memory from 2.3GB to 0.4GB. Now it fits in the 1GB cloud function memory limit.`,
  alts:[
    "How does pandas category dtype save memory?",
    "What is the difference between object and string dtype in pandas?",
    "How do you reduce memory usage in a pandas DataFrame?"
  ]
},

"pandas-3": {
  answer:
`Missing values in pandas appear as \`NaN\` (float), \`NaT\` (datetime), or \`pd.NA\` (nullable dtypes).

**Detecting missing values:**
\`\`\`python
df.isna()          # element-wise boolean mask
df.isna().sum()    # count per column
df.isna().any()    # which columns have any nulls
\`\`\`

**Dropping:**
\`\`\`python
df.dropna()                       # drop any row with a NaN
df.dropna(subset=['title'])       # only if title is NaN
df.dropna(thresh=5)               # keep rows with at least 5 non-NaN values
\`\`\`

**Filling:**
\`\`\`python
df.fillna(0)                      # fill with a constant
df.fillna(df.mean())              # fill with column mean
df.fillna(method='ffill')         # forward fill (last known value)
df.fillna(method='bfill')         # backward fill
\`\`\`

**Interpolation (for time series):**
\`\`\`python
df['metric'].interpolate(method='linear')  # fills gaps linearly
df['metric'].interpolate(method='time')    # time-weighted (requires DatetimeIndex)
\`\`\`

**Production best practices:**
- Log null rates per column before and after cleaning — nulls appearing unexpectedly signal upstream issues
- Don't impute blindly: forward-filling a sensor reading is reasonable; forward-filling a user ID is not
- Use schema validation (pandera, Great Expectations) to catch null violations early`,
  pros:[
    "fillna(method='ffill') is ideal for time-series data where the last known value is the best estimate",
    "dropna(subset=[...]) is safer than dropping all rows — avoids discarding good data in other columns"
  ],
  cons:[
    "Imputing with mean/median hides the fact that data is missing — can mislead models",
    "ffill on unsorted data gives wrong results — always sort by time first"
  ],
  useCase:
`Support ticket timestamps have gaps where the agent wasn't logged in. \`df['response_time'].interpolate(method='time')\` fills gaps proportionally. SLA violation checks then run on the filled series. Without filling, SLA calculations would skip tickets and undercount violations.`,
  alts:[
    "How do you handle missing values in pandas?",
    "What is the difference between fillna, dropna, and interpolate?",
    "When should you use forward-fill vs imputation for missing data?"
  ]
},

"pandas-4": {
  answer:
`\`pd.read_csv\` has dozens of parameters — knowing the key ones separates production code from one-liners.

\`\`\`python
df = pd.read_csv(
    'tickets.csv',
    dtype={'ticket_id': str, 'priority_score': np.int16},  # explicit dtypes — no inference
    parse_dates=['created_at', 'updated_at'],              # parse date columns
    date_format='%Y-%m-%d %H:%M:%S',                       # parse format hint (pandas 2.0+)
    usecols=['ticket_id','title','status','created_at'],    # read only needed columns
    chunksize=100_000,                                      # iterator — don't load all at once
    na_values=['N/A', 'NULL', '-'],                        # custom null markers
    encoding='utf-8-sig',                                  # handle BOM in Windows CSVs
)
\`\`\`

**For large files — chunked reading:**
\`\`\`python
chunks = pd.read_csv('big_file.csv', chunksize=100_000)
result = pd.concat(
    [process(chunk) for chunk in chunks],
    ignore_index=True
)
\`\`\`

**Writing:**
\`\`\`python
df.to_csv('out.csv', index=False)          # always suppress the default integer index
df.to_parquet('out.parquet', index=False)  # preferred for large data — typed, compressed
df.to_sql('tickets', engine, if_exists='replace', index=False, method='multi')
\`\`\``,
  pros:[
    "usecols reduces memory proportionally to columns skipped — critical for wide CSVs",
    "dtype kwarg prevents dtype inference bugs (ticket IDs parsed as int, losing leading zeros)"
  ],
  cons:[
    "chunksize returns an iterator, not a DataFrame — can't call .head() directly on it",
    "parse_dates is slow for large files — consider parsing manually with pd.to_datetime after read"
  ],
  useCase:
`A 10M-row, 50-column CSV log file. \`usecols\` reduces to 6 needed columns. \`dtype\` map prevents float inference on integer IDs. \`chunksize=500_000\` keeps peak memory under 2GB. Processing takes 30s instead of OOM-crashing.`,
  alts:[
    "What are the most useful parameters of pd.read_csv?",
    "How do you read a large CSV file in pandas without running out of memory?",
    "Why should I use Parquet instead of CSV for data storage?"
  ]
},

"pandas-5": {
  answer:
`The \`str\` accessor exposes string methods on a Series with \`dtype=object\` or \`StringDtype\`. Vectorized — no loop needed.

\`\`\`python
# Basic operations
s.str.lower()
s.str.strip()
s.str.replace('old','new', regex=False)
s.str.contains('error', case=False, na=False)   # na=False treats NaN as False
s.str.startswith('TICKET-')
s.str.len()

# Pattern matching
s.str.extract(r'TICKET-(\d+)', expand=True)     # capture group → new column(s)
s.str.extractall(r'(\w+@\w+\.\w+)')             # all matches → multi-index result
s.str.findall(r'\d+')                           # list of all matches per row

# Splitting
s.str.split(',', expand=True)                   # split → separate columns
s.str.split(',').str[0]                         # first element of each split

# Counting / testing
s.str.count(r'\s+')                             # count pattern occurrences
s.str.match(r'^\d{4}$')                         # matches entire string
\`\`\`

**Common use case — extract data from messy text:**
\`\`\`python
df['agent_email'] = df['notes'].str.extract(r'assigned to ([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})')
\`\`\``,
  pros:[
    "Vectorized — far faster than df.apply(lambda x: x.lower())",
    "na=False in str.contains prevents NaN propagation without explicit fillna"
  ],
  cons:[
    "str accessor only works on object/string dtype — fails silently if column is numeric",
    "str.extract returns NaN for non-matching rows — always check match rate"
  ],
  useCase:
`Raw ticket titles contain embedded priority codes: 'P1 - Login broken'. \`df['priority'] = df['title'].str.extract(r'^(P[1-4])')\` extracts the code. \`df['title_clean'] = df['title'].str.replace(r'^P[1-4]\s*-\s*','', regex=True)\` cleans the title. Both in one chained operation.`,
  alts:[
    "How do you use the pandas str accessor?",
    "How do you extract a regex group from a pandas column?",
    "What is the difference between str.extract and str.extractall?"
  ]
},

"pandas-6": {
  answer:
`Pandas' datetime support is built on NumPy's \`datetime64[ns]\` and Python's \`datetime\` objects.

**Parsing:**
\`\`\`python
df['created_at'] = pd.to_datetime(df['created_at'])
pd.to_datetime(df['created_at'], format='%Y-%m-%d %H:%M:%S', utc=True)
pd.to_datetime(df['created_at'], errors='coerce')  # invalid → NaT
\`\`\`

**The dt accessor:**
\`\`\`python
df['created_at'].dt.year
df['created_at'].dt.month
df['created_at'].dt.day_name()
df['created_at'].dt.hour
df['created_at'].dt.date           # returns Python date objects
df['created_at'].dt.tz_localize('UTC').dt.tz_convert('Asia/Kolkata')
\`\`\`

**Resampling (requires DatetimeIndex):**
\`\`\`python
df = df.set_index('created_at')
df.resample('D')['ticket_id'].count()   # tickets per day
df.resample('W').agg({'resolution_time': 'mean', 'ticket_id': 'count'})
\`\`\`

**Period vs Timestamp:**
- \`Timestamp\`: a specific point in time (2024-01-15 09:30:00)
- \`Period\`: a span of time (January 2024, Q1 2024). Good for fiscal periods.

\`\`\`python
df['month'] = df['created_at'].dt.to_period('M')  # '2024-01' etc.
\`\`\``,
  pros:[
    "DatetimeIndex enables resample, rolling, and shift operations — powerful for time series analysis",
    "tz_localize + tz_convert handles timezone conversion cleanly without pytz boilerplate"
  ],
  cons:[
    "Mixing tz-aware and tz-naive Timestamps raises TypeError — always normalize timezone handling upfront",
    "resample requires a DatetimeIndex — remember set_index first"
  ],
  useCase:
`SLA analysis: parse \`created_at\` and \`resolved_at\` to Timestamp. Calculate \`resolution_hours = (df['resolved_at'] - df['created_at']).dt.total_seconds() / 3600\`. Resample by week to get weekly average resolution time. Plot trend to show SLA improvement after the new routing algorithm.`,
  alts:[
    "How do you work with dates and times in pandas?",
    "How do you resample time series data in pandas?",
    "What is the difference between Timestamp and Period in pandas?"
  ]
},

"pandas-7": {
  answer:
`The **Index** is pandas' row label system. Understanding it prevents subtle bugs with alignment and joining.

**Common Index types:**
- \`RangeIndex\`: default 0..N-1
- \`Int64Index\`: custom integers
- \`DatetimeIndex\`: for time series
- \`MultiIndex\`: hierarchical index (multiple levels)

**Key operations:**
\`\`\`python
df.set_index('ticket_id')          # column → Index
df.reset_index()                   # Index → column
df.reindex([list_of_labels])       # reindex to a new label set; missing → NaN

df.index.is_unique                 # check for duplicates
df.sort_index()                    # sort by index
\`\`\`

**MultiIndex:**
\`\`\`python
df.set_index(['tenant_id','ticket_id'])
df.loc[('tenant123', 'T001')]         # tuple selection
df.xs('tenant123', level='tenant_id') # cross-section
\`\`\`

**Alignment:** pandas aligns operations by index label, not position:
\`\`\`python
s1 = pd.Series([1,2,3], index=[0,1,2])
s2 = pd.Series([10,20], index=[1,2])
s1 + s2  # → [NaN, 22, 23] — index 0 has no match in s2
\`\`\`
This is powerful but surprising — always verify indexes align before arithmetic.`,
  pros:[
    "DatetimeIndex enables time-based slicing: df.loc['2024-01':'2024-03']",
    "MultiIndex avoids redundant columns for hierarchical data"
  ],
  cons:[
    "Index alignment silently introduces NaN in arithmetic — easy to miss",
    "reset_index after group operations is easy to forget, leaving a MultiIndex that confuses downstream code"
  ],
  useCase:
`Tenant usage report: \`df.set_index(['tenant_id','month'])\` creates a MultiIndex. \`df.loc['tenant_abc']\` returns all months for that tenant. \`df.unstack('month')\` pivots months to columns for a heatmap visualization.`,
  alts:[
    "How does pandas alignment work and why does it cause NaN?",
    "What is a MultiIndex in pandas and how do you use it?",
    "What is the difference between set_index and reset_index?"
  ]
},

"pandas-8": {
  answer:
`Method chaining keeps data pipelines readable by returning a new DataFrame from each step.

\`\`\`python
result = (
    pd.read_csv('tickets.csv', dtype={'ticket_id': str})
    .rename(columns={'created_at': 'created'})
    .assign(
        created=lambda df: pd.to_datetime(df['created']),
        resolution_hours=lambda df: (df['resolved_at'] - df['created']).dt.total_seconds() / 3600
    )
    .query("status == 'resolved' and resolution_hours < 720")
    .groupby('agent_id')['resolution_hours']
    .mean()
    .sort_values()
    .head(10)
)
\`\`\`

**\`pipe()\`:** integrates custom functions into a chain:
\`\`\`python
def add_sla_flag(df, threshold_hours=24):
    return df.assign(sla_breached=df['resolution_hours'] > threshold_hours)

result = (
    df
    .pipe(add_sla_flag, threshold_hours=8)
    .query("sla_breached")
)
\`\`\`

**Benefits of chaining:**
- No intermediate variable names (\`df1\`, \`df2\`, \`df_clean\`, \`df_final\`) — the transformation is the variable
- Each step is a pure function of the previous step
- Easy to add/remove/reorder steps
- Wrapping in parentheses enables line-by-line breakdown`,
  pros:[
    "pipe() integrates any custom function into the chain — keeps the pipeline readable",
    "No mutation of the original DataFrame — each step returns a copy"
  ],
  cons:[
    "Debugging a chain is harder — add .pipe(lambda df: df.info() or df) to inspect mid-chain",
    "assign with many lambda columns can slow down for large DataFrames — each lambda re-scans"
  ],
  useCase:
`A monthly data quality report is built as one chained pipeline: read → clean → validate → aggregate → format. New teammates can read the entire pipeline top-to-bottom and understand the transformation. No state to track across 10 intermediate variables.`,
  alts:[
    "What is method chaining in pandas and why is it useful?",
    "How does pipe() work in pandas?",
    "How do you write readable data transformation code in pandas?"
  ]
},

"pandas-9": {
  answer:
`\`groupby\` implements the **split-apply-combine** pattern: split the DataFrame by group key, apply a function to each group, combine results.

**Four operations post-groupby:**

\`\`\`python
# agg: reduce each group to a scalar (or multiple scalars)
df.groupby('status')['resolution_hours'].agg(['mean','median','count'])
df.groupby('status').agg({'resolution_hours': 'mean', 'ticket_id': 'count'})

# transform: return a same-shape result (aligned to original index)
df['mean_res_time_by_status'] = df.groupby('status')['resolution_hours'].transform('mean')
# Useful for: filling NaN with group mean, computing Z-score within group

# apply: most flexible — function receives a sub-DataFrame, returns anything
df.groupby('agent_id').apply(lambda g: g.nlargest(3, 'resolution_hours'))
# Avoid when agg/transform work — apply is significantly slower

# filter: keep groups that satisfy a condition
df.groupby('agent_id').filter(lambda g: g['ticket_id'].count() >= 10)
# Keep only agents with 10+ tickets
\`\`\`

**Key rule:** use \`agg\` for aggregation, \`transform\` for keeping original DataFrame shape, \`apply\` only when neither works. \`apply\` calls a Python function per group — bypasses Cython optimizations.`,
  pros:[
    "transform aligns results back to the original index — perfect for creating features alongside raw data",
    "agg with a dict allows different aggregations per column in one operation"
  ],
  cons:[
    "apply is slow for large DataFrames — prefer vectorized agg/transform when possible",
    "groupby + apply with a function that returns a DataFrame creates a MultiIndex result — remember reset_index"
  ],
  useCase:
`Agent performance dashboard: \`df.groupby('agent_id').agg(tickets=('ticket_id','count'), avg_resolution=('resolution_hours','mean'), sla_breach_rate=('sla_breached','mean'))\`. One line returns the full leaderboard DataFrame.`,
  alts:[
    "What is the difference between groupby agg, transform, apply, and filter?",
    "When should I use transform instead of agg in pandas?",
    "Why is groupby apply slow and what should I use instead?"
  ]
},

"pandas-10": {
  answer:
`Three operations, different purposes:

**\`merge\`** (SQL-style join on columns):
\`\`\`python
pd.merge(tickets, agents, on='agent_id', how='left')  # all tickets, agent info if exists
pd.merge(A, B, left_on='id', right_on='ticket_id', how='inner')
pd.merge(A, B, on='id', validate='m:1')  # raises if B has duplicate ids (many-to-one check)
\`\`\`
Join types: \`inner\` (intersection), \`left\`, \`right\`, \`outer\` (union).

**\`join\`** (join on Index):
\`\`\`python
df1.join(df2, on='agent_id')   # df2's index must align with df1['agent_id']
\`\`\`
Convenient when one DataFrame is naturally indexed by the join key.

**\`concat\`** (stack DataFrames):
\`\`\`python
pd.concat([df1, df2])            # stack rows (axis=0) — same columns
pd.concat([df1, df2], axis=1)   # stack columns — same row count
pd.concat([df1, df2], ignore_index=True)  # reset to 0..N-1 index
pd.concat([df1, df2], keys=['jan','feb'])  # MultiIndex with source labels
\`\`\`

**Performance:** merge is O(n) with sort-merge; many-to-many join on non-unique keys creates a cross product — check with \`validate='m:1'\` or \`'1:1'\`.`,
  pros:[
    "validate param in merge catches accidental many-to-many joins that would explode row count",
    "concat with axis=1 is a clean way to add computed columns without assignment"
  ],
  cons:[
    "merge on non-unique keys silently produces a row explosion — always validate key uniqueness",
    "outer join introduces NaN — always check null counts after a join"
  ],
  useCase:
`Enriching tickets with agent info: \`pd.merge(tickets, agents[['agent_id','name','team']], on='agent_id', how='left', validate='m:1')\`. \`validate='m:1'\` catches if an agent_id appears twice in the agents table — a data quality issue that would otherwise silently inflate ticket counts.`,
  alts:[
    "What is the difference between merge, join, and concat in pandas?",
    "How do you do a left join in pandas?",
    "Why does my merge produce more rows than expected?"
  ]
},

"pandas-11": {
  answer:
`Window functions compute aggregations over a sliding window of rows.

**Rolling (fixed window):**
\`\`\`python
df['resolution_time'].rolling(window=7).mean()      # 7-day moving average
df['resolution_time'].rolling(window='7D').mean()   # 7-day time-based window (requires DatetimeIndex)
df['resolution_time'].rolling(window=7, min_periods=3).mean()  # allow partial windows
\`\`\`

**Expanding (cumulative, growing window):**
\`\`\`python
df['resolution_time'].expanding().mean()   # running mean from start
df['ticket_id'].expanding().count()        # cumulative ticket count
df['resolution_time'].expanding().std()    # running standard deviation
\`\`\`

**Exponentially Weighted (EWM — more weight to recent values):**
\`\`\`python
df['resolution_time'].ewm(span=7).mean()   # span-based EWMA
df['resolution_time'].ewm(halflife='3D').mean()  # time-based half-life
\`\`\`

**Rank / cumulative within group:**
\`\`\`python
df['rank_by_date'] = df.groupby('agent_id')['created_at'].rank(method='dense')
df['cumulative_tickets'] = df.groupby('agent_id').cumcount() + 1
\`\`\``,
  pros:[
    "rolling + min_periods handles the edge case at the start of a series without NaN propagation",
    "ewm is better than rolling for noisy time series — dampens outliers more smoothly"
  ],
  cons:[
    "rolling on unsorted data gives wrong results — always sort by time first",
    "rolling with time-based windows requires a monotonic DatetimeIndex"
  ],
  useCase:
`SLA trend report: 7-day rolling average of resolution time, plotted over 6 months. \`df.set_index('created_at').sort_index()['resolution_hours'].rolling('7D').mean()\`. Shows whether the team's response time is improving — smoother than daily metrics which have weekend dips.`,
  alts:[
    "What is the difference between rolling, expanding, and ewm in pandas?",
    "How do you compute a moving average in pandas?",
    "What is min_periods in pandas rolling?"
  ]
},

"pandas-12": {
  answer:
`**Reshaping** transforms between wide and long formats and between hierarchical structures.

**pivot_table** (aggregate + reshape wide):
\`\`\`python
pd.pivot_table(df, values='resolution_hours', index='agent_id', columns='priority',
               aggfunc='mean', fill_value=0)
# Rows: agents, Columns: priority levels, Values: mean resolution time
\`\`\`

**melt** (wide → long):
\`\`\`python
df.melt(id_vars=['ticket_id'], value_vars=['jan_count','feb_count'],
        var_name='month', value_name='count')
\`\`\`

**stack / unstack** (move between Index levels and columns):
\`\`\`python
df.stack()    # columns → innermost index level (wide → long)
df.unstack()  # innermost index level → columns (long → wide)
\`\`\`

**crosstab** (frequency table):
\`\`\`python
pd.crosstab(df['status'], df['priority'], normalize='index')
# Row-normalized: % of each status that is each priority
\`\`\`

**When to use which:**
- Need aggregation + reshape → \`pivot_table\`
- Wide → long → \`melt\`
- Long → wide (no aggregation) → \`pivot\`
- Frequency / contingency table → \`crosstab\`
- Move Index levels ↔ columns → \`stack/unstack\``,
  pros:[
    "pivot_table handles duplicates automatically via aggfunc — unlike pivot which raises on duplicates",
    "melt is the inverse of pivot — the two together enable round-trip transformation"
  ],
  cons:[
    "stack/unstack can create sparse DataFrames with many NaN if the MultiIndex isn't complete",
    "pivot_table with margins=True adds row/column totals — easy to accidentally include in analysis"
  ],
  useCase:
`Heatmap of ticket volume by agent × day-of-week: \`pd.pivot_table(df, values='ticket_id', index='agent_id', columns='day_of_week', aggfunc='count', fill_value=0)\`. Plotted with seaborn heatmap — shows which agents handle which days.`,
  alts:[
    "What is the difference between pivot and pivot_table in pandas?",
    "When should I use melt vs stack in pandas?",
    "How do you create a crosstab in pandas?"
  ]
},

"pandas-13": {
  answer:
`**Detecting duplicates:**
\`\`\`python
df.duplicated()                          # True for duplicate rows (first occurrence is False)
df.duplicated(subset=['ticket_id'])      # duplicates based on specific columns
df[df.duplicated(subset=['ticket_id'], keep=False)]  # all duplicate rows (keep=False marks ALL)
df.duplicated().sum()                    # count of duplicate rows
\`\`\`

**Dropping duplicates:**
\`\`\`python
df.drop_duplicates()                     # keep first occurrence
df.drop_duplicates(subset=['ticket_id'], keep='last')  # keep most recent
df.drop_duplicates(subset=['ticket_id'], keep=False)   # drop ALL rows that are duplicated
\`\`\`

**Practical — keep latest record per group:**
\`\`\`python
df.sort_values('updated_at').drop_duplicates(subset=['ticket_id'], keep='last')
\`\`\`

**Fuzzy deduplication (approximate matches):**
- Use \`rapidfuzz\` or \`thefuzz\` for string similarity
- Block on a key (first 3 letters of name) before comparing all pairs
- \`recordlinkage\` library for production-grade entity resolution

\`\`\`python
from rapidfuzz import process
candidates = process.extract(target, options, limit=5, score_cutoff=85)
\`\`\``,
  pros:[
    "drop_duplicates + keep='last' after sort_values handles CDC deduplication cleanly",
    "keep=False is useful for investigating — shows you all rows involved in duplicates, not just the extras"
  ],
  cons:[
    "Fuzzy deduplication with all-pairs comparison is O(n²) — must block on a key first for large datasets",
    "Exact dedup on subset misses near-duplicates (whitespace, capitalization differences)"
  ],
  useCase:
`Event log has duplicate events from retry logic. \`df.sort_values('event_timestamp').drop_duplicates(subset=['event_id'], keep='last')\` deduplicates while keeping the latest state of each event. SLA calculations are now accurate.`,
  alts:[
    "How do you find and remove duplicate rows in pandas?",
    "What is the difference between keep='first', 'last', and False in drop_duplicates?",
    "How do you do fuzzy deduplication in pandas?"
  ]
},

"pandas-14": {
  answer:
`This is one of the most important performance concepts in pandas.

**Vectorized operations (fastest):** operate on entire arrays at once via numpy/Cython:
\`\`\`python
df['value'] * 2           # vectorized — C speed
df['a'] + df['b']
df['name'].str.lower()    # str accessor is vectorized
df['amount'].clip(0, 1000)
\`\`\`

**apply() (slower):** calls a Python function once per element or row:
\`\`\`python
df['value'].apply(lambda x: x * 2)        # ~10x slower than df['value'] * 2
df.apply(lambda row: row['a'] + row['b'], axis=1)  # ~100x slower — row-wise apply
\`\`\`

**iterrows() / itertuples() (slowest):** Python loop over rows:
\`\`\`python
for idx, row in df.iterrows():     # never do this for computation
    total += row['value']
# Use instead: df['value'].sum()
\`\`\`

**When apply is necessary:**
- The function can't be vectorized with built-ins (complex conditionals, external API calls, regex with multiple groups)
- Row-wise apply where \`np.where\`/\`np.select\` can't express the logic

**Speeding up apply:** use \`numba\` JIT (\`@numba.jit\`), \`Cython\`, or \`pandas_udf\` in Spark. For row-wise conditional: \`np.where\` or \`np.select\` instead of apply.`,
  pros:[
    "Vectorized operations are 10-100x faster than apply — always try them first",
    "np.where and np.select handle most conditional logic that beginners reach for apply to solve"
  ],
  cons:[
    "apply is sometimes unavoidable — but document why vectorization wasn't possible",
    "apply with progress_apply (tqdm) at least makes slow operations visible"
  ],
  useCase:
`Categorizing tickets by SLA tier: \`df['sla_tier'] = np.select([df['priority']=='P1', df['priority']=='P2', df['priority']=='P3'], [4,8,24], default=72)\`. No apply, no loop — vectorized conditional, runs in milliseconds on 1M rows.`,
  alts:[
    "Why is pandas apply slow?",
    "What should I use instead of iterrows in pandas?",
    "When is it acceptable to use apply in pandas?"
  ]
},

"pandas-15": {
  answer:
`Creating and computing new columns efficiently.

**\`assign\` (chaining-friendly):**
\`\`\`python
df = df.assign(
    resolution_hours=lambda df: (df['resolved_at'] - df['created_at']).dt.total_seconds() / 3600,
    sla_breached=lambda df: df['resolution_hours'] > df['sla_threshold'],
    priority_score=lambda df: df['priority'].map({'P1':4,'P2':3,'P3':2,'P4':1})
)
\`\`\`
Note: lambdas in \`assign\` have access to previously assigned columns in the same call — they're evaluated in order.

**\`eval\` (string expression, fast):**
\`\`\`python
df.eval('resolution_hours = (resolved_at - created_at) / 1e9 / 3600', inplace=False)
df.eval('score = weight * value + bonus', inplace=False)
\`\`\`
\`eval\` avoids creating large intermediate arrays — can be faster than chained operations on large DataFrames.

**\`query\` (readable filtering):**
\`\`\`python
df.query("status == 'open' and priority == 'P1' and resolution_hours > 4")
df.query("agent_id in @agent_list")  # @ accesses Python variables
\`\`\`

**Map for single column:**
\`\`\`python
df['priority_score'] = df['priority'].map({'P1':4,'P2':3,'P3':2,'P4':1})
\`\`\``,
  pros:[
    "assign returns a new DataFrame — chain-friendly and doesn't mutate the original",
    "query with @ variable reference enables dynamic filtering without f-strings"
  ],
  cons:[
    "eval doesn't support all pandas operations — complex expressions fall back to assign",
    "assign with many lambdas re-evaluates the DataFrame for each — consider splitting very wide assign calls"
  ],
  useCase:
`Building a ticket scoring model: one \`assign\` call adds \`recency_score\`, \`priority_score\`, \`customer_tier_score\`, and \`composite_score\` columns — each building on the previous. No intermediate variables, no accidental mutation of the source DataFrame.`,
  alts:[
    "What is the difference between assign, eval, and query in pandas?",
    "How do you create multiple columns at once in pandas?",
    "When should I use query instead of boolean indexing?"
  ]
},

"pandas-16": {
  answer:
`**Categorical data** handling is critical for ML preprocessing.

**pd.Categorical:**
\`\`\`python
df['priority'] = pd.Categorical(df['priority'], categories=['P1','P2','P3','P4'], ordered=True)
df['priority'] > 'P2'   # comparison works because ordered=True
\`\`\`

**One-hot encoding (get_dummies):**
\`\`\`python
encoded = pd.get_dummies(df['priority'], prefix='priority', drop_first=True)
df = pd.concat([df, encoded], axis=1)
# drop_first=True drops one category to avoid multicollinearity
\`\`\`

**Label encoding (ordinal):**
\`\`\`python
from sklearn.preprocessing import LabelEncoder
df['priority_encoded'] = LabelEncoder().fit_transform(df['priority'])
# Or use category codes:
df['priority'] = df['priority'].astype('category')
df['priority_code'] = df['priority'].cat.codes   # integer code per category
\`\`\`

**When to use which:**
- **One-hot:** nominal categories with no order (color, region) — use with linear models, neural nets
- **Label/ordinal:** ordered categories (priority: P1>P2>P3) — use with tree-based models that understand order
- **Target encoding:** mean of target per category — powerful but leaks target info; use with cross-validation`,
  pros:[
    "get_dummies handles NaN by default (it won't create a NaN column) — check if you need it",
    "cat.codes is faster and more memory-efficient than LabelEncoder for large categoricals"
  ],
  cons:[
    "get_dummies creates a new column per category — high-cardinality columns create hundreds of sparse columns",
    "Label encoding implies ordinality — don't use on nominal data with tree-agnostic models"
  ],
  useCase:
`Feature engineering for a ticket priority predictor: \`status\` → get_dummies (nominal); \`priority\` → cat.codes (ordered); \`channel\` (10 values) → target encoding on the training set using cross-validation to prevent leakage.`,
  alts:[
    "How do you one-hot encode a pandas column?",
    "What is the difference between one-hot encoding and label encoding?",
    "How do you use pd.Categorical for ordered categories?"
  ]
},

"pandas-17": {
  answer:
`When your dataset doesn't fit in memory, you have several options short of moving to Spark.

**1. Chunked reading:**
\`\`\`python
chunks = pd.read_csv('big.csv', chunksize=100_000)
summary = pd.concat([chunk.groupby('status').size() for chunk in chunks], axis=0).groupby(level=0).sum()
\`\`\`

**2. Parquet instead of CSV:**
- Columnar format — only read the columns you need (physical column pruning)
- Compressed by default (snappy/zstd) — 3-5x smaller than CSV
- Preserves dtypes — no re-inference cost

\`\`\`python
df.to_parquet('tickets.parquet', compression='zstd', index=False)
df = pd.read_parquet('tickets.parquet', columns=['ticket_id','status','resolution_hours'])
\`\`\`

**3. Memory profiling:**
\`\`\`python
df.memory_usage(deep=True)         # bytes per column (deep=True includes object dtype contents)
df.memory_usage(deep=True).sum()   # total bytes
\`\`\`

**4. dtype optimization at read time:**
\`\`\`python
dtypes = {'priority': 'category', 'status': 'category', 'score': np.float32}
df = pd.read_csv('big.csv', dtype=dtypes, usecols=list(dtypes.keys()) + ['ticket_id'])
\`\`\`

**5. PyArrow / DuckDB for larger-than-memory:**
\`\`\`python
import duckdb
duckdb.query("SELECT status, COUNT(*) FROM 'big.parquet' GROUP BY status").df()
\`\`\``,
  pros:[
    "Parquet + column pruning can reduce effective data size by 10x vs reading a full CSV",
    "DuckDB can query Parquet files larger than RAM with vectorized execution — no Spark needed"
  ],
  cons:[
    "Chunked processing is complex for operations that require seeing all data (sort, quantile)",
    "Parquet is write-once; partial updates require rewriting the file"
  ],
  useCase:
`10GB CSV of historical tickets. Step 1: convert to Parquet with category dtypes (→ 1.2GB). Step 2: DuckDB query aggregates by tenant and month in seconds — never loads the full dataset into memory. Monthly reports now run in 8 seconds vs 45-minute OOM crash.`,
  alts:[
    "How do you handle a dataset that is too large to fit in pandas memory?",
    "Why is Parquet better than CSV for data pipelines?",
    "How do you profile memory usage in a pandas DataFrame?"
  ]
},

"pandas-18": {
  answer:
`**Copy-on-Write (CoW)** is the biggest behavioral change in pandas 2.0, aimed at eliminating the infamous \`SettingWithCopyWarning\`.

**The old problem:**
\`\`\`python
# Was this a copy or a view? Unpredictable in pandas 1.x
subset = df[df['status'] == 'open']
subset['priority'] = 'high'   # SettingWithCopyWarning — did df change? Maybe.
\`\`\`

**CoW in pandas 2.0:** any assignment to a DataFrame that was derived from another creates a copy of the modified data — and only then. No double copies up front; lazy copy-on-first-write.

**Result:** the modification is always to the copy — the original is never mutated through a derived reference.
\`\`\`python
# pandas 2.0 with CoW enabled (default in 3.0):
subset = df[df['status'] == 'open']   # no copy yet
subset['priority'] = 'high'            # copy triggered here; df is unchanged
\`\`\`

**Chained assignment is now always wrong:**
\`\`\`python
df['col1']['row0'] = value    # ✗ — even cleaner warning under CoW; always use .loc
df.loc['row0', 'col1'] = value  # ✓ always correct
\`\`\`

**Performance impact:** CoW uses lazy copying — existing in-place operations now trigger copies, which can increase memory transiently. But it eliminates the unpredictable behavior and makes reasoning about DataFrame mutations straightforward.`,
  pros:[
    "Eliminates SettingWithCopyWarning permanently — no more uncertainty about view vs copy",
    "Makes DataFrame mutation explicit — code intent is clear"
  ],
  cons:[
    "Code that relied on in-place mutation of slices needs to be rewritten",
    "Lazy copy can cause a brief memory spike on first write — profile memory-sensitive code"
  ],
  useCase:
`A pipeline that was filtering then modifying columns in place was silently not modifying the original DataFrame in pandas 1.x (sometimes) and was (other times). With CoW enabled, behavior is consistent — rewrote modifications to use .loc, now deterministic.`,
  alts:[
    "What is Copy-on-Write in pandas 2.0 and why does it matter?",
    "What is SettingWithCopyWarning and how does CoW fix it?",
    "How does pandas 2.0 change how DataFrame views and copies work?"
  ]
},

"pandas-19": {
  answer:
`Choosing the right tool for the right data size.

| | pandas | Polars | Modin | Dask |
|---|---|---|---|---|
| Paradigm | Eager, single-thread | Eager, multi-thread (Rust) | Drop-in pandas replacement | Lazy, distributed |
| Speed | Baseline | 5-50x faster | 2-4x faster | Scales out |
| Memory | In-memory | In-memory (efficient) | In-memory + Ray/Dask | Out-of-core |
| API | pandas | Different but similar | pandas-compatible | pandas-compatible |
| Best for | < 1GB, team knows it | 1-10GB, performance matters | Drop-in speedup | > 10GB, cluster |

**Polars:** lazy query optimizer (like Spark's Catalyst but single-machine), parallel execution, no index, immutable DataFrames. Different API but powerful for 1-10GB data.

**Modin:** \`import modin.pandas as pd\` — same pandas API, runs on Ray or Dask backend. Immediate speedup with no code change. Falls back to pandas for unsupported operations.

**Dask:** lazy computation graph, processes in chunks, scales to a cluster. API matches pandas. Ideal when data exceeds single-machine RAM.

**My ladder:** pandas → Polars (when 1GB+ or speed matters) → Dask or Spark (when multi-machine scale needed).`,
  pros:[
    "Polars query optimizer fuses operations to avoid intermediate DataFrames — huge memory savings",
    "Modin gives near-instant speedup with zero code changes for pandas codebases"
  ],
  cons:[
    "Polars has no Index — code that relies on pandas index alignment needs rewriting",
    "Dask's lazy evaluation means errors appear at compute() time, not at function call time"
  ],
  useCase:
`Data team processes daily 3GB Parquet files. Migration from pandas to Polars: file reads 3x faster, groupby aggregations 10x faster, memory usage 40% lower. No cluster needed. Team adopts Polars for all new pipelines.`,
  alts:[
    "When should I use Polars instead of pandas?",
    "What is the difference between Dask and Modin?",
    "How does Polars compare to pandas for performance?"
  ]
},

"pandas-20": {
  answer:
`Profiling before optimizing prevents wasted effort.

**Memory profiling:**
\`\`\`python
df.memory_usage(deep=True)            # bytes per column
df.memory_usage(deep=True).sum() / 1e6  # total MB
df.dtypes                             # look for object columns that should be category
\`\`\`

**Timing specific operations:**
\`\`\`python
%timeit df.groupby('status')['value'].mean()   # Jupyter magic — runs 7 times, reports average
import time; start = time.perf_counter(); ...; print(time.perf_counter() - start)
\`\`\`

**Line-by-line profiling:**
\`\`\`python
%load_ext line_profiler
%lprun -f my_function my_function(df)
\`\`\`

**Identifying bottlenecks — common patterns:**
- Wide object columns → convert to category
- apply() where vectorized operation exists → replace
- Repeated identical groupby operations → cache the result
- Reading same large CSV multiple times → cache as Parquet
- Joining on unsorted keys → sort first or pre-merge index

**Practical workflow:**
1. \`df.memory_usage(deep=True)\` — fix dtype issues
2. \`%timeit\` the slow operation in Jupyter
3. \`%lprun\` to find the slow line in a function
4. Fix, re-time, compare`,
  pros:[
    "memory_usage(deep=True) is the fastest way to find which columns are burning memory",
    "line_profiler pinpoints which line inside a function is slow — essential before any optimization"
  ],
  cons:[
    "%timeit runs many iterations — for slow operations use %time instead",
    "Profiling in Jupyter is easy; profiling in a script needs cProfile or py-spy"
  ],
  useCase:
`Pipeline was taking 90 seconds. memory_usage showed 8GB for one object column with 5 unique values → convert to category → down to 800MB. %lprun on the main function showed 70% of time in a .apply() → replaced with np.select → down to 12 seconds. Total: 7.5x speedup from two targeted changes.`,
  alts:[
    "How do you profile a slow pandas pipeline?",
    "How do you find which operation in pandas is slow?",
    "What tools do you use for pandas performance profiling?"
  ]
},

"pandas-21": {
  answer:
`**ExtensionArrays** extend pandas beyond NumPy dtypes. Key types:

**Nullable integer/float (pandas 1.0+):**
\`\`\`python
s = pd.array([1, 2, None], dtype='Int64')  # capital I — nullable
# vs np.nan: NaN can't exist in int64 arrays (forces float64)
# pd.NA is the correct null for integer columns
\`\`\`

**StringDtype:**
\`\`\`python
s = pd.array(['hello', None, 'world'], dtype='string')
# More efficient than object; pd.NA instead of np.nan for missing
\`\`\`

**BooleanDtype:**
\`\`\`python
s = pd.array([True, False, None], dtype='boolean')
\`\`\`

**ArrowDtype (pandas 2.0+):**
\`\`\`python
s = pd.array([1, 2, None], dtype='int64[pyarrow]')
\`\`\`
PyArrow-backed arrays are faster for string operations and use less memory. Native Arrow format allows zero-copy interop with Parquet, Polars, and databases.

**Benefits over numpy dtypes:**
- Integer/bool columns can have true null values without converting to float
- StringDtype is more memory-efficient than object for string-heavy data
- ArrowDtype enables zero-copy data transfer`,
  pros:[
    "Nullable Int64 allows integer columns with NaN without the float precision loss of np.nan",
    "ArrowDtype enables zero-copy reads from Parquet — eliminates copy overhead for large datasets"
  ],
  cons:[
    "Not all pandas operations support nullable dtypes — some fall back to object, changing behavior",
    "ArrowDtype requires pyarrow installed; not all third-party libraries handle it correctly"
  ],
  useCase:
`Ticket IDs are integers but can be NULL for draft tickets. Storing as \`Int64\` (nullable) keeps the column as integer (correct type, fast operations) while allowing \`pd.NA\` for NULLs. Storing as \`float64\` to accommodate NaN would allow non-integer values like 1.5 — wrong type for IDs.`,
  alts:[
    "What are pandas ExtensionArrays and nullable dtypes?",
    "What is the difference between Int64 and int64 in pandas?",
    "When should I use ArrowDtype in pandas?"
  ]
},

"pandas-22": {
  answer:
`When pandas is asked to load a 50GB CSV, it tries to load all of it into memory — and crashes or swaps to disk.

**Strategy 1 — Read only what you need:**
\`\`\`python
df = pd.read_csv('big.csv', usecols=['id','status','timestamp'], dtype={'status':'category'})
\`\`\`

**Strategy 2 — Chunked processing:**
\`\`\`python
result_chunks = []
for chunk in pd.read_csv('big.csv', chunksize=500_000):
    result_chunks.append(chunk.groupby('status').size())
final = pd.concat(result_chunks).groupby(level=0).sum()
\`\`\`

**Strategy 3 — Sample first:**
\`\`\`python
df = pd.read_csv('big.csv', nrows=10_000)   # inspect structure
df = pd.read_csv('big.csv', skiprows=lambda i: i > 0 and random.random() > 0.01)  # 1% sample
\`\`\`

**Strategy 4 — Convert to Parquet once, query with DuckDB:**
\`\`\`python
# One-time conversion:
for chunk in pd.read_csv('big.csv', chunksize=1_000_000):
    chunk.to_parquet(f'part_{i}.parquet')
# Ongoing queries — no pandas needed:
import duckdb
duckdb.query("SELECT status, COUNT(*) FROM 'parts/*.parquet' GROUP BY status").df()
\`\`\`

**Strategy 5 — Move to PySpark/Databricks** for permanent large-data processing.`,
  pros:[
    "DuckDB can query partitioned Parquet files larger than RAM with vectorized execution",
    "Converting once to Parquet + category dtypes often reduces 50GB to under 5GB"
  ],
  cons:[
    "Chunked pandas is complex for operations requiring global context (sort, median, join)",
    "One-time Parquet conversion requires intermediate storage and processing time"
  ],
  useCase:
`50GB daily log CSV: read with chunked processing, extract key fields, write to Parquet (→ 6GB). DuckDB queries the Parquet for daily reports in under 30 seconds. Original CSV kept in cold storage. No Spark cluster needed.`,
  alts:[
    "How do you read a 50GB CSV file with pandas?",
    "What should I do when pandas runs out of memory on a large file?",
    "When should I use DuckDB instead of pandas?"
  ]
},

"pandas-23": {
  answer:
`Production data pipelines need validation — bad data downstream causes silent business errors worse than a pipeline crash.

**Schema validation with pandera:**
\`\`\`python
import pandera as pa
schema = pa.DataFrameSchema({
    'ticket_id': pa.Column(str, nullable=False, unique=True),
    'status': pa.Column(str, pa.Check.isin(['open','pending','resolved','closed'])),
    'priority': pa.Column(str, pa.Check.isin(['P1','P2','P3','P4'])),
    'created_at': pa.Column(pa.DateTime, nullable=False),
    'resolution_hours': pa.Column(float, pa.Check.ge(0), nullable=True),
})
validated_df = schema.validate(df)  # raises SchemaError on failure
\`\`\`

**Custom checks:**
\`\`\`python
# Referential integrity: all agent_ids must exist in the agents table
@pa.check_input(schema)
def process_tickets(df: pd.DataFrame) -> pd.DataFrame:
    assert df['agent_id'].isin(agents['agent_id']).all(), "Unknown agent_ids found"
    return df
\`\`\`

**Range and uniqueness:**
\`\`\`python
assert df['priority_score'].between(0, 100).all(), "Score out of range"
assert not df['ticket_id'].duplicated().any(), "Duplicate ticket IDs"
assert df['created_at'].notna().all(), "Null timestamps"
\`\`\`

**Monitoring:** log validation stats (row count, null rates per column, value distribution) before and after each stage. Alert on significant drift.`,
  pros:[
    "pandera integrates with mypy for static type checking of DataFrame operations",
    "Failing fast at validation is much cheaper than debugging downstream data corruption"
  ],
  cons:[
    "pandera adds overhead — validate on read, not on every transform",
    "Overly strict schemas that reject valid edge cases cause false pipeline failures"
  ],
  useCase:
`Nightly ETL reads from Supabase, transforms, loads to BI layer. Pandera schema validates: no null ticket_ids, status in known enum, resolution_hours ≥ 0. On schema failure, the pipeline stops and alerts — no partial bad data in the BI layer.`,
  alts:[
    "How do you validate a pandas DataFrame in production?",
    "What is pandera and how does it work?",
    "How do you check data quality in a pandas pipeline?"
  ]
},

"pandas-24": {
  answer:
`The **Styler** object applies visual formatting to a DataFrame for display in Jupyter or HTML reports.

\`\`\`python
(df.style
 .format({'resolution_hours': '{:.1f}h', 'sla_breach_rate': '{:.1%}'})
 .background_gradient(subset=['resolution_hours'], cmap='RdYlGn_r')  # red=slow, green=fast
 .bar(subset=['ticket_count'], color='#5fba7d')
 .highlight_max(subset=['resolution_hours'], color='red')
 .highlight_min(subset=['resolution_hours'], color='green')
 .set_caption('Agent Performance — Q1 2024')
 .set_table_styles([{'selector':'th','props':[('font-weight','bold')]}])
)
\`\`\`

**Export to Excel:**
\`\`\`python
with pd.ExcelWriter('report.xlsx', engine='openpyxl') as writer:
    df.style.to_excel(writer, sheet_name='Performance', index=False)
\`\`\`

**Conditional formatting:**
\`\`\`python
def highlight_breached(val):
    return 'background-color: red' if val > 24 else ''

df.style.applymap(highlight_breached, subset=['resolution_hours'])
# Or row-wise:
df.style.apply(lambda row: ['background: red' if row['sla_breached'] else '' for _ in row], axis=1)
\`\`\`

Note: Styler is for display only — it doesn't modify the underlying DataFrame values.`,
  pros:[
    "background_gradient creates instant heatmaps — no matplotlib code needed",
    "to_excel preserves conditional formatting in Excel — useful for non-technical stakeholders"
  ],
  cons:[
    "Styler renders slowly for DataFrames > 10k rows — use aggregated summaries for large data",
    "Some Styler methods don't work outside Jupyter without explicit HTML rendering"
  ],
  useCase:
`Weekly agent SLA report: Styler formats the resolution_hours column with a red-to-green gradient (worst performers highlighted red). Exported to Excel for the support manager. Takes 10 lines of Styler code vs building a separate reporting tool.`,
  alts:[
    "How do you add conditional formatting to a pandas DataFrame?",
    "How do you export a styled pandas DataFrame to Excel?",
    "What is the pandas Styler object?"
  ]
},

"pandas-25": {
  answer:
`**SCENARIO: 50GB CSV crashes with MemoryError. Fix without Spark.**

**5 strategies in order of effort:**

**1. Use only needed columns and rows:**
\`\`\`python
df = pd.read_csv('big.csv', usecols=['id','status','amount'], dtype={'status':'category'})
\`\`\`
Often reduces size 5-10x immediately.

**2. Downcast numeric dtypes:**
\`\`\`python
df = pd.read_csv('big.csv', dtype={'amount': np.float32, 'count': np.int32})
\`\`\`

**3. Chunked processing:**
\`\`\`python
summary = pd.concat([
    chunk.groupby('status')['amount'].sum()
    for chunk in pd.read_csv('big.csv', chunksize=1_000_000)
]).groupby(level=0).sum()
\`\`\`

**4. Convert to Parquet + DuckDB:**
\`\`\`python
# One-time: convert CSV to partitioned Parquet
# Then use DuckDB for all queries — out-of-core, vectorized
duckdb.query("SELECT status, SUM(amount) FROM '*.parquet' GROUP BY status").df()
\`\`\`

**5. Use Polars:**
\`\`\`python
import polars as pl
result = pl.scan_csv('big.csv').groupby('status').agg(pl.col('amount').sum()).collect()
\`\`\`
Polars' \`scan_csv\` is lazy — only loads what's needed. Uses Rust multi-threading. Handles 50GB on a 16GB machine.`,
  alts:[
    "How do you process a 50GB file in pandas without running out of memory?",
    "What are the alternatives to pandas for large files?",
    "How does Polars handle files larger than RAM?"
  ]
},

"pandas-26": {
  answer:
`**SCENARIO: Same input, different output — non-deterministic pipeline.**

**Debugging checklist:**

**1. Dtype inference instability:**
\`\`\`python
# CSV read infers types from first N rows — varies if data has mixed types
df = pd.read_csv('data.csv')         # ✗ inferred
df = pd.read_csv('data.csv', dtype={'id': str, 'amount': float})  # ✓ explicit
\`\`\`

**2. Sort order instability:**
\`\`\`python
df.sort_values('status')  # ✗ ties broken arbitrarily — add a tiebreaker
df.sort_values(['status', 'created_at', 'ticket_id'])  # ✓ deterministic
\`\`\`

**3. Index alignment surprises:**
\`\`\`python
# After filter, index is non-contiguous — operations that assume 0..N-1 break
df.reset_index(drop=True, inplace=True)  # reset after filter
\`\`\`

**4. Random seeds not set:**
\`\`\`python
df.sample(1000, random_state=42)  # always set random_state
\`\`\`

**5. apply() depending on global state:**
Any side effect or closure over a mutable object in apply makes output order-dependent.

**Diagnosis:** add assertions on intermediate results (row count, null count, value distributions) to catch where determinism breaks.`,
  alts:[
    "Why does my pandas pipeline produce different results each run?",
    "How do you make pandas operations deterministic?",
    "What causes sort instability in pandas?"
  ]
},

"pandas-27": {
  answer:
`**SCENARIO: merge() produces more rows than expected.**

This is always caused by duplicate keys creating a Cartesian product on the matching rows.

**Diagnosing:**
\`\`\`python
# Check key uniqueness before merging
print("Left duplicates:", df_left.duplicated(subset=['ticket_id']).sum())
print("Right duplicates:", df_right.duplicated(subset=['ticket_id']).sum())

# Or use validate:
pd.merge(left, right, on='ticket_id', validate='1:1')   # raises if either side has duplicates
pd.merge(left, right, on='ticket_id', validate='m:1')   # raises if right side has duplicates
\`\`\`

**What happens with duplicates:**
If left has 2 rows with ticket_id='T001' and right has 3 rows with ticket_id='T001', the merge produces 2×3=6 rows. A 1M-row file merging with a 10k lookup table with duplicates can explode to 1B rows.

**Fixing:**
\`\`\`python
# Option 1: deduplicate before merging
right_deduped = right.drop_duplicates(subset=['ticket_id'], keep='last')

# Option 2: aggregate before merging
right_agg = right.groupby('ticket_id')['value'].mean().reset_index()

# Option 3: use validate to catch the issue and investigate
\`\`\`

**Warning signs:** row count of merged DataFrame ≠ row count of larger input. Always verify: \`assert len(result) == len(left)\` for a left join if ticket_id is the primary key.`,
  alts:[
    "Why does my pandas merge produce more rows than the original?",
    "What causes row explosion in pandas merge?",
    "How do you use validate in pd.merge?"
  ]
},

"pandas-28": {
  answer:
`**SCENARIO: groupby().apply() is 100x slower than expected on 10M rows.**

\`apply\` is slow because it calls a Python function once per group — the overhead of Python function invocation and bypassed Cython optimizations add up.

**Diagnosis:**
\`\`\`python
%timeit df.groupby('agent_id').apply(my_func)   # measure the slow path
\`\`\`

**Fix 1 — Replace with built-in agg:**
\`\`\`python
# ✗ Slow:
df.groupby('agent_id').apply(lambda g: g['resolution_hours'].mean())
# ✓ Fast (Cython-optimized):
df.groupby('agent_id')['resolution_hours'].mean()
\`\`\`

**Fix 2 — Use transform + vectorized logic:**
\`\`\`python
# ✗ apply to flag above-median:
def flag(g): g['above_median'] = g['val'] > g['val'].median(); return g
df.groupby('agent_id').apply(flag)
# ✓ transform + vectorized:
df['above_median'] = df['val'] > df.groupby('agent_id')['val'].transform('median')
\`\`\`

**Fix 3 — Numba JIT for complex custom functions:**
\`\`\`python
from numba import njit
@njit
def custom_calc(values): ...
df.groupby('agent_id')['values'].apply(lambda g: custom_calc(g.values))
\`\`\`

**Fix 4 — Polars:** Polars groupby with custom expressions runs in parallel Rust — often 20-50x faster than pandas apply.`,
  alts:[
    "How do you speed up a slow pandas groupby apply?",
    "What is faster than groupby apply in pandas?",
    "When should I use transform instead of apply after groupby?"
  ]
},

"pandas-29": {
  answer:
`**SCENARIO: Daily CSV report from 5 source files — design a robust pandas pipeline.**

\`\`\`python
import pandas as pd
import pandera as pa
from pathlib import Path

# 1. Schema definitions
ticket_schema = pa.DataFrameSchema({
    'ticket_id': pa.Column(str, nullable=False, unique=True),
    'status': pa.Column(str, pa.Check.isin(['open','resolved','closed'])),
    'amount': pa.Column(float, pa.Check.ge(0), nullable=True),
})

# 2. Ingestion with validation
def load_and_validate(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, dtype={'ticket_id': str, 'status': 'category'})
    return ticket_schema.validate(df)

# 3. Transformation pipeline
def transform(df: pd.DataFrame) -> pd.DataFrame:
    return (
        df
        .assign(
            created_at=lambda d: pd.to_datetime(d['created_at']),
            resolution_hours=lambda d: (d['resolved_at'] - d['created_at']).dt.total_seconds() / 3600
        )
        .query("status != 'duplicate'")
        .drop_duplicates(subset=['ticket_id'], keep='last')
    )

# 4. Assemble
sources = [load_and_validate(p) for p in Path('data/').glob('*.csv')]
combined = pd.concat(sources, ignore_index=True)
result = transform(combined)

# 5. Output
result.to_csv(f'report_{pd.Timestamp.today().date()}.csv', index=False)
print(f"Report: {len(result)} rows, {result['ticket_id'].nunique()} unique tickets")
\`\`\``,
  alts:[
    "How do you build a production pandas data pipeline?",
    "How do you combine and validate multiple CSV files in pandas?",
    "What is the best structure for a pandas ETL pipeline?"
  ]
},

"pandas-30": {
  answer:
`**SCENARIO: 200-column DataFrame, 80% sparse — optimize storage and processing.**

**Step 1 — Assess sparsity:**
\`\`\`python
null_pct = df.isna().mean().sort_values(ascending=False)
sparse_cols = null_pct[null_pct > 0.8].index.tolist()
print(f"{len(sparse_cols)} columns are >80% null")
\`\`\`

**Step 2 — Drop genuinely useless columns:**
\`\`\`python
# Drop columns that are >95% null AND not needed by any downstream consumer
df = df.drop(columns=null_pct[null_pct > 0.95].index)
\`\`\`

**Step 3 — Sparse dtype for remaining sparse numeric columns:**
\`\`\`python
from pandas.arrays import SparseArray
for col in sparse_cols:
    if df[col].dtype in [np.float64, np.int64]:
        df[col] = pd.array(df[col], dtype=pd.SparseDtype(df[col].dtype, fill_value=0.0))
# Memory only used for non-zero/non-null values
\`\`\`

**Step 4 — Melt wide → long for ML feature engineering:**
\`\`\`python
# Instead of 200 columns where each row has 40 values, store as (id, feature, value)
melted = df.melt(id_vars=['customer_id'], var_name='feature', value_name='value').dropna()
# Now 200 × 100k rows → 40 × 100k = 4M rows — much smaller and no sparsity
\`\`\`

**Step 5 — Parquet with snappy compression:**
Parquet's columnar storage + RLE encoding + snappy compression reduces sparse wide tables 10-20x vs CSV.`,
  alts:[
    "How do you optimize memory usage for a sparse wide DataFrame in pandas?",
    "What is pandas SparseDtype and when should I use it?",
    "How do you convert a wide DataFrame to long format?"
  ]
}
