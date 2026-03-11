# Vector Similarity Search (VSS) Extension

HNSW-indexed vector similarity search using DuckDB's fixed-size `ARRAY` type.

## Setup

```sql
INSTALL vss;
LOAD vss;
```

## Distance Metrics

| Metric | Function | Use Case |
|--------|----------|----------|
| `l2sq` | `array_distance(a, b)` | Euclidean distance (default) |
| `cosine` | `array_cosine_distance(a, b)` | Normalized embeddings (OpenAI, etc.) |
| `ip` | `array_negative_inner_product(a, b)` | Maximum inner product search |

## Create HNSW Index

```sql
-- Create table with fixed-size ARRAY column
CREATE TABLE embeddings (id INTEGER, vec FLOAT[384]);

-- Populate first, THEN create index (faster bulk load)
INSERT INTO embeddings SELECT ...;

-- Create index
CREATE INDEX idx ON embeddings USING HNSW (vec)
WITH (metric = 'cosine');  -- or 'l2sq' (default), 'ip'
```

## Query Patterns

### Basic k-NN Search

```sql
-- Find 10 nearest neighbors
SELECT id, array_cosine_distance(vec, query_vec::FLOAT[384]) AS dist
FROM embeddings
ORDER BY dist
LIMIT 10;
```

When an HNSW index exists, DuckDB automatically uses it (check with `EXPLAIN`—look for `HNSW_INDEX_SCAN`).

### Single-Shot Top-N

```sql
-- Without ORDER BY + LIMIT pattern
SELECT min_by(id, array_distance(vec, [0.1, 0.2, ...]::FLOAT[384]), 5)
FROM embeddings;
```

### Brute-Force Table Macros (no index needed)

```sql
-- Cross-table similarity join: find k nearest in right for each row in left
SELECT * FROM vss_join(
    left_table, right_table,
    left_table.vec, right_table.vec,
    k := 5,
    metric := 'cosine'
);

-- Match against a single vector
SELECT * FROM vss_match(
    embeddings,
    [0.1, 0.2, ...]::FLOAT[384],
    embeddings.vec,
    k := 5,
    metric := 'cosine'
);
```

## Index Tuning

| Parameter | Default | Description |
|-----------|---------|-------------|
| `ef_construction` | 128 | Build-time candidate list size (higher = better recall, slower build) |
| `ef_search` | 64 | Query-time candidate list size (higher = better recall, slower query) |
| `M` | 16 | Max neighbors per vertex (higher = more memory, better recall) |
| `M0` | 2 × M | Base layer connectivity |

```sql
-- Set at index creation
CREATE INDEX idx ON tbl USING HNSW (vec)
WITH (metric = 'cosine', ef_construction = 256, M = 32);

-- Adjust search-time parameter
SET hnsw_ef_search = 128;   -- increase for better recall
RESET hnsw_ef_search;        -- back to default
```

## Maintenance

```sql
-- Compact after many deletes (removes tombstones)
PRAGMA hnsw_compact_index('idx');
```

## Persistence

HNSW indexes are **in-memory by default** — lost on restart.

```sql
-- Enable experimental persistence (not production-ready)
SET hnsw_enable_experimental_persistence = true;
```

**Warning**: WAL recovery not yet implemented for custom indexes — risk of data loss on crash.

## Limitations

- Vectors must be `FLOAT` (32-bit) only — no DOUBLE
- Index lives entirely in RAM (not counted in `memory_limit`)
- Insert data BEFORE creating index for best performance
- Deletes are marked, not removed (use `hnsw_compact_index` periodically)
- Table macros (`vss_join`, `vss_match`) use brute-force, not HNSW
- No filtering during HNSW scan (post-filter only)

## Complete Example

```sql
INSTALL vss; LOAD vss;

-- Create table with 3-dimensional vectors
CREATE TABLE items (id INTEGER, name VARCHAR, embedding FLOAT[3]);
INSERT INTO items VALUES
    (1, 'apple',  [0.1, 0.8, 0.3]),
    (2, 'banana', [0.9, 0.1, 0.2]),
    (3, 'cherry', [0.2, 0.7, 0.4]),
    (4, 'date',   [0.8, 0.2, 0.1]);

-- Create HNSW index
CREATE INDEX items_idx ON items USING HNSW (embedding)
WITH (metric = 'cosine');

-- Find 2 most similar items to a query vector
SELECT name, array_cosine_distance(embedding, [0.15, 0.75, 0.35]::FLOAT[3]) AS dist
FROM items
ORDER BY dist
LIMIT 2;
-- apple, cherry (closest to the query)
```
