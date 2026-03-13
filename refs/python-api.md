# DuckDB Python API — v1.5 Patterns & Pitfalls

## Arrow Export — Critical v1.5 Bug & Workaround

**`fetch_arrow_table()` and `to_arrow_table()` crash in DuckDB 1.5.0** when the result contains geometry columns read from parquet files:

```
INTERNAL Error: TransactionContext::ActiveTransaction called without active transaction
```

The crash occurs in `ArrowGeometry::WriteCRS` during Arrow export — DuckDB tries to look up CRS metadata via a catalog transaction that doesn't exist in the materialization code path.

### What works vs what crashes

```python
import duckdb

con = duckdb.connect()
con.execute('LOAD spatial')
con.execute('SET geometry_always_xy = true')

# CRASHES — fetch_arrow_table / to_arrow_table with parquet-sourced geometry
con.execute("SELECT * FROM read_parquet('file.parquet')").fetch_arrow_table()
# → TransactionContext::ActiveTransaction error

con.execute("SELECT * FROM read_parquet('file.parquet')").to_arrow_table()
# → Same crash (to_arrow_table is the non-deprecated replacement, same bug)

# WORKS — inline geometry (no parquet source)
con.execute("SELECT ST_Point(1.0, 2.0) AS geometry").fetch_arrow_table()
# → OK

# WORKS — streaming path, same parquet source
con.execute("SELECT * FROM read_parquet('file.parquet')").arrow().read_all()
# → OK, returns same pyarrow.Table type

# WORKS — cast geometry to WKB before export
con.execute("""
    SELECT * REPLACE (ST_AsWKB(geometry) AS geometry)
    FROM read_parquet('file.parquet')
""").fetch_arrow_table()
# → OK (but loses native geometry type)
```

### The fix: `.arrow().read_all()`

`.arrow()` returns a `pyarrow.RecordBatchReader` (streaming). `.read_all()` materializes it into a `pyarrow.Table` — identical return type to `fetch_arrow_table()`. Drop-in replacement.

```python
# Before (crashes in v1.5 with parquet geometry)
result = con.execute(query).fetch_arrow_table()

# After (works in v1.5, same return type)
result = con.execute(query).arrow().read_all()
```

This also silences the deprecation warning since `fetch_arrow_table()` is deprecated in DuckDB 1.5.

**Upstream issue:** https://github.com/duckdb/duckdb-spatial/issues/768

## Connection Setup

### Basic connection with spatial

```python
import duckdb

con = duckdb.connect()
con.execute('INSTALL spatial; LOAD spatial;')
con.execute('SET geometry_always_xy = true;')  # ALWAYS set this in v1.5
```

### Recommended: helper with race-condition handling

When running parallel tests or workers, `INSTALL` can race. Wrap it:

```python
def get_connection(load_spatial=True, load_httpfs=False):
    con = duckdb.connect()
    con.execute("SET arrow_large_buffer_size = true;")  # for >2GB string/binary columns

    if load_spatial:
        try:
            con.execute("INSTALL spatial;")
        except Exception:
            pass  # already installed by another worker
        con.execute("LOAD spatial;")
        con.execute("SET geometry_always_xy = true;")

    if load_httpfs:
        try:
            con.execute("INSTALL httpfs;")
        except Exception:
            pass
        con.execute("LOAD httpfs;")

    return con
```

### Key session settings

**Always set (safe defaults):**

```python
con.execute("SET geometry_always_xy = true;")           # v1.5: lon/lat = x/y consistently
con.execute("SET arrow_large_buffer_size = true;")       # handle >2GB binary columns in Arrow export
```

**Streaming writes only — set memory limit based on available RAM:**

```python
import os

def get_memory_limit() -> str:
    """Detect available memory and use 50%. Container-aware."""
    # Check cgroup v2 (Docker, Kubernetes)
    try:
        with open("/sys/fs/cgroup/memory.max") as f:
            limit = f.read().strip()
            if limit != "max":
                avail = int(int(limit) * 0.5)
                gb = avail / (1024**3)
                return f"{gb:.1f}GB" if gb >= 1 else f"{max(128, avail // (1024**2))}MB"
    except (FileNotFoundError, ValueError):
        pass
    # Check cgroup v1
    try:
        with open("/sys/fs/cgroup/memory/memory.limit_in_bytes") as f:
            limit = int(f.read().strip())
            if limit < 2**60:
                avail = int(limit * 0.5)
                gb = avail / (1024**3)
                return f"{gb:.1f}GB" if gb >= 1 else f"{max(128, avail // (1024**2))}MB"
    except (FileNotFoundError, ValueError):
        pass
    # Bare metal — use psutil if available
    try:
        import psutil
        avail = int(psutil.virtual_memory().available * 0.5)
        gb = avail / (1024**3)
        return f"{gb:.1f}GB" if gb >= 1 else f"{max(128, avail // (1024**2))}MB"
    except ImportError:
        return "2GB"  # conservative fallback

# Only for streaming COPY TO — limits DuckDB's buffer memory
con.execute(f"SET memory_limit = '{get_memory_limit()}';")
con.execute("SET threads = 1;")  # required for memory control with streaming writes
```

> **Do NOT set `memory_limit` or `threads = 1` for general queries** — they hurt performance.
> Only use them when streaming large COPY TO operations where memory must be bounded.

## Result Fetching Methods

| Method | Returns | v1.5 geometry from parquet | Notes |
|--------|---------|---------------------------|-------|
| `.fetchall()` | `list[tuple]` | Works (but geometry is bytes) | Must cast geometry: `ST_AsText(geom)` or `::VARCHAR` |
| `.fetchone()` | `tuple` | Works (same casting needed) | v1.5 breaks if you fetch raw GEOMETRY — use `::VARCHAR` |
| `.fetchdf()` | `pandas.DataFrame` | Works | |
| `.fetch_arrow_table()` | `pyarrow.Table` | **CRASHES** | Deprecated. Do not use with parquet geometry. |
| `.to_arrow_table()` | `pyarrow.Table` | **CRASHES** | Same bug as fetch_arrow_table. |
| `.arrow()` | `RecordBatchReader` | Works | Streaming. Call `.read_all()` to get `pyarrow.Table`. |
| `.arrow().read_all()` | `pyarrow.Table` | **Works** | Drop-in replacement for fetch_arrow_table. |

### Fetching scalar values with geometry

DuckDB 1.5 GEOMETRY type cannot be serialized via `fetchone()` / `fetchall()` — you get a serialization error. Cast first:

```python
# CRASHES in v1.5
row = con.execute("SELECT geometry FROM 'file.parquet' LIMIT 1").fetchone()

# WORKS — cast to text
row = con.execute("SELECT ST_AsText(geometry) FROM 'file.parquet' LIMIT 1").fetchone()

# WORKS — cast to VARCHAR
row = con.execute("SELECT geometry::VARCHAR FROM 'file.parquet' LIMIT 1").fetchone()

# WORKS — cast to WKB binary
row = con.execute("SELECT ST_AsWKB(geometry) FROM 'file.parquet' LIMIT 1").fetchone()

# WORKS — execute without fetching (for validation-only queries)
con.execute("SELECT ST_GeomFromText(?)", [wkt_string])  # no fetchone needed
```

## Writing GeoParquet from Python

### COPY TO with KV_METADATA

```python
import json

geo_meta = {
    "version": "1.1.0",
    "primary_column": "geometry",
    "columns": {
        "geometry": {
            "encoding": "WKB",
            "geometry_types": ["Point"],
            "bbox": [xmin, ymin, xmax, ymax],
        }
    }
}

geo_escaped = json.dumps(geo_meta).replace("'", "''")
con.execute(f"""
    COPY (SELECT * FROM my_table)
    TO 'output.parquet'
    (FORMAT PARQUET, COMPRESSION ZSTD,
     GEOPARQUET_VERSION 'NONE',
     KV_METADATA {{geo: '{geo_escaped}'}})
""")
```

### Native CRS via ST_SetCRS (v1.5+)

DuckDB 1.5 can write CRS directly into the Parquet schema — no post-processing needed:

```python
crs_json = json.dumps(projjson_dict).replace("'", "''")

# Wrap query with ST_SetCRS before COPY TO
con.execute(f"""
    COPY (
        SELECT * REPLACE (ST_SetCRS(geometry, '{crs_json}') AS geometry)
        FROM my_table
    ) TO 'output.parquet' (FORMAT PARQUET, COMPRESSION ZSTD)
""")
# CRS is written natively into the Parquet schema — no file rewrite needed
```

### Version-specific geometry encoding

| GeoParquet version | Geometry in Parquet | How to write |
|---|---|---|
| v1.0 / v1.1 | WKB (BLOB) | Cast to BLOB: `ST_AsWKB(geometry)` before COPY |
| v2.0 | Native shredded | Keep as GEOMETRY — DuckDB writes native encoding |
| parquet-geo-only | Native shredded | Keep as GEOMETRY, use `GEOPARQUET_VERSION 'NONE'` |

## Arrow Table Registration

```python
import pyarrow.parquet as pq

table = pq.read_table('input.parquet')
con.register('my_table', table)

# Convert WKB bytes to GEOMETRY for spatial processing
result = con.execute("""
    SELECT * REPLACE (ST_GeomFromWKB(geometry) AS geometry)
    FROM my_table
""").arrow().read_all()
```

## Common v1.5 Migration Patterns

### TRY_CAST for WKT validation

```python
# Before (broken in v1.5)
con.execute(f"SELECT TRY_CAST('{wkt}' AS GEOMETRY)")

# After
con.execute("SELECT TRY(ST_GeomFromText(?))", [wkt])
```

### SQL injection prevention

```python
# BAD — string interpolation with untrusted data
con.execute(f"SELECT ST_GeomFromText('{user_input}')")

# GOOD — parameterized query
con.execute("SELECT ST_GeomFromText(?)", [user_input])
```

### always_xy replacement

```python
# Before (per-call, removed in v1.5)
con.execute("SELECT ST_Transform(geom, 'EPSG:4326', 'EPSG:3857', always_xy := true) FROM t")

# After (session-level, set once)
con.execute("SET geometry_always_xy = true;")
con.execute("SELECT ST_Transform(geom, 'EPSG:4326', 'EPSG:3857') FROM t")
```
