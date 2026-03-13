# DuckDB BigQuery Extension

Connect DuckDB to Google BigQuery for querying, creating, and manipulating BigQuery datasets and tables using standard SQL.

## Overview

The BigQuery extension uses BigQuery Storage Read/Write APIs and REST API to:
- Query BigQuery tables directly from DuckDB
- Create and manage BigQuery datasets and tables
- Insert data into BigQuery
- Read from public datasets
- Map BigQuery GEOGRAPHY to DuckDB GEOMETRY (v1.5+)

**Supported platforms**: `linux_amd64`, `linux_arm64`, `linux_amd64_musl`, `osx_amd64`, `osx_arm64`, `windows_amd64`.
**Not supported**: WASM builds, `windows_amd64_mingw`.

## Installation

```sql
-- Install from Community Extension Repository (no unsigned mode needed)
FORCE INSTALL 'bigquery' FROM community;
LOAD 'bigquery';
```

**Windows only**: Requires gRPC SSL certificate configuration. Download `roots.pem` and set `GRPC_DEFAULT_SSL_ROOTS_FILE_PATH`:

```bash
@powershell -NoProfile -ExecutionPolicy unrestricted -Command ^
    (new-object System.Net.WebClient).Downloadfile( ^
        'https://pki.google.com/roots.pem', 'roots.pem')
set GRPC_DEFAULT_SSL_ROOTS_FILE_PATH=%cd%\roots.pem
```

## Authentication

Three methods (checked in this order):

### 1. DuckDB Secrets (recommended for multi-tenant/server use)

```sql
-- Create a secret for a specific project
CREATE PERSISTENT SECRET bigquery_secret (
    TYPE BIGQUERY,
    SCOPE 'bq://my_gcp_project',
    SERVICE_ACCOUNT_PATH '/path/to/service-account-key.json'
);

-- Or use inline JSON
CREATE PERSISTENT SECRET bigquery_secret (
    TYPE BIGQUERY,
    SCOPE 'bq://my_gcp_project',
    SERVICE_ACCOUNT_JSON '{"type":"service_account",...}'
);

-- Temporary OAuth2 token (expires after ~1 hour)
CREATE PERSISTENT SECRET bigquery_secret (
    TYPE BIGQUERY,
    SCOPE 'bq://my_gcp_project',
    ACCESS_TOKEN 'ya29.xxx...'  -- from `gcloud auth print-access-token`
);

-- Workload Identity Federation (external accounts)
CREATE PERSISTENT SECRET bigquery_secret (
    TYPE BIGQUERY,
    SCOPE 'bq://my_gcp_project',
    EXTERNAL_ACCOUNT_PATH '/path/to/external-account.json'
);

-- Update a secret when credentials change
CREATE OR REPLACE SECRET bigquery_secret (
    TYPE BIGQUERY,
    SCOPE 'bq://my_gcp_project',
    SERVICE_ACCOUNT_PATH '/new/path/to/key.json'
);
```

**Multi-project example**:

```sql
-- Create separate secrets for different projects
CREATE PERSISTENT SECRET project_a_secret (
    TYPE BIGQUERY,
    SCOPE 'bq://project-a',
    SERVICE_ACCOUNT_PATH '/path/to/project-a-key.json'
);

CREATE PERSISTENT SECRET project_b_secret (
    TYPE BIGQUERY,
    SCOPE 'bq://project-b',
    SERVICE_ACCOUNT_PATH '/path/to/project-b-key.json'
);

-- Each ATTACH automatically uses the matching secret
ATTACH 'project=project-a' AS bq_a (TYPE bigquery);
ATTACH 'project=project-b' AS bq_b (TYPE bigquery);
```

### 2. Environment Variable (machine-wide)

```bash
# Linux/macOS
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-credentials.json"

# Windows
set GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account-credentials.json"
```

### 3. User Account (developer-local)

```bash
gcloud auth application-default login
```

## Basic Usage

### Attach to a BigQuery Project

```sql
-- Attach entire project (all datasets)
ATTACH 'project=my_gcp_project' AS bq (TYPE bigquery, READ_ONLY);

-- Show all tables across all datasets
SHOW ALL TABLES;

-- Query a table
SELECT * FROM bq.dataset_name.table_name;
```

### Attach to a Single Dataset (faster)

```sql
-- Focus on one dataset to speed up catalog initialization
ATTACH 'project=my_gcp_project dataset=my_dataset' AS bq (TYPE bigquery);

SHOW ALL TABLES;
-- Only shows tables in my_dataset
```

### Separate Billing from Storage Project

```sql
-- Query data in storage_project, bill compute to billing_project
ATTACH 'project=storage_project billing_project=billing_project' AS bq (TYPE bigquery, READ_ONLY);

SELECT * FROM bq.dataset.table WHERE condition;
-- Compute costs go to billing_project, data is in storage_project
```

## Key Functions

### `bigquery_scan` — Direct Table Reads

Fast, direct reads from a single table using BigQuery Storage Read API. Supports filter pushdown.

```sql
-- Basic scan
SELECT * FROM bigquery_scan('my_gcp_project.dataset.table');

-- With filter pushdown (reduces data transfer)
SELECT * FROM bigquery_scan(
    'my_gcp_project.dataset.table',
    filter='date >= "2024-01-01" AND category = "sales"'
);

-- Query a public dataset
SELECT * FROM bigquery_scan(
    'bigquery-public-data.geo_us_boundaries.states',
    billing_project='my_gcp_project'
);
```

**Named parameters**:

| Parameter         | Type      | Description                                             |
|-------------------|-----------|---------------------------------------------------------|
| `filter`          | VARCHAR   | Row restriction filter (BigQuery Storage Read API syntax) |
| `use_legacy_scan` | BOOLEAN   | Use legacy scan: `true` (legacy) or `false` (default)     |
| `billing_project` | VARCHAR   | Project to bill (for public datasets)                   |
| `api_endpoint`    | VARCHAR   | Custom BigQuery API endpoint                            |
| `grpc_endpoint`   | VARCHAR   | Custom BigQuery Storage gRPC endpoint                   |

**Limitations**:
- Does **not** support views or external tables (use `bigquery_query` instead)
- Filter syntax: [BigQuery Storage Read API row_restriction](https://cloud.google.com/bigquery/docs/reference/storage/rpc/google.cloud.bigquery.storage.v1#google.cloud.bigquery.storage.v1.ReadSession.TableReadOptions)

### `bigquery_query` — Custom GoogleSQL Queries

Execute GoogleSQL queries in BigQuery, read results in DuckDB. Works with views and external tables.

```sql
-- Custom query
SELECT * FROM bigquery_query(
    'my_gcp_project',
    'SELECT * FROM `my_gcp_project.dataset.table` WHERE date > "2024-01-01"'
);

-- Query a view (not supported by bigquery_scan)
SELECT * FROM bigquery_query(
    'my_gcp_project',
    'SELECT * FROM `my_gcp_project.dataset.my_view`'
);

-- Parameterized query (positional placeholders)
SELECT * FROM bigquery_query(
    'my_gcp_project',
    'SELECT ? AS x, ? AS y',
    42, 'abc'
);

-- With prepared statements
PREPARE s AS
    SELECT * FROM bigquery_query('my_gcp_project', 'SELECT ? AS val', ?);
EXECUTE s(123);

-- Dry run (validate query, estimate cost)
SELECT * FROM bigquery_query(
    'my_gcp_project',
    'SELECT * FROM `my_gcp_project.dataset.large_table`',
    dry_run=true
);
-- Returns: total_bytes_processed, cache_hit, location
```

**Named parameters**:

| Parameter         | Type      | Description                                             |
|-------------------|-----------|---------------------------------------------------------|
| `use_legacy_scan` | BOOLEAN   | Use legacy scan: `true` (legacy) or `false` (default)     |
| `dry_run`         | BOOLEAN   | Validate without executing; returns cost estimate        |
| `billing_project` | VARCHAR   | Project to bill (for public datasets)                   |
| `api_endpoint`    | VARCHAR   | Custom BigQuery API endpoint                            |
| `grpc_endpoint`   | VARCHAR   | Custom BigQuery Storage gRPC endpoint                   |

**When to use**:
- `bigquery_scan`: Direct table reads, simple queries, good default
- `bigquery_arrow_scan`: Large table reads where throughput matters (Arrow-optimized path)
- `bigquery_query`: Views, external tables, complex GoogleSQL, custom logic

### `bigquery_execute` — Run Arbitrary GoogleSQL

Execute GoogleSQL commands without fetching results (DDL, configuration, etc.).

```sql
-- Create a dataset with options
CALL bigquery_execute('my_gcp_project', '
    CREATE SCHEMA deluxe_dataset
    OPTIONS(
        location="us",
        default_table_expiration_days=3.75,
        labels=[("env","prod"),("team","data")]
    )
');

-- Returns: success, job_id, project_id, location, total_rows, total_bytes_processed

-- Dry run
CALL bigquery_execute(
    'my_gcp_project',
    'SELECT * FROM `my_gcp_project.dataset.table`',
    dry_run=true
);
-- Returns: total_bytes_processed, cache_hit, location
```

**Named parameters**:

| Parameter       | Type      | Description                                 |
|-----------------|-----------|---------------------------------------------|
| `dry_run`       | BOOLEAN   | Validate without executing; returns estimate |
| `api_endpoint`  | VARCHAR   | Custom BigQuery API endpoint                |
| `grpc_endpoint` | VARCHAR   | Custom BigQuery Storage gRPC endpoint       |

### `bigquery_jobs` — List Jobs

```sql
ATTACH 'project=my_gcp_project' AS bq (TYPE bigquery);

-- List recent jobs
SELECT job_id, state, configuration, status
FROM bigquery_jobs('bq', maxResults=10);

-- Filter by state
SELECT * FROM bigquery_jobs('bq', stateFilter='RUNNING');

-- Get a specific job
SELECT * FROM bigquery_jobs('bq', jobId='job_abc123...');
```

**Named parameters**:

| Parameter         | Type      | Description                                       |
|-------------------|-----------|---------------------------------------------------|
| `jobId`           | VARCHAR   | Fetch a specific job (ignores other filters)      |
| `allUsers`        | BOOLEAN   | Show jobs from all users (default: current user)  |
| `maxResults`      | INTEGER   | Limit number of jobs returned                     |
| `minCreationTime` | TIMESTAMP | Filter jobs created after this time               |
| `maxCreationTime` | TIMESTAMP | Filter jobs created before this time              |
| `stateFilter`     | VARCHAR   | Filter by state: `PENDING`, `RUNNING`, `DONE`     |
| `parentJobId`     | VARCHAR   | Show child jobs of a parent job                   |

### `bigquery_arrow_scan` — Optimized Arrow-Based Scanning

Uses the Arrow-native scan path for improved performance over the default `bigquery_scan`. Same parameters as `bigquery_scan`.

```sql
-- Arrow-optimized scan (faster for large tables)
SELECT * FROM bigquery_arrow_scan('my_gcp_project.dataset.large_table');

-- With filter pushdown
SELECT * FROM bigquery_arrow_scan(
    'my_gcp_project.dataset.events',
    filter='date >= "2024-01-01"',
    billing_project='my_gcp_project'
);
```

**When to use**: Prefer `bigquery_arrow_scan` for large reads where throughput matters. Falls back gracefully if the Arrow path isn't available.

### `bigquery_clear_cache` — Refresh Schema Cache

```sql
-- Clear cached schema metadata after external changes
CALL bigquery_clear_cache();
```

## DDL Operations

```sql
ATTACH 'project=my_gcp_project' AS bq (TYPE bigquery);

-- Create dataset
CREATE SCHEMA bq.my_dataset;

-- Create table
CREATE TABLE bq.my_dataset.my_table(id INTEGER, name VARCHAR);

-- Insert data
INSERT INTO bq.my_dataset.my_table VALUES (1, 'Alice'), (2, 'Bob');

-- Query
SELECT * FROM bq.my_dataset.my_table;

-- Alter table
ALTER TABLE bq.my_dataset.my_table RENAME TO renamed_table;
ALTER TABLE bq.my_dataset.my_table RENAME COLUMN id TO user_id;
ALTER TABLE bq.my_dataset.my_table ADD COLUMN email VARCHAR;
ALTER TABLE bq.my_dataset.my_table DROP COLUMN name;
ALTER TABLE bq.my_dataset.my_table ALTER COLUMN id TYPE DOUBLE;
ALTER TABLE bq.my_dataset.my_table ALTER COLUMN id DROP NOT NULL;

-- Drop table
DROP TABLE IF EXISTS bq.my_dataset.my_table;

-- Drop dataset
DROP SCHEMA IF EXISTS bq.my_dataset;
```

## Working with Geometries

BigQuery `GEOGRAPHY` columns map to DuckDB `GEOMETRY` (v1.5+). No special settings needed.

```sql
ATTACH 'project=my_gcp_project' AS bq (TYPE bigquery);

-- Read GEOGRAPHY as GEOMETRY
SELECT name, geo_column, typeof(geo_column)
FROM bq.dataset.geo_table;
-- geo_column type: GEOMETRY

-- Write GEOMETRY to GEOGRAPHY
INSERT INTO bq.dataset.geo_table VALUES
    ('Point A', 'POINT(-122.4194 37.7749)'::GEOMETRY),
    ('Polygon B', 'POLYGON((-122.5 37.7, -122.3 37.8, -122.4 37.9, -122.5 37.7))'::GEOMETRY);

-- BigQuery GEOGRAPHY is always WGS84 (OGC:CRS84 / EPSG:4326)
-- Use ST_Transform if your GEOMETRY has a different CRS
LOAD spatial;
INSERT INTO bq.dataset.geo_table
SELECT name, ST_Transform(geom, 'EPSG:4326')
FROM local_table_with_utm_geom;
```

**v1.5 migration**: Pre-v1.5 required `LOAD spatial; SET bq_geography_as_geometry = true;` — both are **no longer needed**. DuckDB v1.5 moved `GEOMETRY` into core, so BigQuery `GEOGRAPHY` columns map to `GEOMETRY` automatically. The `bq_geography_as_geometry` setting is effectively deprecated.

**Axis order warning**: DuckDB v1.5 introduces `SET geometry_always_xy = true` to enforce consistent lon,lat (X,Y) axis order. Set this when mixing BigQuery geometries with other spatial sources to avoid subtle coordinate-flip bugs. In DuckDB v2.0, the old behavior becomes an error.

## Experimental: Partitioning, Clustering, Table Options

Enable BigQuery-specific CREATE TABLE clauses:

```sql
SET bq_experimental_enable_sql_parser = true;
ATTACH 'project=my_gcp_project dataset=my_dataset' AS bq (TYPE bigquery);

-- Create table with partitioning, clustering, and options
CREATE TABLE bq.my_dataset.events (
    ts TIMESTAMP,
    user_id BIGINT,
    event_type VARCHAR
)
PARTITION BY DATE(ts)
CLUSTER BY user_id, event_type
OPTIONS (
    description="User events table",
    expiration_timestamp=TIMESTAMP "2026-12-31 00:00:00 UTC"
);

-- Pseudo-column partitioning
CREATE TABLE bq.my_dataset.daily_data (
    value DOUBLE
)
PARTITION BY _PARTITIONDATE;
```

## Extension Settings

```sql
-- Use legacy scan instead of optimized Arrow-based scan
SET bq_use_legacy_scan = false;  -- default: false (use Arrow scan)

-- Read BIGNUMERIC as VARCHAR (legacy scan only)
SET bq_bignumeric_as_varchar = false;  -- default: false

-- Query timeout (milliseconds)
SET bq_query_timeout_ms = 90000;  -- default: 90 seconds

-- Debug: print all queries sent to BigQuery
SET bq_debug_show_queries = false;  -- default: false

-- Filter pushdown (experimental)
SET bq_experimental_filter_pushdown = true;  -- default: true

-- Use INFORMATION_SCHEMA for catalog (experimental, often faster)
SET bq_experimental_use_info_schema = true;  -- default: true

-- Enable BigQuery-specific CREATE TABLE clauses
SET bq_experimental_enable_sql_parser = false;  -- default: false

-- cURL CA bundle path for SSL verification
SET bq_curl_ca_bundle_path = '/path/to/ca-bundle.pem';

-- Max read streams (0 = auto-match DuckDB threads)
-- Requires SET preserve_insertion_order = FALSE for parallelization
SET bq_max_read_streams = 0;  -- default: 0

-- Arrow compression for Storage Read API
SET bq_arrow_compression = 'ZSTD';  -- options: UNSPECIFIED, LZ4_FRAME, ZSTD

-- Incubating scan: experimental high-performance scan path (v1.5+)
SET bq_experimental_use_incubating_scan = true;  -- default: false

-- Default geographic location for query execution
SET bq_default_location = 'US';  -- default: unset (auto-detected)
```

## Limitations

1. **Views and External Tables**: `bigquery_scan` does **not** support views or external tables (BigQuery Storage Read API limitation). Use `bigquery_query` instead.

2. **Propagation Delay**: After `CREATE TABLE`, there may be a brief delay (seconds to ~1 minute) before the table is fully visible. Avoid immediate `INSERT` after `CREATE TABLE ... AS`.

3. **BIGNUMERIC Not Supported**: BigQuery's `BIGNUMERIC` (precision up to 76 digits, scale up to 38) exceeds DuckDB's `DECIMAL` max precision (38). Tables with `BIGNUMERIC` columns are skipped during catalog queries. Workaround: convert to `STRING` in BigQuery or use `bigquery_query()`.

   - Legacy setting `bq_bignumeric_as_varchar` only works with `use_legacy_scan=true` (not recommended).

4. **Primary/Foreign Keys**: BigQuery's PK/FK constraints differ from traditional RDBMS. This extension does **not** support them.

## Reading Public Datasets

Specify your project as `billing_project`:

```sql
-- Query a public dataset
SELECT * FROM bigquery_scan(
    'bigquery-public-data.geo_us_boundaries.states',
    billing_project='my_gcp_project'
);

-- Or with ATTACH
ATTACH 'project=bigquery-public-data billing_project=my_gcp_project' AS pub (TYPE bigquery, READ_ONLY);
SELECT * FROM pub.geo_us_boundaries.states;
```

## Common Patterns

### Incremental Loads

```sql
-- Read new data since last sync
SELECT * FROM bigquery_scan(
    'my_gcp_project.dataset.events',
    filter='timestamp >= "2024-03-10T00:00:00"'
);

-- Write to local Parquet for caching
COPY (
    SELECT * FROM bigquery_scan(
        'my_gcp_project.dataset.events',
        filter='date = "2024-03-10"'
    )
) TO 'events_2024_03_10.parquet';
```

### Join BigQuery with Local Data

```sql
ATTACH 'project=my_gcp_project' AS bq (TYPE bigquery, READ_ONLY);

-- Join BigQuery table with local Parquet
SELECT l.user_id, l.action, b.user_name, b.email
FROM 'local_events.parquet' l
JOIN bq.dataset.users b ON l.user_id = b.id;
```

### Export BigQuery Results to DuckDB

```sql
-- Query in BigQuery, materialize in DuckDB
CREATE TABLE local_summary AS
    SELECT * FROM bigquery_query(
        'my_gcp_project',
        'SELECT region, SUM(revenue) as total
         FROM `my_gcp_project.dataset.sales`
         GROUP BY region'
    );

-- Now work with local_summary in DuckDB
SUMMARIZE local_summary;
```

## Performance Tuning

### Parallel Read Streams

By default, `bq_max_read_streams = 0` auto-matches DuckDB thread count. For maximum throughput on large tables, disable insertion order preservation:

```sql
SET preserve_insertion_order = FALSE;
SET bq_max_read_streams = 0;  -- auto, or set explicit count

SELECT * FROM bigquery_scan('project.dataset.large_table');
```

Without `preserve_insertion_order = FALSE`, parallelization is limited because rows must arrive in order.

### Incubating Scan (Experimental, v1.5+)

The incubating scan path offers significantly improved performance for large reads by addressing stream imbalance issues in the default scan:

```sql
SET bq_experimental_use_incubating_scan = true;

-- Combine with parallel streams for best throughput
SET preserve_insertion_order = FALSE;
SELECT * FROM bigquery_scan('project.dataset.large_table');
```

**Known limitation**: The default scan can exhibit stream imbalance where one stream receives ~70% of rows. The incubating scan is designed to address this. Enable it for large analytical workloads; for small queries, the default scan is fine.

### Compression

Reduce network transfer size with Arrow compression:

```sql
SET bq_arrow_compression = 'ZSTD';   -- best ratio (default)
-- SET bq_arrow_compression = 'LZ4_FRAME';  -- faster compression/decompression
```

## Cost Optimization Tips

1. **Use `bigquery_scan` with filters** to reduce data transfer:
   ```sql
   SELECT * FROM bigquery_scan('project.dataset.table', filter='date >= "2024-01-01"');
   ```

2. **Dry run to estimate costs**:
   ```sql
   SELECT * FROM bigquery_query('project', 'SELECT ...', dry_run=true);
   -- Check total_bytes_processed before running
   ```

3. **Cache results locally**:
   ```sql
   COPY (SELECT * FROM bq.dataset.table) TO 'cache.parquet';
   ```

4. **Use `billing_project` for public datasets** to avoid unexpected charges on your main project.

5. **Filter early**: Push filters to BigQuery rather than filtering in DuckDB.

## References

- [Official BigQuery Extension GitHub](https://github.com/hafenkran/duckdb-bigquery)
- [DuckDB Community Extensions](https://community-extensions.duckdb.org/)
- [BigQuery Storage Read API](https://cloud.google.com/bigquery/docs/reference/storage)
- [BigQuery Pricing](https://cloud.google.com/bigquery/pricing)
