# DuckLake — Comprehensive Reference

> **Version**: DuckLake 0.4 (experimental, v0.x) — released 2026-02-23
> **Previous**: DuckLake 0.3 (2025-09-17)
> **Requires**: DuckDB v1.5.x "Variegata" (0.4) / DuckDB v1.4.x (0.3) / DuckDB v1.3.x (0.1-0.2)
> **License**: MIT
> **Website**: https://ducklake.select
> **Source**: https://github.com/duckdb/ducklake
> **1.0 Target**: March/April 2026

---

## 1. What Is DuckLake?

DuckLake is an **open lakehouse format** built on **SQL and Parquet**. It stores:
- **Metadata** in any ACID-capable SQL database (DuckDB, PostgreSQL, SQLite, MySQL)
- **Data** as immutable Parquet files on any filesystem (local, S3, GCS, Azure, NFS, etc.)

### How It Differs from Iceberg / Delta / Hudi

| Aspect | DuckLake | Apache Iceberg | Delta Lake | Apache Hudi |
|--------|----------|---------------|------------|-------------|
| **Metadata format** | SQL tables in any RDBMS | JSON/Avro manifest files | JSON transaction log files | Timeline metadata files |
| **Metadata storage** | PostgreSQL, SQLite, DuckDB, MySQL | Object storage (same as data) | Object storage (same as data) | Object storage |
| **Catalog** | Built-in (the SQL DB *is* the catalog) | Requires separate catalog (REST, Hive, Nessie) | Unity Catalog or Hive | Hive Metastore |
| **Snapshot overhead** | Lightweight — single row per snapshot | Heavy — full manifest rewrite | Heavy — log checkpointing | Heavy — timeline archival |
| **Data format** | Parquet only | Parquet, ORC, Avro | Parquet only | Parquet, ORC, HFile |
| **Concurrency** | Delegated to catalog DB (Postgres = full MVCC) | Optimistic concurrency | Optimistic concurrency | Optimistic concurrency |
| **File immutability** | Yes — never modifies/appends existing files | Yes | Yes (mostly) | No (can do in-place upserts) |
| **Complexity** | Very low — just SQL + Parquet | High | Medium-High | Very High |
| **Multi-table transactions** | Yes (via catalog DB transactions) | No | No | No |

**Key insight**: By storing metadata in a real database, DuckLake avoids the "metadata-in-files" problem that plagues Iceberg/Delta (costly list operations, manifest management, log compaction). The SQL database handles transactions, indexing, and concurrency natively.

---

## 2. Architecture

```
┌─────────────────┐     SQL queries      ┌──────────────────────┐
│  DuckDB Client  │◄────────────────────►│  Catalog Database    │
│  (ducklake ext) │                       │  (Postgres/SQLite/   │
│                 │                       │   DuckDB/MySQL)      │
│                 │     Read/Write        │  - 22 metadata tables│
│                 │◄───────────────►      └──────────────────────┘
│                 │   Parquet files
│                 │◄───────────────►  ┌──────────────────────┐
└─────────────────┘                   │  Data Storage         │
                                      │  (Local / S3 / GCS /  │
                                      │   Azure / NFS / SMB)  │
                                      │  - Immutable Parquet  │
                                      │  - Delete files       │
                                      └──────────────────────┘
```

- **Files are never modified** — only new files are created
- **Updates** = delete file + new insert file (merge-on-read)
- **Deletes** = Parquet file containing row IDs to skip
- **Schema** tracked in catalog with full versioning

---

## 3. Installation & Setup

```sql
-- Install the extension
INSTALL ducklake;

-- Or install latest dev version
FORCE INSTALL ducklake FROM core_nightly;

-- Load (auto-loaded on ATTACH, but can be explicit)
LOAD ducklake;
```

---

## 4. Creating & Attaching DuckLake Databases

### Basic local DuckLake (DuckDB catalog)

```sql
ATTACH 'ducklake:metadata.ducklake' AS my_ducklake;
USE my_ducklake;
-- Creates metadata.ducklake (DuckDB file) + metadata.ducklake.files/ directory
```

### With explicit data path

```sql
ATTACH 'ducklake:metadata.ducklake' AS my_ducklake (DATA_PATH '/data/warehouse/');
```

### PostgreSQL catalog (multi-client)

```sql
INSTALL postgres;
ATTACH 'ducklake:postgres:dbname=ducklake_catalog host=localhost' AS my_ducklake
    (DATA_PATH 's3://my-bucket/warehouse/');
```

### SQLite catalog (multi-process, file-level locking)

```sql
INSTALL sqlite;
ATTACH 'ducklake:sqlite:metadata.sqlite' AS my_ducklake
    (DATA_PATH 'data_files/');
```

### MySQL catalog (not recommended — known issues)

```sql
INSTALL mysql;
ATTACH 'ducklake:mysql:db=ducklake_catalog host=localhost' AS my_ducklake
    (DATA_PATH 'data_files/');
```

### Using secrets (for reusable connection config)

```sql
CREATE SECRET (
    TYPE DUCKLAKE,
    METADATA_PATH 'metadata.db',
    DATA_PATH '/data/my_data_path'
);
-- Then just:
ATTACH 'ducklake:' AS my_ducklake;

-- Named secrets
CREATE SECRET my_config (
    TYPE DUCKLAKE,
    METADATA_PATH 'other.db',
    DATA_PATH '/data/other_path'
);
ATTACH 'ducklake:' AS my_ducklake (SECRET 'my_config');
```

### With encryption

```sql
ATTACH 'ducklake:metadata.ducklake' AS my_ducklake
    (DATA_PATH '/data/encrypted/', ENCRYPTED);
-- All Parquet files (data + deletes) are encrypted
-- Encryption keys stored in catalog metadata
-- Files are unreadable without DuckLake
```

### With data inlining

```sql
ATTACH 'ducklake:metadata.ducklake' AS my_ducklake
    (DATA_INLINING_ROW_LIMIT 10);
-- Small inserts (<= 10 rows) stored directly in catalog DB
```

### With metadata catalog name (for inspection)

```sql
ATTACH 'ducklake:metadata.ducklake' AS my_ducklake
    (DATA_PATH '/data/', METADATA_CATALOG 'my_meta');
-- Now you can query my_meta.ducklake_snapshot, etc.
```

### Attach at specific snapshot (read-only time travel)

```sql
ATTACH 'ducklake:metadata.duckdb' (SNAPSHOT_VERSION 3);
ATTACH 'ducklake:metadata.duckdb' (SNAPSHOT_TIME '2025-05-26 00:00:00');
```

### Read-only mode

```sql
ATTACH 'ducklake:metadata.ducklake' AS my_ducklake (READ_ONLY);
```

### Detach

```sql
USE memory;
DETACH my_ducklake;
```

### CLI shortcut

```bash
duckdb ducklake:metadata.ducklake
```

---

## 5. Catalog Database Choices

| Catalog DB | Multi-client? | Notes |
|-----------|--------------|-------|
| **DuckDB** | ❌ Single client only | Simplest setup, full DuckLake features including time travel |
| **SQLite** | ✅ Limited (file locking) | Retry-based concurrency, reasonable multi-process |
| **PostgreSQL** | ✅ Full MVCC | Recommended for production multi-user, requires PostgreSQL 12+ |
| **MySQL** | ⚠️ Known issues | MySQL 8+, not recommended due to DuckDB MySQL connector limitations |

---

## 6. SQL Operations

### CREATE TABLE

```sql
CREATE TABLE my_ducklake.customers (
    id INTEGER,
    name VARCHAR,
    created_at TIMESTAMP
);

-- CREATE TABLE AS
CREATE TABLE my_ducklake.imported AS
    FROM 'https://example.com/data.csv';
```

### INSERT

```sql
INSERT INTO my_ducklake.customers VALUES (1, 'Alice', now());
INSERT INTO my_ducklake.customers SELECT * FROM staging_table;
INSERT INTO my_ducklake.customers FROM range(1000) t(i)
    SELECT i, 'user_' || i, now();
```

### UPDATE

```sql
UPDATE my_ducklake.customers SET name = 'Bob' WHERE id = 1;
-- Internally: creates a delete file + new data file
```

### DELETE

```sql
DELETE FROM my_ducklake.customers WHERE id > 100;

-- TRUNCATE (delete all rows)
TRUNCATE TABLE my_ducklake.customers;
```

### MERGE INTO

```sql
MERGE INTO Stock AS s
USING Buy AS b ON s.item_id = b.item_id
WHEN MATCHED THEN UPDATE SET balance = s.balance + b.volume
WHEN NOT MATCHED THEN INSERT VALUES (b.item_id, b.volume);
```

### DROP TABLE

```sql
DROP TABLE my_ducklake.customers;
-- Data files NOT deleted (accessible via time travel)
-- Use expire_snapshots + cleanup to physically remove
```

### Views

```sql
CREATE VIEW my_ducklake.active_customers AS
    SELECT * FROM my_ducklake.customers WHERE active = true;
ALTER VIEW my_ducklake.active_customers RENAME TO vw_active;
DROP VIEW my_ducklake.active_customers;
```

### Schemas

```sql
CREATE SCHEMA my_ducklake.analytics;
CREATE TABLE my_ducklake.analytics.events (id INT, type VARCHAR);
```

### Macros

```sql
CREATE MACRO my_ducklake.double(x) AS x * 2;
```

---

## 7. Schema Evolution

### Add column

```sql
ALTER TABLE my_ducklake.tbl ADD COLUMN new_col VARCHAR;
ALTER TABLE my_ducklake.tbl ADD COLUMN nested_col STRUCT(a INT, b VARCHAR);
-- Existing data returns NULL for the new column
```

### Add column with default

```sql
ALTER TABLE my_ducklake.tbl ADD COLUMN status VARCHAR DEFAULT 'active';
```

### Drop column

```sql
ALTER TABLE my_ducklake.tbl DROP COLUMN old_col;
```

### Rename column

```sql
ALTER TABLE my_ducklake.tbl RENAME COLUMN old_name TO new_name;
```

### Rename table

```sql
ALTER TABLE my_ducklake.tbl RENAME TO new_table_name;
```

### Type promotion

```sql
-- Promote column types (e.g., INTEGER → BIGINT, FLOAT → DOUBLE)
ALTER TABLE my_ducklake.tbl ALTER COLUMN val TYPE BIGINT;
```

### Struct evolution

```sql
-- Add fields to struct columns
ALTER TABLE my_ducklake.tbl ALTER COLUMN my_struct TYPE STRUCT(a INT, b VARCHAR, c DOUBLE);
-- Works with nested structs, lists of structs, maps of structs
```

### Comments

```sql
COMMENT ON TABLE my_ducklake.tbl IS 'Main transaction table';
COMMENT ON COLUMN my_ducklake.tbl.id IS 'Primary identifier';
```

---

## 8. Time Travel & Versioning

### Query at specific version

```sql
SELECT * FROM tbl AT (VERSION => 3);
```

### Query at timestamp

```sql
SELECT * FROM tbl AT (TIMESTAMP => now() - INTERVAL '1 week');
```

### List all snapshots

```sql
FROM my_ducklake.snapshots();
-- Returns: snapshot_id, snapshot_time, schema_version, changes, author, commit_message, commit_extra_info
```

### Current snapshot

```sql
FROM my_ducklake.current_snapshot();
-- Returns: id
```

### Last committed snapshot (for current connection)

```sql
FROM my_ducklake.last_committed_snapshot();
-- Returns NULL if no commits from this connection
```

### Attach at snapshot

```sql
ATTACH 'ducklake:metadata.duckdb' (SNAPSHOT_VERSION 3);
ATTACH 'ducklake:metadata.duckdb' (SNAPSHOT_TIME '2025-05-26 00:00:00');
```

### Commit messages

```sql
BEGIN;
INSERT INTO my_ducklake.tbl VALUES (1, 'data');
CALL my_ducklake.set_commit_message(
    'Pedro',
    'Inserting initial data',
    extra_info => '{"source": "etl_pipeline"}'
);
COMMIT;
```

---

## 9. Change Data Feed (table_changes)

Track what changed between snapshots:

```sql
-- By snapshot IDs
FROM my_ducklake.table_changes('my_table', 2, 5);

-- By timestamps
FROM my_ducklake.table_changes('my_table',
    TIMESTAMP '2025-01-01',
    TIMESTAMP '2025-06-01'
);

-- Returns columns: snapshot_id, rowid, change_type, <all table columns>
-- change_type values: 'insert', 'delete', 'update_preimage', 'update_postimage'
```

---

## 10. Partitioning

```sql
-- Set partitioning on existing table
ALTER TABLE my_ducklake.tbl SET PARTITIONED BY (region);

-- Multi-key partitioning
ALTER TABLE my_ducklake.tbl SET PARTITIONED BY (year, month);

-- Partition transforms (year/month/day extraction)
ALTER TABLE my_ducklake.tbl SET PARTITIONED BY (year(created_at), month(created_at));

-- Files are stored in Hive-style directories:
-- data_path/schema/table/region=US/ducklake-xxx.parquet

-- Partition pruning is automatic:
SELECT * FROM tbl WHERE region = 'US';
-- Only reads files in region=US partition

-- Update partition function
ALTER TABLE my_ducklake.tbl SET PARTITIONED BY (new_partition_col);

-- Disable partitioning
ALTER TABLE my_ducklake.tbl SET PARTITIONED BY ();
```

---

## 11. Metadata Catalog Structure

DuckLake 0.4 uses **22+ tables**. The key ones:

```sql
-- Core tables
ducklake_metadata          -- Key-value settings (scope: global/schema/table)
ducklake_snapshot          -- Snapshot registry (id, time, schema_version)
ducklake_snapshot_changes  -- Change descriptions, author, commit messages
ducklake_schema            -- Schema definitions with versioning
ducklake_table             -- Table definitions with versioning
ducklake_view              -- View definitions
ducklake_column            -- Column definitions (type, defaults, nullability, parent)

-- Data files
ducklake_data_file         -- Parquet file references (path, size, row count, encryption)
ducklake_delete_file       -- Delete file references
ducklake_file_column_stats -- Per-file, per-column statistics (min/max/null count)

-- Statistics
ducklake_table_stats       -- Table-level stats (record count, file size, next row ID)
ducklake_table_column_stats-- Table-level column stats

-- Partitioning
ducklake_partition_info         -- Partition definitions
ducklake_partition_column       -- Partition key columns + transforms
ducklake_file_partition_value   -- Per-file partition values

-- Tags (comments)
ducklake_tag               -- Object-level tags/comments
ducklake_column_tag        -- Column-level tags/comments

-- Maintenance
ducklake_files_scheduled_for_deletion  -- Files pending cleanup

-- Data inlining
ducklake_inlined_data_tables  -- Tracks which tables have inlined data

-- Column mapping (for external file ingestion)
ducklake_column_mapping    -- Mapping definitions
ducklake_name_mapping      -- Column name → field ID mappings

-- Schema versioning
ducklake_schema_versions   -- Schema version tracking
```

You can inspect these by attaching with `METADATA_CATALOG`:

```sql
ATTACH 'ducklake:metadata.ducklake' AS dl (METADATA_CATALOG 'meta');
SELECT * FROM meta.ducklake_snapshot;
SELECT * FROM meta.ducklake_data_file;
```

---

## 12. Transaction Support & ACID

- **ACID transactions** delegated to the catalog database
- **Multi-table transactions** supported (unlike Iceberg/Delta)
- **Optimistic concurrency** with conflict detection at file level

```sql
BEGIN;
CREATE TABLE my_ducklake.a (id INT);
INSERT INTO my_ducklake.a VALUES (1);
CREATE TABLE my_ducklake.b (id INT);
INSERT INTO my_ducklake.b VALUES (2);
COMMIT;  -- Atomic: both tables created or neither
```

### Conflict handling

- Concurrent inserts to the **same table** are detected
- File-level conflict detection prevents lost updates
- Transaction rollback cleans up any files written

### Multi-client access

- **PostgreSQL catalog**: Full concurrent read/write from multiple DuckDB instances
- **SQLite catalog**: File-level locking with retry, reasonable concurrency
- **DuckDB catalog**: Single client only
- **MySQL catalog**: Supported but not recommended

---

## 13. Data Inlining

> **v0.4 Change**: Inlining is now **enabled by default** for DuckLake databases. Small inserts are automatically stored in the catalog DB instead of creating tiny Parquet files.

For frequent small writes, avoid creating tiny Parquet files:

```sql
-- In v0.4, inlining is ON by default. To customize the limit:
ATTACH 'ducklake:metadata.ducklake' AS dl (DATA_INLINING_ROW_LIMIT 100);

-- Enable persistently (per table/schema/global)
CALL dl.set_option('data_inlining_row_limit', 100);
CALL dl.set_option('data_inlining_row_limit', 50, table_name => 'events');
CALL dl.set_option('data_inlining_row_limit', 200, schema => 'staging');

-- Small inserts go to catalog DB instead of Parquet
INSERT INTO dl.events VALUES (1, 'click');  -- Inlined if <= limit

-- Flush inlined data to Parquet when ready
CALL ducklake_flush_inlined_data('dl');
CALL ducklake_flush_inlined_data('dl', table_name => 'events');
CALL ducklake_flush_inlined_data('dl', schema_name => 'staging');
CALL ducklake_flush_inlined_data('dl', schema_name => 'staging', table_name => 'events');
```

---

## 14. Encryption

```sql
-- Enable at attach time
ATTACH 'ducklake:metadata.ducklake' AS dl
    (DATA_PATH '/data/secure/', ENCRYPTED);

-- All Parquet files are encrypted (data + delete files)
-- Encryption keys auto-generated and stored in catalog
-- Files unreadable without DuckLake access

-- Re-attaching automatically uses stored keys
DETACH dl;
ATTACH 'ducklake:metadata.ducklake' AS dl;
-- Still works — keys are in the catalog
```

---

## 15. Remote Storage (S3, GCS, Azure)

DuckLake works with any filesystem DuckDB supports:

```sql
-- S3
INSTALL httpfs;
CREATE SECRET (TYPE S3, KEY_ID 'xxx', SECRET 'yyy', REGION 'us-east-1');
ATTACH 'ducklake:postgres:dbname=catalog host=pg.example.com' AS dl
    (DATA_PATH 's3://my-bucket/warehouse/');

-- GCS
ATTACH 'ducklake:postgres:dbname=catalog host=pg.example.com' AS dl
    (DATA_PATH 'gcs://my-bucket/warehouse/');

-- Azure
INSTALL azure;
ATTACH 'ducklake:postgres:dbname=catalog host=pg.example.com' AS dl
    (DATA_PATH 'azure://container/warehouse/');

-- Cloudflare R2, Hetzner Object Storage, MinIO — all S3-compatible
```

---

## 16. Maintenance Operations

### Merge adjacent files (compaction)

```sql
-- Merge small Parquet files into larger ones
CALL ducklake_merge_adjacent_files('dl');
CALL ducklake_merge_adjacent_files('dl', 'my_table');
CALL ducklake_merge_adjacent_files('dl', 'my_table', schema => 'analytics');
CALL ducklake_merge_adjacent_files('dl', 'my_table', max_compacted_files => 1000);

-- This preserves time travel and change data feeds!
-- Uses partial file references so snapshots still work
```

### Expire snapshots

```sql
-- Expire specific snapshot
CALL ducklake_expire_snapshots('dl', versions => [2]);

-- Expire old snapshots
CALL ducklake_expire_snapshots('dl', older_than => now() - INTERVAL '1 week');

-- Dry run
CALL ducklake_expire_snapshots('dl', dry_run => true, older_than => now() - INTERVAL '1 week');

-- Persistent option
CALL dl.set_option('expire_older_than', '1 month');
```

### Rewrite heavily deleted files

```sql
-- Rewrite files where >95% of rows are deleted (default threshold)
CALL ducklake_rewrite_data_files('dl');
CALL ducklake_rewrite_data_files('dl', 'my_table');
CALL ducklake_rewrite_data_files('dl', 'my_table', delete_threshold => 0.5);

-- Persistent option
CALL dl.set_option('rewrite_delete_threshold', 0.5);
```

### Cleanup old files

```sql
-- Delete files from expired snapshots
CALL ducklake_cleanup_old_files('dl', cleanup_all => true);
CALL ducklake_cleanup_old_files('dl', older_than => now() - INTERVAL '1 week');
CALL ducklake_cleanup_old_files('dl', dry_run => true, older_than => now() - INTERVAL '1 week');
```

### Delete orphaned files

```sql
-- Remove files not tracked by catalog
CALL ducklake_delete_orphaned_files('dl', cleanup_all => true);
CALL ducklake_delete_orphaned_files('dl', older_than => now() - INTERVAL '1 week');
CALL ducklake_delete_orphaned_files('dl', dry_run => true, older_than => now() - INTERVAL '1 week');

-- Persistent option
CALL dl.set_option('delete_older_than', '1 week');
```

### CHECKPOINT (run all maintenance)

```sql
CHECKPOINT dl;
-- Runs in order:
-- 1. ducklake_flush_inlined_data
-- 2. ducklake_expire_snapshots
-- 3. ducklake_merge_adjacent_files
-- 4. ducklake_rewrite_data_files
-- 5. ducklake_cleanup_old_files
-- 6. ducklake_delete_orphaned_files
```

### Global maintenance options

```sql
CALL dl.set_option('rewrite_delete_threshold', 0.5);
CALL dl.set_option('delete_older_than', '1 week');
CALL dl.set_option('expire_older_than', '1 month');
CALL dl.set_option('compaction_schema', 'analytics');
CALL dl.set_option('compaction_table', 'events');

-- View all options
FROM dl.options();
-- Returns: option_name, value, scope (GLOBAL/SCHEMA/TABLE), scope_entry
```

---

## 17. Parquet Settings

Settings can be scoped at global, schema, or table level:

```sql
-- Compression
CALL dl.set_option('parquet_compression', 'zstd');                          -- global
CALL dl.set_option('parquet_compression', 'gzip', schema => 'analytics');   -- schema
CALL dl.set_option('parquet_compression', 'lz4', table_name => 'logs');     -- table

-- Parquet version
CALL dl.set_option('parquet_version', '2');

-- Compression level
CALL dl.set_option('parquet_compression_level', '17');

-- Row group size
CALL dl.set_option('parquet_row_group_size', '64000');
CALL dl.set_option('parquet_row_group_size_bytes', '10KB');
```

---

## 18. Adding External Data Files

Register existing Parquet files into DuckLake without re-writing:

```sql
-- Add a single file
CALL ducklake_add_data_files('dl', 'my_table', '/path/to/file.parquet');

-- Add with glob
CALL ducklake_add_data_files('dl', 'my_table', '/path/to/files/*.parquet');

-- DuckLake reads the file's schema and stats
-- File must match table schema (or be compatible)
```

---

## 19. Sorted Tables

Control sort order during compaction for better query performance:

```sql
-- Set sort order for compaction
ALTER TABLE my_ducklake.tbl SET SORTED BY (sort_key_1, sort_key_2);

-- Sort with expressions
ALTER TABLE my_ducklake.tbl SET SORTED BY (sort_key_1, lower(sort_key_2));

-- Reset sort order
ALTER TABLE my_ducklake.tbl RESET SORTED BY;

-- When merge_adjacent_files runs, data is sorted according to this order
CALL ducklake_merge_adjacent_files('dl');
```

---

## 20. Virtual Columns

```sql
-- snapshot_id virtual column shows which snapshot each row belongs to
SELECT *, snapshot_id FROM my_ducklake.tbl;

-- List files for a table
FROM my_ducklake.list_files('my_table');

-- Table info
FROM my_ducklake.table_info('my_table');
```

---

## 21. Constraints

DuckLake supports:
- **NOT NULL** constraints

DuckLake does **NOT** support:
- PRIMARY KEY
- FOREIGN KEY
- UNIQUE constraints
- CHECK constraints
- Indexes

```sql
CREATE TABLE dl.tbl (
    id INTEGER NOT NULL,
    name VARCHAR  -- nullable
);
```

---

## 22. Supported Types

All standard DuckDB types are supported:
- Integer types: `TINYINT`, `SMALLINT`, `INTEGER`, `BIGINT`, `HUGEINT`
- Float types: `FLOAT`, `DOUBLE`, `DECIMAL`
- String types: `VARCHAR`, `BLOB`
- Date/time: `DATE`, `TIME`, `TIMESTAMP`, `TIMESTAMPTZ`, `INTERVAL`
- Boolean: `BOOLEAN`
- Complex types: `STRUCT`, `LIST`, `MAP`
- Special: `UUID`, `JSON`, `VARIANT` (shredded, v0.4+), `GEOMETRY` (with spatial extension, v1.5 core geometry PR #770)

**Unsupported types**: `ENUM`, `UNION` (as of 0.4)

---

## 23. Statistics & Performance

### Automatic statistics

DuckLake collects per-file and per-column statistics:
- Min/max values
- Null counts
- Value counts
- File sizes
- NaN detection (for floats)

### Filter pushdown

```sql
-- Automatic file pruning based on column statistics
SELECT * FROM tbl WHERE id > 1000;
-- Only reads Parquet files whose max(id) >= 1000
```

### Partition pruning

```sql
-- Automatic partition elimination
SELECT * FROM tbl WHERE region = 'US';
-- Only reads files in region=US partition
```

### Count(*) optimization

```sql
-- Uses table stats, no file scanning needed
SELECT COUNT(*) FROM tbl;
```

### Top-N file pruning

```sql
-- Efficient ORDER BY ... LIMIT queries
SELECT * FROM tbl ORDER BY created_at DESC LIMIT 10;
```

---

## 24. Performance Tips

1. **Use data inlining** for frequent small writes (OLTP-like patterns)
2. **Run `CHECKPOINT`** periodically to compact files and clean up
3. **Set `parquet_compression` to `zstd`** for good compression/speed balance
4. **Use partitioning** for columns you frequently filter on
5. **Use sorted tables** (`SET SORTED BY`) for columns you ORDER BY often
6. **Merge adjacent files** when you have many small files
7. **Rewrite data files** when tables have heavy deletes
8. **Choose PostgreSQL** as catalog for multi-client production workloads

---

## 25. Limitations & Known Issues

- **No indexes** — relies on statistics and partition pruning
- **No PRIMARY KEY, UNIQUE, CHECK, FOREIGN KEY** constraints
- **No ENUM or UNION** types
- **DuckDB catalog = single client only** — use PostgreSQL for multi-user
- **MySQL catalog has known issues** — not recommended
- **Experimental** (v0.x, 1.0 targeted March/April 2026) — API may change
- **Updates are merge-on-read** — can be slow for heavily updated tables (use `ducklake_rewrite_data_files`)
- **Path requirements**: DATA_PATH and database file path should be relative; directory must pre-exist for database creation

---

## 26. Comparison Summary

| Feature | DuckLake | Iceberg | Delta Lake |
|---------|----------|---------|------------|
| Time travel | ✅ | ✅ | ✅ |
| Schema evolution | ✅ | ✅ | ✅ |
| Partitioning | ✅ | ✅ | ✅ |
| Partition evolution | ✅ | ✅ | ❌ |
| ACID transactions | ✅ (via catalog DB) | ✅ (optimistic) | ✅ (optimistic) |
| Multi-table transactions | ✅ | ❌ | ❌ |
| Change data feed | ✅ | ✅ | ✅ |
| Lightweight snapshots | ✅ (1 row per snapshot) | ❌ (manifest rewrite) | ❌ (log checkpoint) |
| Encryption | ✅ | ✅ | ✅ |
| Sorted/clustered tables | ✅ | ✅ (sort order) | ✅ (Z-order) |
| Data inlining | ✅ (default in 0.4) | ❌ | ❌ |
| Deletion inlining | ✅ (0.4+) | ❌ | ❌ |
| External file registration | ✅ | ✅ | ❌ |
| Variant/semi-structured | ✅ (shredded, 0.4+) | ❌ | ❌ |
| Top-N file pruning | ✅ (0.4+) | ❌ | ❌ |
| COUNT(*) optimization | ✅ (metadata-only, 0.4+) | ❌ | ❌ |
| Catalog requirements | Any SQL DB | Separate catalog service | Unity/Hive catalog |
| Complexity | Low | High | Medium |
| Maturity | Experimental (1.0 target: Q1 2026) | Production (2017+) | Production (2019+) |

---

## 27. Quick Reference: All Functions & Procedures

| Function | Purpose |
|----------|---------|
| `snapshots()` | List all snapshots |
| `current_snapshot()` | Get current snapshot ID |
| `last_committed_snapshot()` | Get last committed snapshot for this connection |
| `table_changes(table, start, end)` | Change data feed between snapshots |
| `table_info(table)` | Table column info |
| `list_files(table)` | List data files for a table |
| `options()` | List all DuckLake options |
| `set_option(name, value, ...)` | Set option at global/schema/table level |
| `set_commit_message(author, msg, ...)` | Set commit message for current transaction |
| `ducklake_flush_inlined_data(db, ...)` | Flush inlined data to Parquet |
| `ducklake_merge_adjacent_files(db, ...)` | Compact small files |
| `ducklake_expire_snapshots(db, ...)` | Remove old snapshots |
| `ducklake_rewrite_data_files(db, ...)` | Rewrite heavily deleted files |
| `ducklake_cleanup_old_files(db, ...)` | Delete files from expired snapshots |
| `ducklake_delete_orphaned_files(db, ...)` | Delete untracked files |
| `ducklake_add_data_files(db, table, path)` | Register external Parquet files |

---

## 28. Complete Working Example

```sql
-- Setup
INSTALL ducklake;
ATTACH 'ducklake:my_warehouse.ducklake' AS wh;
USE wh;

-- Create and populate
CREATE TABLE events (
    id INTEGER NOT NULL,
    user_id INTEGER,
    event_type VARCHAR,
    created_at TIMESTAMP
);

ALTER TABLE events SET PARTITIONED BY (year(created_at));

INSERT INTO events
SELECT i, i % 1000, ['click','view','buy'][i % 3 + 1], '2025-01-01'::TIMESTAMP + (i * INTERVAL '1 minute')
FROM range(100000) t(i);

-- Schema evolution
ALTER TABLE events ADD COLUMN metadata JSON;

-- Update some records
UPDATE events SET metadata = '{"source": "mobile"}' WHERE event_type = 'buy';

-- Time travel
SELECT COUNT(*) FROM events AT (VERSION => 1);

-- Change data feed
FROM wh.table_changes('events', 2, 3);

-- Commit message
BEGIN;
INSERT INTO events VALUES (100001, 42, 'purchase', now(), '{"amount": 99.99}');
CALL wh.set_commit_message('ETL Pipeline', 'Hourly import batch 2025-06-01T12:00');
COMMIT;

-- Maintenance
CALL wh.set_option('parquet_compression', 'zstd');
CALL wh.set_option('expire_older_than', '30 days');
CHECKPOINT wh;

-- Check snapshots
FROM wh.snapshots();

-- Detach
USE memory;
DETACH wh;
```

---

*Last updated: 2026-02-21. Generated from ducklake repo (main branch) + ducklake.select documentation.*

---

## 29. DuckLake 0.4 New Features (2026-02-23)

DuckLake 0.4 is the release targeting DuckDB v1.5.x "Variegata". Major changes (590 commits over 0.3):

### Data Inlining as Default (PR #775)
Inlining is now enabled by default for all DuckLake databases. Small inserts go to the catalog DB instead of creating tiny Parquet files. Use `DATA_INLINING_ROW_LIMIT 0` to disable.

### Deletion Inlining (PR #737)
Deletions can now be inlined in the catalog database, avoiding creation of small delete files.

### Shredded Variant Support (PR #750)
Full `VARIANT` type support with stats serialization, enabling semi-structured data storage.

### Top-N Dynamic Filter File Pruning (PR #668)
`ORDER BY ... LIMIT N` queries now prune files using min/max statistics. Only files that could contain top-N results are read.

### COUNT(*) Optimization (PR #732)
Metadata-only `COUNT(*)` without scanning any data files. Works with delete files, inlined data, and historical snapshots.

### Custom MultiFileReader for Delete Files (PR #674)
Eliminates HEAD requests to object storage when reading delete files, improving performance on S3/GCS/Azure.

### Sort Expressions for Compaction (PRs #642, #743)
Ordered compaction and inline flush with `SET SORTED BY` expressions. Data is automatically sorted during file merging.

### Partial Deletion Files (PR #696)
Generation and flushing of partial deletion files over consecutive deletes. Reduces storage overhead.

### AUTOMATIC_MIGRATION Opt-In (PR #697)
Schema migration is now opt-in rather than automatic. Use `AUTOMATIC_MIGRATION` option to enable.

### Geometry Types Update for v1.5 (PR #770, merged)
Integration with DuckDB v1.5's core GEOMETRY type. The spatial extension's `GEOMETRY` type is now a first-class core type. Note: data inlining skips GEOMETRY and VARIANT columns (they go to Parquet directly).

### Maintenance Function Return Values (PR #734)
`merge_adjacent_files`, `rewrite_data_files`, and `flush_inlined_data` now return information about what was processed.

### Bulk Import Performance (PRs #807, #808, #811 — merged 2026-03-11)
Major improvements to `ducklake_add_data_files` for bulk Parquet import:
- **Appender API** (#807): Eliminates SQL string construction overhead for metadata insertion. Massive performance improvement and lower peak memory when importing tens to hundreds of thousands of Parquet files.
- **Eager metadata processing** (#808): Processes Parquet metadata as files are read instead of collecting all metadata first. Significantly reduces peak memory for large bulk imports.
- **Hive partition type casting** (#811): `ducklake_add_data_files` now handles implicit type casting for Hive partition keys (e.g., integer partition values from string parsing) and correctly handles NULL partition values.

### NULL Partition Keys (PR #812 — merged 2026-03-04)
Fixed internal error when inserting NULL values into partition columns. NULL partition keys are now fully supported.

### Filter Pushdown Fix (PR #765 — merged 2026-03-06)
Fixed filter pushdown for Hive-partitioned tables.

### View Serialization Fix (PR #801 — merged 2026-03-04)
Fixed parse-AST-serialize roundtrip in `DuckLakeViewEntry::ToSQL()` to avoid losing view definitions.

### Release Calendar

| Date | Spec Version | Extension Version | DuckDB Version |
|------|-------------|-------------------|----------------|
| 2026-02-23 | **0.4** | **0.4** | **1.5.x** |
| 2025-09-17 | 0.3 | 0.3 | 1.4.x |
| 2025-07-04 | 0.2 | 0.2 | 1.3.x |
| 2025-05-27 | 0.1 | 0.1 | 1.3.x |

### Roadmap to 1.0 (March/April 2026)

Planned before 1.0:
- PostgreSQL catalog optimization (reduce roundtrips)
- User-defined types
- Protected snapshots
- Branching/merge capabilities
- Parquet Bloom filter support
- Primary key syntax (without enforcement)
- Fixed-size array support

---

## 30. Spatial/Geometry Support in DuckLake

DuckLake has **native GEOMETRY type support** when used with the DuckDB spatial extension. This is not a workaround — it's built into the DuckLake extension source code with dedicated type mappings, statistics collection, and Parquet serialization.

### Prerequisites

```sql
INSTALL ducklake;
INSTALL spatial;
LOAD spatial;
-- spatial must be loaded before creating GEOMETRY columns
```

### Creating Tables with Geometry Columns

```sql
ATTACH 'ducklake:metadata.ducklake' AS dl (DATA_PATH '/data/geo/');
USE dl;

CREATE TABLE points (id INTEGER, geom GEOMETRY);
INSERT INTO points VALUES (1, ST_Point(1.0, 2.0));
INSERT INTO points VALUES (2, 'LINESTRING Z (5 5 5, 10 10 10)'::GEOMETRY);

SELECT * FROM points;
-- 1  POINT (1 2)
-- 2  LINESTRING Z (5 5 5, 10 10 10)
```

All spatial functions from the DuckDB spatial extension work on DuckLake tables: `ST_Point`, `ST_Area`, `ST_Distance`, `ST_Contains`, `ST_Buffer`, `ST_AsGeoJSON`, etc.

### How Geometry Is Stored in Parquet

DuckLake stores geometry using **DuckDB's native Parquet geometry encoding** (not GeoParquet v1.x WKB blobs). When writing Parquet files, DuckLake explicitly sets:

```
geoparquet_version = "NONE"
```

This means geometry is stored as DuckDB's internal geometry binary format in Parquet, **not** as WKB blobs in a GeoParquet metadata envelope.

**Important**: When adding external Parquet files via `ducklake_add_data_files`, the files **must** use native Parquet geometry format. GeoParquet v1.x files (which store geometry as WKB BLOBs) are **rejected** with an error:

```sql
-- This works (native format):
COPY (SELECT ST_Point(5,5) AS g) TO 'points.parquet' (FORMAT PARQUET, GEOPARQUET_VERSION NONE);
CALL ducklake_add_data_files('dl', 'my_table', 'points.parquet');

-- This FAILS (GeoParquet v1.x format):
COPY (SELECT ST_Point(5,5) AS g) TO 'points_geo.parquet' (FORMAT PARQUET);
CALL ducklake_add_data_files('dl', 'my_table', 'points_geo.parquet');
-- Error: Expected type "GEOMETRY" but found type "BLOB". Is this a GeoParquet v1.*.* file?
-- DuckLake only supports GEOMETRY types stored in native Parquet(V3) format, not GeoParquet(v1.*.*)
```

### Type Mapping in the Catalog

The DuckLake catalog maps `GEOMETRY` as a first-class type with the string identifier `"geometry"` (alongside the 33 other built-in types). In the `ducklake_column` metadata table, geometry columns are stored with type name `geometry` mapping to `LogicalTypeId::GEOMETRY`.

### Bounding Box Statistics (Spatial Metadata)

DuckLake collects **per-file and per-table bounding box statistics** for geometry columns — a feature unique among lakehouse formats. Stats are stored as JSON in the `extra_stats` column of `ducklake_file_column_stats` and `ducklake_table_column_stats`:

```json
{
  "bbox": {
    "xmin": 1.0, "xmax": 10.0,
    "ymin": 2.0, "ymax": 10.0,
    "zmin": 5.0, "zmax": 10.0,
    "mmin": null, "mmax": null
  },
  "types": ["point", "linestring_z"]
}
```

- **bbox**: Bounding box across all geometries in the file (X, Y, Z, M dimensions)
- **types**: Set of geometry sub-types present (e.g., `point`, `linestring_z`, `polygon`, `point_m`, `point_zm`)
- Stats are **automatically merged** during file compaction (`ducklake_merge_adjacent_files`)
- Table-level stats are the union of all file-level stats

### Spatial Sorting with Hilbert Curves

DuckLake's sorted tables feature works with the spatial extension's `ST_Hilbert` function for space-filling curve sorting, which dramatically improves spatial query performance:

```sql
ALTER TABLE dl.spatial_data SET SORTED BY (
    st_hilbert(st_point(lon, lat)) ASC NULLS LAST
);
CALL ducklake_merge_adjacent_files('dl', 'spatial_data');
-- Data is now sorted along a Hilbert curve for spatial locality
```

### Data Inlining

Geometry columns work with data inlining. Small inserts (below `DATA_INLINING_ROW_LIMIT`) are stored in the catalog database and flushed to Parquet later:

```sql
ATTACH 'ducklake:meta.ducklake' AS dl (DATA_INLINING_ROW_LIMIT 10);
INSERT INTO dl.points VALUES (1, ST_Point(1, 2));  -- inlined in catalog
```

### Updates, Deletes, and MERGE INTO

All DML operations work with geometry columns:

```sql
UPDATE dl.points SET geom = ST_Point(3, 4) WHERE id = 1;
DELETE FROM dl.points WHERE ST_Distance(geom, ST_Point(0,0)) > 100;
MERGE INTO dl.points USING source ON points.id = source.id
    WHEN MATCHED THEN UPDATE SET geom = source.geom
    WHEN NOT MATCHED THEN INSERT VALUES (source.id, source.geom);
```

### Schema Evolution with Geometry

You can add geometry columns to existing tables:

```sql
ALTER TABLE dl.my_table ADD COLUMN geom GEOMETRY;
UPDATE dl.my_table SET geom = ST_Point(lon, lat);
```

### Limitations

| Limitation | Details |
|-----------|---------|
| **Top-level only** | GEOMETRY cannot be nested inside LIST, STRUCT, or MAP. `CREATE TABLE t (g GEOMETRY[])` fails. |
| **No spatial indexing** | DuckLake has no R-tree or spatial index. Relies on bounding box stats for file pruning. |
| **No GeoParquet v1.x interop** | External files must use native Parquet geometry format, not WKB-based GeoParquet v1.x. |
| **No bbox-based file pruning (yet)** | Bounding box stats are collected but there's no evidence of automatic spatial filter pushdown using bbox stats for file skipping. |
| **Single geometry type** | Only the generic `GEOMETRY` type is supported — not `POINT_2D`, `LINESTRING_2D`, `POLYGON_2D`, `BOX_2D`, or `WKB_BLOB` as column types. |
| **Spatial extension required** | The `spatial` extension must be installed and loaded for GEOMETRY columns to work. |

### Best Practices for GIS Data in DuckLake

1. **Always load the spatial extension** before attaching DuckLake databases with geometry columns
2. **Use Hilbert curve sorting** (`SET SORTED BY (st_hilbert(...))`) for spatial locality during compaction
3. **Partition by region** if your data has natural geographic partitions (country, state, grid cell)
4. **Use `GEOMETRY` as column type** — don't store WKB as BLOB (you lose bbox stats)
5. **Convert GeoParquet files** before adding with `ducklake_add_data_files` — re-export with `GEOPARQUET_VERSION NONE`
6. **Monitor bbox stats** via `ducklake_meta.ducklake_file_column_stats.extra_stats` to understand data distribution
7. **Run compaction** (`ducklake_merge_adjacent_files`) periodically to consolidate bbox stats and improve read performance

### Complete Spatial Example

```sql
INSTALL ducklake;
INSTALL spatial;
LOAD spatial;

ATTACH 'ducklake:geo_warehouse.ducklake' AS geo
    (DATA_PATH '/data/geo/', METADATA_CATALOG 'geo_meta');
USE geo;

-- Create spatial table
CREATE TABLE buildings (
    id INTEGER NOT NULL,
    name VARCHAR,
    footprint GEOMETRY,
    centroid GEOMETRY
);

-- Insert data
INSERT INTO buildings VALUES
    (1, 'Office', ST_GeomFromText('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'), ST_Point(5, 5)),
    (2, 'Warehouse', ST_GeomFromText('POLYGON((20 20, 30 20, 30 30, 20 30, 20 20))'), ST_Point(25, 25));

-- Spatial queries work normally
SELECT name, ST_Area(footprint) AS area
FROM buildings
WHERE ST_Contains(footprint, ST_Point(5, 5));

-- Check collected bbox stats
SELECT extra_stats FROM geo_meta.ducklake_file_column_stats;

-- Set up Hilbert sorting for spatial queries
ALTER TABLE buildings SET SORTED BY (
    st_hilbert(centroid) ASC NULLS LAST
);

-- Compact with spatial sorting
CALL ducklake_merge_adjacent_files('geo', 'buildings');

-- Export to GeoJSON for external tools
COPY (SELECT id, name, ST_AsGeoJSON(footprint) AS geojson FROM buildings) TO 'buildings.json';
```
