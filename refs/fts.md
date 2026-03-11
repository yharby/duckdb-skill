# Full-Text Search (FTS) Extension

BM25-based full-text search over DuckDB tables.

## Setup

```sql
INSTALL fts;
LOAD fts;
```

Auto-loads on first use — manual INSTALL/LOAD optional.

## Create Index

```sql
PRAGMA create_fts_index(
    'table_name',       -- input table (use 'schema.table' if not main)
    'id_column',        -- document identifier column
    'col1', 'col2',     -- text columns to index (or '*' for all VARCHAR)
    stemmer = 'porter',       -- language stemmer (default: 'porter')
    stopwords = 'english',    -- stopword list (default: 'english', 571 words)
    ignore = '(\.|[^a-z])+',  -- regex for ignored chars
    strip_accents = 1,        -- remove accents (default: 1)
    lower = 1,                -- lowercase (default: 1)
    overwrite = 0             -- replace existing index (default: 0)
);
```

**Available stemmers** (25+): `arabic`, `danish`, `dutch`, `english`, `finnish`, `french`, `german`, `greek`, `hungarian`, `indonesian`, `irish`, `italian`, `norwegian`, `porter`, `portuguese`, `romanian`, `russian`, `spanish`, `swedish`, `tamil`, `turkish`, or `'none'`.

Creates schema `fts_{schema}_{table_name}` with inverted index tables.

## Query with BM25 Scoring

```sql
SELECT t.*, score
FROM table_name t
JOIN (
    SELECT *, fts_main_table_name.match_bm25(
        id_column,
        'search query',
        fields := 'col1,col2',   -- optional: limit to specific fields
        k := 1.2,                -- term frequency saturation (default: 1.2)
        b := 0.75,               -- document length normalization (default: 0.75)
        conjunctive := 0         -- 0=OR (disjunctive), 1=AND (all terms required)
    ) AS score
    FROM table_name
) fts ON t.id_column = fts.id_column
WHERE score IS NOT NULL
ORDER BY score DESC;
```

### BM25 Parameters

| Parameter | Default | Effect |
|-----------|---------|--------|
| `k` | 1.2 | Higher = more weight to term frequency |
| `b` | 0.75 | Higher = more penalty for long documents (0 = no length norm) |
| `conjunctive` | 0 | 0 = match any term (OR), 1 = match all terms (AND) |

## Stemming

```sql
-- Stem a word directly
SELECT stem('running', 'porter');  -- 'run'
SELECT stem('universities', 'english');  -- 'univers'
```

## Drop Index

```sql
PRAGMA drop_fts_index('table_name');
```

## Complete Example

```sql
-- Create and populate a table
CREATE TABLE docs (id INTEGER, title VARCHAR, body VARCHAR);
INSERT INTO docs VALUES
    (1, 'DuckDB Introduction', 'DuckDB is an analytical database'),
    (2, 'SQL Tutorial', 'Learn SQL queries with DuckDB'),
    (3, 'Python Guide', 'Use DuckDB from Python scripts');

-- Create FTS index on title and body
PRAGMA create_fts_index('docs', 'id', 'title', 'body');

-- Search
SELECT d.*, score
FROM docs d
JOIN (
    SELECT *, fts_main_docs.match_bm25(id, 'DuckDB SQL') AS score
    FROM docs
) fts ON d.id = fts.id
WHERE score IS NOT NULL
ORDER BY score DESC;
```

## Custom Stopwords

```sql
-- Create a custom stopword table
CREATE TABLE my_stops (word VARCHAR);
INSERT INTO my_stops VALUES ('the'), ('a'), ('custom_word');

-- Use it
PRAGMA create_fts_index('docs', 'id', 'body', stopwords='my_stops');
```

## Limitations

- **Index does not auto-update** — must recreate after INSERT/UPDATE/DELETE (`overwrite=1`)
- Index stored as DuckDB tables (in `fts_*` schema)
- Single-table indexing only (no cross-table search)
- No fuzzy matching or phrase search built-in
