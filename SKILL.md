---
name: duckdb
description: "DuckDB v1.5 spatial/GIS analytics: geospatial SQL, file conversions, raster analysis. Geographic data (Shapefile, GeoJSON, GeoPackage, OSM), spatial ops (distance, area, joins, intersections), CRS/EPSG transforms, H3/A5/S2 indexing, raster (RASTER, RT_*, RaQuet), GeoParquet (Pyramid, Format 2.11+), QUADBIN, core GEOMETRY with CRS, VARIANT, DuckLake, Overture Maps (places, buildings, roads), Iceberg tables/catalogs (iceberg_scan), vector similarity (vss), BM25/FTS. General: Parquet/CSV/JSON, httpfs, ODBC, read_duckdb(), friendly SQL (FROM-first, GROUP BY ALL, lambda), geocoding (H3 tiling, JACCARD), external DBs. Use for DuckDB, spatial SQL, GeoParquet, geometry, CRS, H3/A5/S2, Overture, Iceberg, vector search, BM25, or geospatial analytics."
---

# DuckDB v1.5 Skill

> DuckDB v1.5.0 "Variegata" — Released 2026-03-09.

## How to Think: Discovery → Understanding → Analysis

The most common mistake is jumping straight to queries. Instead, follow this workflow — it prevents wrong assumptions, bad joins, and wasted work.

### Phase 1: Discover the Data

Before writing any analytical query, find out what you're working with.

**Local files — use glob patterns to find them:**

```sql
-- Find what files exist (Parquet, CSV, JSON, GeoJSON, etc.)
FROM glob('data/*.parquet');
FROM glob('**/*.csv');
FROM glob('/path/to/project/**/*.geojson');
```

**Remote files — always load httpfs first, then probe:**

```sql
INSTALL httpfs; LOAD httpfs;
-- For S3, also set the region:
SET s3_region = 'us-west-2';

-- Remote Parquet (only reads metadata, not full file)
DESCRIBE FROM 'https://example.com/data.parquet';

-- S3 / Azure / GCS
DESCRIBE FROM 's3://bucket/path/file.parquet';

-- S3 buckets with dots in the name (e.g., source.coop) need path-style URLs,
-- because virtual-hosted style breaks SSL certificate validation:
SET s3_url_style = 'path';
DESCRIBE FROM 's3://us-west-2.opendata.source.coop/repo/data.parquet';

-- Hive-partitioned datasets — check partition structure
FROM parquet_metadata('s3://bucket/dataset/**/*.parquet') LIMIT 5;
```

**Databases — inspect what's available:**

```sql
-- Attached databases
SHOW ALL TABLES;
DESCRIBE table_name;

-- External DuckDB files (new in v1.5 — no ATTACH needed)
FROM read_duckdb('other.duckdb', table_name := 'my_table');

-- External databases via ODBC (new in v1.5, requires INSTALL odbc_scanner)
-- odbc_connect(conn_str) + odbc_query(conn, sql)
```

**Discover functions from DuckDB itself** — when unsure about a function signature:

```sql
-- Search for functions by name pattern
SELECT function_name, parameters, return_type
FROM duckdb_functions() WHERE function_name LIKE 'ST_Coverage%';

-- List all extensions and their status
FROM duckdb_extensions();

-- List all settings
FROM duckdb_settings() WHERE name LIKE '%geometry%';
```

**Geospatial files — check layers and metadata:**

```sql
LOAD spatial;
SELECT * FROM ST_Read_Meta('data.gpkg');       -- layers, CRS, field schemas
SELECT * FROM ST_Read_Meta('data.gdb');        -- ESRI File Geodatabase
```

### Phase 2: Understand the Shape

Once you know WHAT files exist, understand their structure before querying.

```sql
-- Schema: column names and types (instant, reads only metadata)
DESCRIBE FROM 'data.parquet';
DESCRIBE FROM 'data.csv';

-- Stats: min, max, approx_unique, avg, std, quartiles, nulls (scans full data)
SUMMARIZE FROM 'data.parquet';
SUMMARIZE FROM 'data.csv';

-- Quick sample: see actual values (avoids scanning everything)
FROM 'data.parquet' LIMIT 10;
FROM 'data.csv' LIMIT 10;

-- Row count estimate (fast for Parquet — reads metadata only)
SELECT count(*) FROM 'data.parquet';

-- For Parquet: row group structure, column statistics, file-level metadata
FROM parquet_metadata('data.parquet');
FROM parquet_schema('data.parquet');
FROM parquet_kv_metadata('data.parquet');  -- GeoParquet metadata lives here
```

This phase is critical because:
- DESCRIBE tells you column types — you'll know if geometry is WKB blob vs native GEOMETRY
- SUMMARIZE reveals data quality issues (null percentages, unexpected ranges, cardinality)
- A quick LIMIT sample shows actual values — field naming conventions, coordinate order, encoding
- For spatial data: you need to know the CRS before any spatial operations

### Detecting the CRS

Knowing the CRS is essential before any spatial operation. The method depends on how geometry is stored:

**Step 1: Identify the format.** Run DESCRIBE first — the column type tells you which case you're in:

| Column type | Format | CRS location |
|---|---|---|
| `geometry('epsg:4326')` | GeoParquet or native Parquet geometry | CRS in column type (spatial resolves EPSG) |
| `geometry` (no CRS) | Native Parquet geometry with no CRS, or CRS not resolved | Check `parquet_schema()` logical_type |
| `blob` | Plain Parquet with WKB | No CRS embedded — must know from context |

**Case 1: GeoParquet (Parquet with `geo` KV metadata)**

```sql
-- Quickest: DESCRIBE shows CRS in the column type (requires LOAD spatial for EPSG resolution)
LOAD spatial;
DESCRIBE FROM 'data.parquet';
-- → geom  geometry('epsg:4326')

-- Or use ST_CRS on a row
SELECT ST_CRS(geom) FROM 'data.parquet' LIMIT 1;
-- → 'EPSG:4326'

-- Without spatial loaded, DESCRIBE still works but shows raw PROJJSON instead of the short code:
-- → geom  geometry('{"$schema":"https://proj.org/schemas/v0.5/projjson.schema.json",...}')

-- Full GeoParquet metadata inspection (no spatial extension needed):
WITH kv AS (
    SELECT file_name,
           decode(key) AS key_str,
           decode(value)::JSON AS geo_json
    FROM parquet_kv_metadata('data/*.parquet')
)
SELECT file_name,
       geo_json->>'$.columns.geometry.encoding' AS encoding,
       geo_json->'$.columns.geometry.geometry_types' AS geom_types,
       geo_json->'$.columns.geometry.bbox' AS bbox,
       geo_json->'$.columns.geometry.crs.id.authority' AS crs_authority,
       geo_json->'$.columns.geometry.crs.id.code' AS crs_code,
       geo_json->>'$.primary_column' AS primary_column
FROM kv WHERE key_str = 'geo';
-- If crs is NULL → default is OGC:CRS84 (WGS84 lon/lat) per GeoParquet spec
```

**Case 2: Native Parquet geometry (Format 2.11+ — no `geo` key)**

These files store CRS in the Parquet schema's logical type, not in KV metadata. DuckDB reads it automatically.

```sql
-- DESCRIBE shows the resolved CRS when spatial can resolve it
LOAD spatial;
DESCRIBE FROM 'native_geo.parquet';
-- → geometry  geometry('epsg:5070')    ← CRS resolved
-- → geometry  geometry                 ← CRS not resolved or absent

-- Check the raw Parquet logical type to see how CRS is encoded
SELECT name, logical_type
FROM parquet_schema('native_geo.parquet')
WHERE logical_type LIKE 'GeometryType%';
-- → geometry  GeometryType(crs=srid:5070)     ← SRID-based CRS
-- → geometry  GeometryType(crs=<projjson>)     ← full PROJJSON CRS
-- → geometry  GeometryType(crs=<null>)         ← no CRS specified
```

**Case 3: Plain Parquet (WKB blob, no geometry metadata)**

```sql
-- DESCRIBE shows blob type — no CRS information available
DESCRIBE FROM 'data.parquet';
-- → wkb_geom  blob

-- No CRS is embedded. You must know the CRS from documentation or context,
-- then assign it after converting to GEOMETRY:
LOAD spatial;
SELECT ST_SetCRS(ST_GeomFromWKB(wkb_geom), 'EPSG:4326') FROM 'data.parquet';
```

**Case 4: GDAL-supported formats (GPKG, Shapefile, GDB, FlatGeobuf, GeoJSON, KML)**

```sql
-- Use ST_Read_Meta to get CRS from any GDAL-readable format
LOAD spatial;
SELECT
    layers[1].geometry_fields[1].crs.auth_name AS authority,
    layers[1].geometry_fields[1].crs.auth_code AS code
FROM ST_Read_Meta('data.gpkg');
-- → EPSG  4326

-- For multi-layer files, inspect all layers:
SELECT * FROM ST_Read_Meta('data.gdb');
```

**Case 5: H3/spatial-indexed data (no geometry column)**

Some datasets store location as H3 BIGINT indices instead of geometry columns. H3 cells are always WGS84 — the CRS is implicit. Derive coordinates on the fly:

```sql
INSTALL h3 FROM community; LOAD h3;
SELECT h3_index,
       h3_h3_to_string(h3_index) AS h3_hex,  -- BIGINT → hex string (e.g., '820007fffffffff')
       h3_cell_to_lat(h3_index) AS lat,
       h3_cell_to_lng(h3_index) AS lon
FROM 'data.parquet' LIMIT 5;
```

### Phase 3: Analyze with Purpose

Now that you understand the data, write targeted queries. Some principles:

**Start narrow, expand.** Query a small subset first (WHERE + LIMIT), verify the logic, then remove the constraints.

**Use FROM-first syntax** — it's more readable and DuckDB-idiomatic:

```sql
-- Instead of SELECT * FROM tbl WHERE ...
FROM tbl SELECT col1, col2 WHERE x > 10;
FROM tbl;  -- implicit SELECT *
```

**Use GROUP BY ALL** — let DuckDB infer grouping columns from context:

```sql
SELECT region, category, sum(amount), count()
FROM sales
GROUP BY ALL;  -- infers GROUP BY region, category
```

**Use SUMMARIZE on intermediate results** to verify transformations:

```sql
SUMMARIZE (
    SELECT *, ST_Area_Spheroid(geom) AS area_m2
    FROM parcels
    WHERE area_m2 > 0
);
-- Check: are the area values reasonable? Any nulls introduced?
```

**Chain analysis steps** — use CTEs or CREATE OR REPLACE TABLE for iterative exploration:

```sql
CREATE OR REPLACE TABLE enriched AS
    SELECT p.*, z.zone_name
    FROM points p
    JOIN zones z ON ST_Intersects(p.geom, z.geom);

SUMMARIZE enriched;  -- verify the join didn't explode or lose rows
```

### When Queries Fail or Perform Poorly: Use EXPLAIN ANALYZE

If a query is **complex, slow, or failing unexpectedly**, use `EXPLAIN ANALYZE` to understand what's happening. It shows the query plan with runtime metrics — actual row counts, estimated cardinalities, and timing for each operation.

```sql
EXPLAIN ANALYZE SELECT ... ;
```

**When to use it:**
- Query runs slower than expected
- Getting unexpected results or row counts
- Complex joins or subqueries that you want to verify
- Need to see if indexes or spatial joins are being used
- Want to break down a complex query into analyzable parts

The output shows a tree of operations with:
- **EC (Estimated Cardinality)**: what DuckDB predicted
- **Actual cardinality**: what actually happened
- **Timing**: cumulative wall-clock time per operator

If estimated vs actual cardinalities are far off, or if certain operations dominate the time, that tells you where to focus optimization. For deep-dive details and examples, read `refs/explain-analyze.md`.

## v1.5 Breaking Changes — Must Know

These trip up anyone using pre-v1.5 patterns:

| Old pattern | v1.5+ correct way |
|---|---|
| `x -> x + 1` (arrow lambda) | `lambda x: x + 1` — arrow syntax is deprecated, errors in v2.0 |
| Missing `geometry_always_xy` | `SET geometry_always_xy = true;` after `LOAD spatial` — v1.5 warns, v2.1 makes it default |
| `INSTALL spatial` for GEOMETRY columns | Not needed — GEOMETRY is a core type in v1.5 (only INSTALL spatial for ST_* functions) |
| `GEOMETRY('EPSG:4326')` without spatial | EPSG codes require spatial extension. Without it, use `GEOMETRY('OGC:CRS84')` or plain `GEOMETRY` |
| Mixing CRS in spatial operations | v1.5 errors at bind time. Use consistent CRS or strip with `::GEOMETRY` |
| `.fetch_arrow_table()` with parquet geometry | Use `.arrow().read_all()` — crashes with `TransactionContext` error (see `refs/python-api.md`) |
| `TRY_CAST(x AS GEOMETRY)` | `TRY(ST_GeomFromText(x))` — TRY_CAST broken for GEOMETRY in v1.5 |

## Core GEOMETRY Type (no extension needed)

```sql
-- GEOMETRY is now a built-in type with optional CRS parameter
CREATE TABLE t1 (g GEOMETRY);                    -- no CRS
CREATE TABLE t2 (g GEOMETRY('OGC:CRS84'));       -- built-in CRS (no spatial needed)
CREATE TABLE t3 (g GEOMETRY('EPSG:4326'));       -- requires LOAD spatial for EPSG codes

-- Built-in functions (no LOAD spatial needed):
ST_GeomFromWKB(blob)          -- WKB → geometry
ST_AsWKB(geom)                -- geometry → WKB (alias: ST_AsBinary)
ST_AsWKT(geom)                -- geometry → WKT (alias: ST_AsText)
ST_Intersects_Extent(a, b)    -- bbox intersection
a && b                        -- operator alias (uses row-group stats!)
ST_CRS(geom)                  -- get CRS identifier
ST_SetCRS(geom, 'OGC:CRS84') -- assign CRS (no coordinate transform)
'POINT(0 0)'::GEOMETRY        -- cast from WKT
```

Subtypes: Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon, GeometryCollection. Vertices can have Z, M, or ZM dimensions.

### CRS System

```sql
SELECT * FROM duckdb_coordinate_systems();  -- list all known CRSs (works without spatial)
-- Built-in: OGC:CRS84, OGC:CRS83. Spatial ext adds 7,000+ EPSG codes.
-- Accepts: AUTH:CODE, full PROJJSON, full WKT2-2019
SET ignore_unknown_crs = true;  -- silently drop unknown CRS (works without spatial)
```

### Geometry Shredding (~3x compression)

Automatic: when all geometries in a row group share the same subtype, DuckDB decomposes to STRUCT/LIST/DOUBLE with ALP compression. Control with `SET geometry_minimum_shredding_size = 30000` (default), `0` (always), `-1` (disable). Not shredded: GeometryCollection, empty geometries, mixed subtypes.

## Spatial Recipes (requires `LOAD spatial`)

### Session Setup

Always start spatial work with:

```sql
INSTALL spatial; LOAD spatial;
SET geometry_always_xy = true;  -- lon/lat = x/y consistently
```

### Spatial Joins (automatic R-tree, v1.3+)

```sql
-- Point-in-polygon (automatic R-tree, no index creation needed)
SELECT p.*, z.zone_name
FROM points p JOIN zones z ON ST_Intersects(p.geom, z.geom);

-- Proximity join — ST_DWithin is fastest (triggers SPATIAL_JOIN operator)
SELECT a.*, b.*
FROM table_a a JOIN table_b b ON ST_DWithin(a.geom, b.geom, 1000);
```

Predicates that trigger SPATIAL_JOIN: `ST_Intersects`, `ST_Contains`, `ST_ContainsProperly`, `ST_Within`, `ST_Covers`, `ST_CoveredBy`, `ST_Overlaps`, `ST_Touches`, `ST_Crosses`, `ST_DWithin`.

### CRS Transform

```sql
-- v1.5: 2-arg form (source CRS inferred from typed column)
SELECT ST_Transform(geom, 'EPSG:4326') FROM tbl;

-- Explicit source/target
SELECT ST_Transform(geom, 'EPSG:4326', 'EPSG:3857') FROM tbl;
```

### Distance & Area

```sql
SELECT ST_Distance_Spheroid(ST_Point(-74.0, 40.7), ST_Point(-0.1, 51.5));  -- meters
SELECT ST_Distance_Sphere(a.geom, b.geom);   -- haversine, meters
SELECT ST_Area_Spheroid(geom);                -- m²
SELECT ST_Length_Spheroid(geom);              -- meters
-- ST_Point(x, y) = ST_Point(lon, lat) — x is always longitude
```

### Export

```sql
-- GeoParquet (default: v1 metadata)
COPY tbl TO 'output.parquet' (FORMAT PARQUET);

-- Max compatibility: GeoParquet v1 metadata + native Parquet geometry stats
COPY tbl TO 'output.parquet' (FORMAT PARQUET, GEOPARQUET_VERSION 'BOTH');

-- GDAL formats (read refs/gdal-formats.md for full reference)
COPY tbl TO 'out.geojson' WITH (FORMAT GDAL, DRIVER 'GeoJSON');
COPY tbl TO 'out.gpkg' WITH (FORMAT GDAL, DRIVER 'GPKG', LAYER_NAME 'my_layer');
COPY tbl TO 'out.shp' WITH (FORMAT GDAL, DRIVER 'ESRI Shapefile');

-- Hilbert-ordered for best spatial query performance
COPY (SELECT * FROM tbl ORDER BY ST_Hilbert(geom)) TO 'sorted.parquet' (FORMAT PARQUET);
```

### R-Tree Index

```sql
-- Populate table FIRST, then create index (bulk load is 10x+ faster)
CREATE INDEX idx ON tbl USING RTREE (geom);
-- Auto-used with spatial predicates
```

## Friendly SQL Quick Reference

```sql
-- FROM-first
FROM tbl;                                      -- implicit SELECT *
FROM tbl SELECT col1, col2 WHERE x > 10;       -- FROM leads, then SELECT, then WHERE

-- GROUP BY ALL / ORDER BY ALL
SELECT region, count() FROM sales GROUP BY ALL ORDER BY ALL;

-- Star expressions
SELECT * EXCLUDE (internal_id, tmp) FROM tbl;
SELECT * REPLACE (upper(name) AS name) FROM tbl;

-- COLUMNS() — apply across matching columns
SELECT min(COLUMNS('.*_price')) FROM products;
SELECT COLUMNS(lambda c: c LIKE '%name%') FROM tbl;

-- Lambda syntax (v1.5+ — arrow syntax deprecated)
SELECT list_transform([1,2,3], lambda x: x * 2);
SELECT list_filter(range(10), lambda x: x % 2 = 0);

-- Dot operator chaining
SELECT ('hello world').upper().split(' ').list_transform(lambda x: x.len());

-- List comprehension
SELECT [x * 2 FOR x IN [1, 2, 3]];

-- ASOF join (time-series)
SELECT * FROM trades ASOF JOIN quotes USING (symbol, timestamp);

-- LATERAL join
SELECT * FROM customers, LATERAL (SELECT * FROM orders WHERE orders.cust_id = customers.id LIMIT 3);

-- POSITIONAL join (by row position)
SELECT * FROM t1 POSITIONAL JOIN t2;

-- Direct file queries (no CREATE TABLE needed)
FROM 'data.csv';
FROM 'data.parquet';
FROM 'https://example.com/data.parquet';
FROM 'data/**/*.parquet';  -- glob patterns

-- Top-N aggregates (no window function needed)
SELECT max(val, 3) FROM t GROUP BY grp;           -- top-3 per group
SELECT arg_max(name, score, 3) FROM t GROUP BY grp;  -- names of top-3

-- FILTER clause
SELECT count() FILTER (status = 'active'), sum(amt) FILTER (year = 2025) FROM orders;

-- PIVOT / UNPIVOT
PIVOT sales ON product USING sum(amount);
UNPIVOT monthly ON jan, feb, mar INTO NAME month VALUE amount;

-- Variables
SET VARIABLE my_threshold = 100;
SELECT * FROM tbl WHERE val > getvariable('my_threshold');

-- Trailing commas are OK
SELECT col1, col2, FROM tbl;

-- Percentage LIMIT
SELECT * FROM tbl LIMIT 10%;
```

## VARIANT Type (new in v1.5)

Typed binary semi-structured data. Better compression and query performance than JSON.

```sql
SELECT 42::VARIANT;
SELECT {'name': 'Alice', 'age': 30}::VARIANT;
SELECT variant_typeof(data) FROM tbl;  -- inspect type
SELECT data.name FROM tbl;             -- dot notation
-- Supported in Parquet (shredded), DuckLake, Delta Lake
```

## Key Extensions

| Extension | Purpose | Install |
|-----------|---------|---------|
| `spatial` | ST_* functions, GDAL I/O | `INSTALL spatial; LOAD spatial;` |
| `httpfs` | Remote files (S3/HTTP/GCS/Azure) | `INSTALL httpfs; LOAD httpfs;` |
| `h3` | H3 hexagonal spatial index | `INSTALL h3 FROM community; LOAD h3;` |
| `a5` | A5 pentagonal index | `INSTALL a5 FROM community; LOAD a5;` |
| `geography` | S2 spherical geometry | community extension |
| `bigquery` | Connect to Google BigQuery | `FORCE INSTALL bigquery FROM community; LOAD bigquery;` |
| `iceberg` | Apache Iceberg tables (read/write, catalogs) | `INSTALL iceberg; LOAD iceberg;` |
| `ducklake` | Lakehouse (SQL catalog + Parquet) | `INSTALL ducklake; LOAD ducklake;` |
| `odbc_scanner` | Query via ODBC (new in v1.5) | `INSTALL odbc_scanner; LOAD odbc_scanner;` |
| `fts` | Full-text search (BM25) | `INSTALL fts; LOAD fts;` |
| `vss` | Vector similarity search (HNSW) | `INSTALL vss; LOAD vss;` |

## Common Pitfalls

| Mistake | Fix |
|---------|-----|
| `x -> x + 1` | `lambda x: x + 1` |
| Mixing CRS in spatial ops | Ensure consistent CRS or strip with `::GEOMETRY` |
| Not setting `geometry_always_xy` | `SET geometry_always_xy = true;` after `LOAD spatial` |
| `ST_Point(lat, lon)` | `ST_Point(lon, lat)` — x is longitude |
| `INSTALL spatial` for GEOMETRY columns | Not needed in v1.5 — GEOMETRY is core |
| `NOT ST_Intersects(a, b)` in JOINs | Causes OOM — use `NOT EXISTS (SELECT 1 ... WHERE ST_Intersects(...))` |
| `ST_Transform` without `ST_SetCRS` | Output has no CRS metadata — always set CRS on input first |
| FlatGeobuf WHERE ST_Intersects | Doesn't use FGB spatial index — use `ST_Read('f.fgb', spatial_filter_box=...)` |
| Large geometries in GeoParquet | Default row group too big → full file download — use `ROW_GROUP_SIZE 2500` |
| `ST_DWithin_Spheroid` in JOINs | No SPATIAL_JOIN optimization — use `ST_DWithin` instead |

## Reference Files — Load on Demand

Read these ONLY when the task requires the specific topic. Do not preload.

**Geospatial formats and I/O:**
- `refs/gdal-formats.md` — Read when: converting between formats (GPKG, Shapefile, GeoJSON, FlatGeobuf, KML, FileGDB), querying WFS/API endpoints.
- `refs/overture-maps.md` — Read when: working with **Overture Maps** data (places, buildings, roads — includes S3/Azure paths, bbox filtering, GeoParquet metadata inspection).

**Spatial function deep-dives (read `refs/spatial/index.md` first for the function index, then drill in):**
- `refs/spatial/creation.md` — ST_Point, ST_Point2D, ST_Point3D, ST_Point4D, ST_MakePoint, ST_MakeLine, ST_MakePolygon, ST_MakeBox2D, ST_MakeEnvelope, ST_Collect, ST_Multi, ST_BuildArea
- `refs/spatial/predicates.md` — ST_Intersects, ST_Intersects_Extent, ST_Contains, ST_ContainsProperly, ST_CoveredBy, ST_Covers, ST_Crosses, ST_DWithin, ST_DWithin_GEOS, ST_DWithin_Spheroid, ST_Disjoint, ST_Equals, ST_Overlaps, ST_Touches, ST_Within, ST_WithinProperly
- `refs/spatial/measurement.md` — ST_Distance, ST_Distance_GEOS, ST_Distance_Sphere, ST_Distance_Spheroid, ST_Area, ST_Area_Spheroid, ST_Length, ST_Length_Spheroid, ST_Perimeter, ST_Perimeter_Spheroid, ST_Azimuth, ST_ShortestLine
- `refs/spatial/transforms.md` — ST_Transform, ST_Buffer, ST_Simplify, ST_SimplifyPreserveTopology, ST_ReducePrecision, ST_RemoveRepeatedPoints, ST_Reverse, ST_FlipCoordinates, ST_Force2D, ST_Force3DM, ST_Force3DZ, ST_Force4D, ST_MakeValid, ST_Normalize, ST_Centroid, ST_ConvexHull, ST_ConcaveHull, ST_Envelope, ST_Boundary, ST_Difference, ST_Intersection, ST_Union, ST_Affine, ST_VoronoiDiagram, ST_MaximumInscribedCircle, ST_MinimumRotatedRectangle, ST_PointOnSurface, ST_Hilbert, ST_Node
- `refs/spatial/accessors.md` — ST_X, ST_Y, ST_Z, ST_M, ST_HasM, ST_HasZ, ST_ZMFlag, ST_XMax, ST_XMin, ST_YMax, ST_YMin, ST_ZMax, ST_ZMin, ST_MMax, ST_MMin, ST_Dimension, ST_NGeometries, ST_NInteriorRings, ST_NPoints, ST_NumGeometries, ST_NumInteriorRings, ST_NumPoints, ST_ExteriorRing, ST_StartPoint, ST_EndPoint, ST_PointN, ST_Points, ST_IsClosed, ST_IsEmpty, ST_IsRing, ST_IsSimple, ST_IsValid, ST_Extent, ST_Extent_Approx, ST_Dump, ST_CollectionExtract, ST_Polygonize, ST_GeometryType
- `refs/spatial/conversion-io.md` — ST_AsText, ST_AsWKB, ST_AsGeoJSON, ST_AsHEXWKB, ST_AsMVTGeom, ST_AsSVG, ST_GeomFromText, ST_GeomFromWKB, ST_GeomFromGeoJSON, ST_GeomFromHEXWKB, ST_GeomFromHEXEWKB
- `refs/spatial/aggregates.md` — ST_Union_Agg, ST_MemUnion_Agg, ST_Extent_Agg, ST_Envelope_Agg, ST_Intersection_Agg, ST_AsMVT, ST_CoverageInvalidEdges_Agg, ST_CoverageSimplify_Agg, ST_CoverageUnion_Agg
- `refs/spatial/linear-ref.md` — ST_LineInterpolatePoint, ST_LineInterpolatePoints, ST_LineLocatePoint, ST_LineMerge, ST_LineSubstring, ST_LocateAlong, ST_LocateBetween, ST_InterpolatePoint, ST_LineString2DFromWKB, ST_Polygon2DFromWKB, ST_Point2DFromWKB
- `refs/spatial/coverage-tiling.md` — ST_CoverageUnion, ST_CoverageInvalidEdges, ST_CoverageSimplify, ST_TileEnvelope, ST_QuadKey
- `refs/spatial/macros.md` — ST_Rotate, ST_RotateX, ST_RotateY, ST_RotateZ, ST_Scale, ST_TransScale, ST_Translate
- `refs/spatial/table-functions.md` — ST_Read, ST_ReadOSM, ST_ReadSHP, ST_Read_Meta, ST_Drivers, ST_GeneratePoints
- `refs/spatial/core-v15.md` — ST_GeomFromWKB, ST_CRS, ST_SetCRS (v1.5 built-in, no extension needed)
- `refs/spatial/a5-s2.md` — A5: a5_lonlat_to_cell, a5_cell_to_lonlat, a5_cell_to_boundary, a5_cell_to_parent, a5_cell_to_children, a5_cell_area, a5_get_resolution, a5_get_num_cells, a5_get_res0_cells, a5_compact, a5_uncompact. S2/Geography: s2_area, s2_dimension, s2_distance, s2_dwithin, s2_is_valid, s2_is_valid_reason, s2_isempty, s2_length, s2_max_distance, s2_num_points, s2_perimeter, s2_x, s2_y, s2_bounds_box, s2_box, s2_box_intersects, s2_box_struct, s2_box_union, s2_box_wkb, s2_covering, s2_covering_fixed_level, s2_cellfromlonlat, s2_cellfromwkb, s2_arbitrarycellfromwkb, s2_cell_child, s2_cell_contains, s2_cell_edge_neighbor, s2_cell_from_token, s2_cell_intersects, s2_cell_level, s2_cell_parent, s2_cell_range_max, s2_cell_range_min, s2_cell_token, s2_cell_vertex, s2_astext, s2_aswkb, s2_format, s2_geogfromtext, s2_geogfromtext_novalidate, s2_geogfromwkb, s2_geogfromwkb_novalidate, s2_prepare, s2_contains, s2_equals, s2_intersects, s2_mayintersect, s2_difference, s2_intersection, s2_union, s2_data_city, s2_data_country, s2_data_cities, s2_data_countries

**Spatial indexing and tiling:**
- `refs/spatial-indexes.md` — Read when: comparing H3 vs A5 vs S2 vs QUADBIN to choose the right spatial index. Overview and comparison tables.
- `refs/h3.md` — h3_latlng_to_cell, h3_latlng_to_cell_string, h3_cell_to_lat, h3_cell_to_lng, h3_cell_to_latlng, h3_string_to_h3, h3_h3_to_string, h3_cell_to_parent, h3_cell_to_children, h3_cell_to_children_size, h3_cell_to_center_child, h3_cell_to_child_pos, h3_child_pos_to_cell, h3_get_resolution, h3_get_base_cell_number, h3_is_valid_cell, h3_is_pentagon, h3_is_res_class_iii, h3_get_icosahedron_faces, h3_grid_disk, h3_grid_disk_distances, h3_grid_disk_unsafe, h3_grid_ring, h3_grid_ring_unsafe, h3_grid_path_cells, h3_grid_distance, h3_max_grid_disk_size, h3_cell_to_boundary_wkt, h3_cell_to_boundary_wkb, h3_cells_to_multi_polygon_wkt, h3_cells_to_multi_polygon_wkb, h3_directed_edge_to_boundary_wkt, h3_directed_edge_to_boundary_wkb, h3_polygon_wkt_to_cells, h3_polygon_wkb_to_cells, h3_polygon_wkt_to_cells_string, h3_polygon_wkb_to_cells_string, h3_polygon_wkt_to_cells_experimental, h3_polygon_wkb_to_cells_experimental, h3_compact_cells, h3_uncompact_cells, h3_origin_to_directed_edges, h3_get_directed_edge_origin, h3_get_directed_edge_destination, h3_directed_edge_to_cells, h3_cells_to_directed_edge, h3_are_neighbor_cells, h3_is_valid_directed_edge, h3_cell_to_vertex, h3_cell_to_vertexes, h3_vertex_to_lat, h3_vertex_to_lng, h3_vertex_to_latlng, h3_is_valid_vertex, h3_cell_area, h3_edge_length, h3_great_circle_distance, h3_get_hexagon_area_avg, h3_get_hexagon_edge_length_avg, h3_get_num_cells, h3_get_res0_cells, h3_get_res0_cells_string, h3_get_pentagons, h3_get_pentagons_string
- `refs/a5.md` — a5_lonlat_to_cell, a5_cell_to_lonlat, a5_cell_area, a5_cell_to_boundary, a5_cell_to_parent, a5_cell_to_children, a5_get_resolution, a5_get_num_cells, a5_get_res0_cells, a5_compact, a5_uncompact

**Python API:**
- `refs/python-api.md` — Read when: using DuckDB from Python, Arrow export, `fetch_arrow_table()` v1.5 bug, connection setup, GeoParquet writing, result fetching with geometry columns, v1.5 migration patterns.

**External database connectors:**
- `refs/bigquery.md` — Read when: connecting to Google BigQuery, querying BigQuery tables from DuckDB, working with BigQuery GEOGRAPHY columns, using bigquery_scan/bigquery_query functions, managing BigQuery datasets, or accessing public BigQuery datasets. Covers authentication (DuckDB Secrets, service accounts, gcloud), DDL operations, geometry mapping, and cost optimization.
- `refs/iceberg.md` — Read when: working with Apache Iceberg tables, attaching to Iceberg REST catalogs (Polaris, Lakekeeper, AWS Glue, S3 Tables, BigLake), reading/writing Iceberg tables, time travel via snapshots, partition pruning, schema evolution, or using iceberg_scan/iceberg_metadata/iceberg_snapshots functions.

**Specialized topics:**
- `refs/ducklake.md` — Read when: working with DuckLake lakehouse (setup, time travel, partitioning, ACID, spatial support, VARIANT).
- `refs/raster-tiling.md` — Read when: working with raster data, RASTER type, RT_* functions, RaQuet (raster-in-Parquet), QUADBIN spatial indexing, converting GeoTIFF/COG/NetCDF to RaQuet, tile statistics, raquet-io CLI, Pyramid GeoParquet.
- `refs/fts.md` — Read when: implementing full-text search (BM25 index creation, match_bm25 queries, stemming).
- `refs/vss.md` — Read when: working with vector embeddings and similarity search (HNSW indexes, distance metrics).
- `refs/wasm-patterns.md` — Read when: targeting DuckDB-WASM in the browser (extension loading, geocoding, MVT generation).
- `refs/summarize.md` — Read when: needing SUMMARIZE command details beyond the basics above.
- `refs/autocomplete.md` — Read when: building interactive SQL tools with auto-complete.
- `refs/explain-analyze.md` — Read when: queries are complex or failing repeatedly, you need to understand query execution plans, diagnose performance issues, or break down complex queries into analyzable parts. Use EXPLAIN ANALYZE to see runtime metrics, actual vs estimated cardinalities, and operator timing.

## Troubleshooting Extension Installation

If a standard extension installation fails or you encounter errors related to outdated functionality, try installing from the `core_nightly` repository to get the latest development build:

```sql
-- Standard installation (try this first)
INSTALL extension_name;
LOAD extension_name;

-- If the above fails or you encounter version-related errors:
FORCE INSTALL extension_name FROM core_nightly;
LOAD extension_name;

-- Example: DuckLake with latest features
FORCE INSTALL ducklake FROM core_nightly;
LOAD ducklake;
```

**When to use `core_nightly`:**
- Standard installation fails with compatibility errors
- You need features not yet in the stable release
- Documentation mentions functionality you don't have
- Error messages indicate version mismatches

**Note**: `FORCE INSTALL` overwrites any existing installation. Nightly builds are development versions and may be less stable than official releases.

## Configuration Quick Reference

```sql
SET geometry_always_xy = true;              -- lon/lat = x/y axis order
SET geometry_minimum_shredding_size = 30000; -- geometry shredding threshold
SET enable_geoparquet_conversion = true;    -- auto-decode GeoParquet (default: true)
SET ignore_unknown_crs = false;             -- error on unknown CRS (default: false)
```
