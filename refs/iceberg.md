# DuckDB Iceberg Extension

Read, write, and manage Apache Iceberg tables directly from DuckDB using standard SQL. The extension provides native Iceberg support with full CRUD operations, REST catalog integration, time travel, partition pruning, and predicate pushdown.

## Overview

The Iceberg extension is a core DuckDB extension with a native implementation (no third-party library dependency). Key capabilities:

- Read and write Iceberg v1 and v2 tables
- ATTACH to Iceberg REST Catalogs (Polaris, Lakekeeper, AWS Glue, S3 Tables, BigLake, Cloudflare R2)
- CREATE TABLE, INSERT, UPDATE, DELETE via standard SQL
- Time travel via snapshot ID or timestamp
- Partition pruning and multi-level predicate pushdown
- Schema evolution support
- Metadata inspection (snapshots, manifests, table properties)
- Works in DuckDB-Wasm (browser)
- Table properties management in CREATE TABLE (v1.5.0+)

**Supported platforms**: All DuckDB platforms including WASM.

## Installation

```sql
-- Install and load (auto-installs on first use)
INSTALL iceberg;
LOAD iceberg;

-- Keep up to date between releases
UPDATE EXTENSIONS;

-- Force install from nightly (for bleeding-edge fixes)
FORCE INSTALL iceberg FROM core_nightly;
```

For cloud storage access, also install the relevant extensions:

```sql
-- For S3 / GCS
INSTALL httpfs;
LOAD httpfs;

-- For Azure Blob Storage
INSTALL azure;
LOAD azure;

-- For AWS credential chain (Glue, S3 Tables)
INSTALL aws;
LOAD aws;
```

## Reading Iceberg Tables (Direct File Access)

Use `iceberg_scan` to query Iceberg tables directly without a catalog. You must point to the metadata JSON file or the table root directory (if a `version-hint.text` file exists).

### Basic Usage

```sql
-- Point to table root (requires version-hint.text in metadata/)
SELECT count(*) FROM iceberg_scan('data/iceberg/lineitem_iceberg');

-- Point to specific metadata file
SELECT * FROM iceberg_scan('s3://bucket/table/metadata/v2.metadata.json');

-- With allow_moved_paths for relocated tables
SELECT * FROM iceberg_scan('data/iceberg/lineitem_iceberg', allow_moved_paths = true);
```

### iceberg_scan Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `allow_moved_paths` | BOOLEAN | `false` | Resolve relative file paths from table root. Required for tables that have been relocated. |
| `metadata_compression_codec` | VARCHAR | `''` | Set to `'gzip'` for compressed metadata files. Other codecs not supported. |
| `version` | VARCHAR | `'?'` | Explicit version string. Use `'?'` for auto-detection. |
| `version_name_format` | VARCHAR | `'v%s%s.metadata.json,%s%s.metadata.json'` | Comma-delimited format strings for metadata file naming. Each must contain two `%s` placeholders (version number, codec extension). |
| `snapshot_from_id` | UBIGINT | `NULL` | Read a specific snapshot by ID (mutually exclusive with `snapshot_from_timestamp`). |
| `snapshot_from_timestamp` | TIMESTAMP | `NULL` | Read the snapshot active at a given timestamp (mutually exclusive with `snapshot_from_id`). |

### Reading from S3

```sql
CREATE SECRET (
    TYPE s3,
    KEY_ID 'AKIAIOSFODNN7EXAMPLE',
    SECRET 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    REGION 'us-east-1'
);

-- Or use automatic credential chain
CREATE SECRET (
    TYPE s3,
    PROVIDER credential_chain
);

-- Query the table - must point to the metadata JSON file
SELECT * FROM iceberg_scan('s3://bucket/iceberg_table/metadata/v1.metadata.json');
```

### Reading from GCS

```sql
-- GCS requires HMAC keys (not regular GCP service account keys)
CREATE OR REPLACE SECRET (
    TYPE gcs,
    KEY_ID 'my_hmac_access_id',
    SECRET 'my_hmac_secret_key'
);

SELECT * FROM iceberg_scan('gs://bucket/table/metadata/v1.metadata.json');
```

### Reading from Azure

```sql
-- Use the azure extension
LOAD azure;

-- Configure Azure credentials via secrets
CREATE SECRET (
    TYPE azure,
    CONNECTION_STRING 'DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net'
);

SELECT * FROM iceberg_scan('azure://container/table/metadata/v1.metadata.json');
```

### Version Guessing

When there is no `version-hint.text` file, enable version guessing:

```sql
SET unsafe_enable_version_guessing = true;
SELECT * FROM iceberg_scan('s3://bucket/table', version = '?');
```

### Compressed Metadata

```sql
-- For gzip-compressed metadata files
SELECT * FROM iceberg_scan(
    's3://bucket/table',
    metadata_compression_codec = 'gzip'
);
-- Looks for v{version}.gz.metadata.json and {version}.gz.metadata.json
```

## Attaching Iceberg Catalogs (ATTACH)

The recommended way to work with Iceberg tables is through catalog attachment, which enables full read/write operations.

### ATTACH Syntax

```sql
ATTACH 'warehouse_name_or_identifier' AS catalog_alias (
    TYPE iceberg,
    ENDPOINT 'https://rest-catalog-endpoint.com',
    SECRET secret_name,
    -- additional options
);
```

### ATTACH Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ENDPOINT` | VARCHAR | `NULL` | REST Catalog URL endpoint |
| `ENDPOINT_TYPE` | VARCHAR | `NULL` | `'GLUE'` or `'S3_TABLES'` for Amazon catalogs |
| `SECRET` | VARCHAR | `NULL` | Name of secret for authentication |
| `CLIENT_ID` | VARCHAR | `NULL` | OAuth2 client ID (inline, instead of secret) |
| `CLIENT_SECRET` | VARCHAR | `NULL` | OAuth2 client secret (inline) |
| `DEFAULT_REGION` | VARCHAR | `NULL` | Region for storage layer |
| `OAUTH2_SERVER_URI` | VARCHAR | `NULL` | OAuth2 token server URL |
| `AUTHORIZATION_TYPE` | VARCHAR | `'OAUTH2'` | `'OAUTH2'`, `'SigV4'`, or none |
| `ACCESS_DELEGATION_MODE` | VARCHAR | `'vended_credentials'` | `'vended_credentials'` or `'none'` |
| `SUPPORT_NESTED_NAMESPACES` | BOOLEAN | `true` | Enable nested namespace support |
| `SUPPORT_STAGE_CREATE` | BOOLEAN | `false` | Disable stage creation (needed for some catalogs) |
| `PURGE_REQUESTED` | BOOLEAN | `true` | Send PurgeRequested on table drops |

## Authentication

### OAuth2 (Most REST Catalogs)

```sql
CREATE SECRET iceberg_secret (
    TYPE iceberg,
    CLIENT_ID 'my_client_id',
    CLIENT_SECRET 'my_client_secret',
    OAUTH2_SERVER_URI 'https://catalog.example.com/v1/oauth/tokens'
);

-- Optional OAuth2 parameters:
-- OAUTH2_GRANT_TYPE  - Grant type for token requests
-- OAUTH2_SCOPE       - Requested scope for access tokens
```

### Bearer Token

```sql
CREATE SECRET iceberg_secret (
    TYPE iceberg,
    TOKEN 'my_existing_bearer_token'
);
```

### AWS SigV4 (Glue, S3 Tables)

```sql
-- S3 credentials for storage access
CREATE SECRET (
    TYPE s3,
    PROVIDER credential_chain
);
-- Or with STS role assumption:
CREATE SECRET (
    TYPE s3,
    PROVIDER credential_chain,
    CHAIN sts,
    ASSUME_ROLE_ARN 'arn:aws:iam::ACCOUNT:role/ROLE',
    REGION 'us-east-2'
);

-- Then ATTACH with SigV4 authorization
ATTACH 'account_id' AS glue_catalog (
    TYPE iceberg,
    ENDPOINT 'glue.us-east-2.amazonaws.com/iceberg',
    AUTHORIZATION_TYPE 'sigv4'
);
```

## Catalog-Specific Examples

### AWS Glue (SageMaker Lakehouse)

```sql
INSTALL aws; INSTALL httpfs; INSTALL iceberg;
LOAD aws; LOAD httpfs; LOAD iceberg;

CREATE SECRET (
    TYPE s3,
    PROVIDER credential_chain,
    CHAIN sts,
    ASSUME_ROLE_ARN 'arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME',
    REGION 'us-east-2'
);

-- Method 1: Explicit endpoint
ATTACH 'ACCOUNT_ID' AS glue_catalog (
    TYPE iceberg,
    ENDPOINT 'glue.us-east-2.amazonaws.com/iceberg',
    AUTHORIZATION_TYPE 'sigv4'
);

-- Method 2: Simplified with ENDPOINT_TYPE
ATTACH 'ACCOUNT_ID' AS glue_catalog (
    TYPE iceberg,
    ENDPOINT_TYPE 'glue'
);

SELECT count(*) FROM glue_catalog.my_namespace.my_table;
```

### Amazon S3 Tables

```sql
CREATE SECRET (
    TYPE s3,
    PROVIDER credential_chain
);

ATTACH 'arn:aws:s3tables:us-east-1:ACCOUNT:bucket/BUCKET_NAME' AS s3t (
    TYPE iceberg,
    ENDPOINT_TYPE s3_tables
);

SELECT * FROM s3t.namespace_name.table_name;
```

### Apache Polaris

```sql
CREATE SECRET polaris_secret (
    TYPE iceberg,
    CLIENT_ID 'admin',
    CLIENT_SECRET 'password'
);

ATTACH 'quickstart_catalog' AS polaris (
    TYPE iceberg,
    ENDPOINT 'https://polaris-endpoint.example.com/api/catalog',
    SECRET 'polaris_secret'
);
```

### Lakekeeper

```sql
CREATE SECRET lakekeeper_secret (
    TYPE iceberg,
    CLIENT_ID 'admin',
    CLIENT_SECRET 'password',
    OAUTH2_SCOPE 'catalog',
    OAUTH2_SERVER_URI 'https://lakekeeper.example.com/realms/iceberg/token'
);

ATTACH 'warehouse' AS lk (
    TYPE iceberg,
    ENDPOINT 'https://lakekeeper.example.com/catalog',
    SECRET 'lakekeeper_secret'
);
```

### Cloudflare R2

```sql
CREATE SECRET r2_secret (TYPE iceberg, TOKEN 'r2_token');

ATTACH 'warehouse' AS r2_catalog (
    TYPE iceberg,
    ENDPOINT 'https://r2-catalog-uri.example.com'
);
```

### Google BigLake

DuckDB v1.5.0 added support for `EXTRA_HTTP_HEADERS` in ATTACH, enabling BigLake integration. BigLake Metastore supports the Iceberg REST Catalog protocol, so connect to it as a standard REST catalog.

## Writing Iceberg Tables

Write support requires attaching to an Iceberg catalog (REST catalog, Glue, S3 Tables, etc.). Direct file-based writes are not supported.

### CREATE TABLE

```sql
CREATE TABLE iceberg_catalog.default.my_table (
    id INTEGER,
    name VARCHAR,
    created_at TIMESTAMP
);

-- v1.5.0+: WITH clause for table properties
CREATE TABLE iceberg_catalog.default.my_table (
    id INTEGER,
    name VARCHAR
) WITH (
    'format-version' = '2',
    'location' = 's3://bucket/path/to/data',
    'write.update.mode' = 'merge-on-read',
    'write.delete.mode' = 'merge-on-read'
);
```

### INSERT

```sql
-- Direct values
INSERT INTO iceberg_catalog.default.my_table
VALUES (1, 'hello', '2025-01-01'), (2, 'world', '2025-01-02');

-- From another source
INSERT INTO iceberg_catalog.default.my_table
SELECT * FROM read_parquet('data.parquet');

-- From a DuckDB table
INSERT INTO iceberg_catalog.default.my_table
SELECT * FROM local_table;
```

### UPDATE

```sql
UPDATE iceberg_catalog.default.my_table
SET name = 'updated'
WHERE id = 1;
```

**Limitation**: UPDATE only works on tables that are **not partitioned** and **not sorted**. The table must have `write.update.mode` set to `merge-on-read`:

```sql
CALL set_iceberg_table_properties(
    iceberg_catalog.default.my_table,
    {'write.update.mode': 'merge-on-read'}
);
```

### DELETE

```sql
DELETE FROM iceberg_catalog.default.my_table
WHERE id = 2;
```

**Limitation**: DELETE only works on tables that are **not partitioned** and **not sorted**. Only positional deletes are supported (copy-on-write is not available). The table must have `write.delete.mode` set to `merge-on-read`:

```sql
CALL set_iceberg_table_properties(
    iceberg_catalog.default.my_table,
    {'write.delete.mode': 'merge-on-read'}
);
```

### CREATE / DROP SCHEMA

```sql
CREATE SCHEMA iceberg_catalog.my_namespace;
DROP SCHEMA iceberg_catalog.my_namespace;
```

### DROP TABLE

```sql
DROP TABLE iceberg_catalog.default.my_table;
```

### COPY FROM DATABASE

Bulk transfer data between DuckDB and Iceberg catalogs:

```sql
-- Export all tables from a DuckDB database to Iceberg
COPY FROM DATABASE duckdb_db TO iceberg_catalog;

-- Import all tables from Iceberg into DuckDB
COPY FROM DATABASE iceberg_catalog TO duckdb_db;
```

### Transaction Behavior

DuckDB's ACID compliance applies to Iceberg operations:
- Snapshot information locks on first table read within a transaction, providing consistent reads.
- Write operations (INSERT/UPDATE/DELETE) commit only on explicit `COMMIT`.
- No redundant REST Catalog queries within a transaction.

## Time Travel

Query historical states of an Iceberg table by snapshot ID or timestamp.

### Via Catalog (ATTACH)

```sql
-- By snapshot ID
SELECT * FROM iceberg_catalog.default.my_table AT (VERSION => 1234567890);

-- By timestamp
SELECT * FROM iceberg_catalog.default.my_table AT (
    TIMESTAMP => TIMESTAMP '2025-09-22 12:32:43.217'
);
```

### Via iceberg_scan

```sql
-- By snapshot ID
SELECT * FROM iceberg_scan(
    'data/iceberg/my_table',
    snapshot_from_id = 1234567890
);

-- By timestamp
SELECT * FROM iceberg_scan(
    'data/iceberg/my_table',
    snapshot_from_timestamp = TIMESTAMP '2025-09-22 12:32:43'
);
```

## Metadata Inspection

### iceberg_metadata

Exposes manifest file contents and data file entries:

```sql
-- Via file path
SELECT * FROM iceberg_metadata('data/iceberg/lineitem_iceberg', allow_moved_paths = true);

-- Via catalog
SELECT * FROM iceberg_metadata(iceberg_catalog.default.my_table);
```

Returns columns including manifest paths, file paths, file formats, record counts, partition info, and file statistics.

### iceberg_snapshots

Lists all snapshots in the table's history:

```sql
-- Via file path
SELECT * FROM iceberg_snapshots('data/iceberg/lineitem_iceberg');

-- Via catalog
SELECT * FROM iceberg_snapshots(iceberg_catalog.default.my_table);
```

Returns snapshot IDs, sequence numbers, timestamps, and operation types.

**Note**: `iceberg_snapshots` does NOT accept `allow_moved_paths`, `snapshot_from_id`, or `snapshot_from_timestamp` parameters.

### Table Properties

```sql
-- View all properties
SELECT * FROM iceberg_table_properties(iceberg_catalog.default.my_table);

-- Set properties
CALL set_iceberg_table_properties(
    iceberg_catalog.default.my_table,
    {
        'write.update.mode': 'merge-on-read',
        'write.delete.mode': 'merge-on-read',
        'write.file.size': '100000kb'
    }
);

-- Remove properties
CALL remove_iceberg_table_properties(
    iceberg_catalog.default.my_table,
    ['some.property', 'another.property']
);
```

## Partition Pruning and Predicate Pushdown

The extension implements three-level filter pushdown:

1. **Manifest-level pruning**: Evaluates partition field summaries in the manifest list to skip entire manifest files that cannot contain matching data.
2. **File-level filtering**: Uses per-file statistics (lower/upper bounds, null counts, partition values) to skip individual data files.
3. **Row-level filtering**: Passes compatible predicates to the underlying Parquet reader for row-group and page-level pruning.

This happens automatically -- no configuration is needed. Partition columns absent from Parquet files use their IDENTITY partition value as constants.

## Schema Evolution

The extension handles schema evolution transparently:

- **Column additions**: New columns added in newer table versions are handled correctly.
- **Type widening**: E.g., INT to BIGINT promotions are applied automatically.
- **Field ID-based mapping**: Column matching uses Iceberg field IDs, not column names, so column renames are handled correctly.
- **MAP and LIST types**: Special handling for intermediate struct children in MAP (`key_value`) and LIST (`element`) types.

## Delete File Processing

### Positional Deletes (Iceberg v2)
Pre-loaded during bind phase. Applied as deletion filters during Parquet scan.

### Equality Deletes (Iceberg v2)
Applied post-scan via expression evaluation. Only deletes with `sequence_number > data_file.sequence_number` apply. For partitioned tables, delete and data files must share the same `partition_spec_id` and matching partition values.

## Performance Optimizations

- **File metadata caching**: Iceberg files are immutable, so DuckDB skips validation and uses dummy ETags for caching.
- **Lazy file expansion**: Files are discovered and expanded on-demand as the scan progresses.
- **Cardinality estimation**: For v2+ tables, cardinality is computed from manifest statistics.
- **No redundant requests**: When reading a table a second time in a transaction, no extra REST Catalog requests are made.

## Virtual Columns

- `_row_id`: Row identifier. In v3 tables without an explicit row ID column, computed as `first_row_id + file_row_number`.
- `_last_updated_sequence_number`: Populated from the manifest entry's sequence number when not explicitly present.

## Known Limitations

### Read Limitations
- No inserts into Iceberg v3 specification tables (planned for v1.5.1)
- Cannot read v3 tables that use v2-incompatible data types
- Geometry data type is unsupported
- Serialization/deserialization interface not implemented (affects some advanced scan operations)
- Late materialization is disabled
- REST Catalogs backed by non-S3 remote storage have limited read support

### Write Limitations
- UPDATE and DELETE only work on **unpartitioned, unsorted** tables
- Only positional deletes are written (copy-on-write not implemented)
- Only merge-on-read semantics are supported
- MERGE INTO is not supported
- ALTER TABLE is not supported (schema evolution on write side)
- Write operations require a catalog -- cannot write directly to files

### General Limitations
- Without a `version-hint.text` file, you must either specify the metadata file path directly or enable `unsafe_enable_version_guessing`
- VARIANT type support planned for v1.5.1 (Iceberg v3)

## Troubleshooting

### "Curl Request to '/v1/oauth/tokens' failed"
Install the latest extension version:
```sql
FORCE INSTALL iceberg FROM core_nightly;
-- Restart DuckDB session
LOAD iceberg;
```

### "HTTP error 403 - security token is invalid"
Verify credentials are loaded:
```sql
.mode line
SELECT * FROM duckdb_secrets();
```
If missing, create the S3 secret manually:
```sql
CREATE SECRET (
    TYPE s3,
    KEY_ID 'YOUR_KEY',
    SECRET 'YOUR_SECRET',
    REGION 'us-east-1'
);
```

### "No such file or directory: version-hint.text"
Point directly to the metadata JSON file instead of the table root:
```sql
-- Instead of:
SELECT * FROM iceberg_scan('s3://bucket/table');
-- Use:
SELECT * FROM iceberg_scan('s3://bucket/table/metadata/v2.metadata.json');
```

Or enable version guessing:
```sql
SET unsafe_enable_version_guessing = true;
```

## v1.5.0 Changes

- **Table properties in CREATE TABLE**: Use `WITH (...)` clause to set format version, location, and custom properties during table creation.
- **EXTRA_HTTP_HEADERS support**: Pass custom HTTP headers when attaching to catalogs, enabling Google BigLake integration.
- **Iceberg v3 and VARIANT type**: Planned for v1.5.1 release.

## Supported Operations Summary

| Operation | Catalog (ATTACH) | Direct (iceberg_scan) |
|-----------|:-:|:-:|
| SELECT | Yes | Yes |
| INSERT INTO | Yes | No |
| UPDATE | Yes (unpartitioned only) | No |
| DELETE | Yes (unpartitioned only) | No |
| CREATE TABLE | Yes | No |
| DROP TABLE | Yes | No |
| CREATE/DROP SCHEMA | Yes | No |
| COPY FROM DATABASE | Yes | No |
| Time travel | Yes | Yes |
| Metadata inspection | Yes | Yes |
| Table properties | Yes | No |
