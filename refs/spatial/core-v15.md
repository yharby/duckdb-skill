# DuckDB v1.5 Core Geometry Functions (No Spatial Extension Required)

These functions are built into DuckDB core starting with v1.5.0 "Variegata". They work without loading the spatial extension.

---

### && (Bounding Box Intersection Operator)

#### Signature

```sql
BOOLEAN geom1 && geom2
```

#### Description

Returns true if the bounding boxes of two geometries intersect. Modeled after PostGIS `&&` operator. When used in `WHERE` clauses, triggers spatial filter pushdown to skip non-intersecting Parquet row groups.

#### Example

```sql
-- Spatial filter with row group pruning (works on Parquet + GeoParquet files)
SELECT * FROM my_table WHERE geom && ST_MakeEnvelope(0, 0, 10, 10);
```

----

### ST_GeomFromWKB (Core)

#### Signature

```sql
GEOMETRY ST_GeomFromWKB (wkb BLOB)
```

#### Description

Validates and converts WKB (Well-Known Binary) data to GEOMETRY. Handles both little-endian and big-endian WKB, as well as EWKB (Extended WKB) format. Added in DuckDB v1.5 core (PR #19476).

----

### ST_CRS

#### Signature

```sql
VARCHAR ST_CRS (geom GEOMETRY)
```

#### Description

Returns the Coordinate Reference System (CRS) identifier of a geometry column/value. Returns the CRS in short form (e.g., `OGC:CRS84`, `EPSG:4326`) if recognized, or the full PROJJSON/WKT2 definition otherwise. Added in DuckDB v1.5 core (PR #20143).

#### Example

```sql
SELECT ST_CRS(geom) FROM my_table;
-- 'EPSG:4326'
```

----

### ST_SetCRS

#### Signature

```sql
GEOMETRY ST_SetCRS (geom GEOMETRY, crs VARCHAR)
```

#### Description

Assigns a CRS to a geometry value. Supports AUTH:CODE shortcuts (e.g., `EPSG:4326`), WKT2, and PROJJSON formats. Does NOT reproject — use `ST_Transform` for that. Added in DuckDB v1.5 core (PR #20143).

#### Example

```sql
SELECT ST_SetCRS(geom, 'EPSG:4326') FROM my_table;

-- CRS-parameterized column type
CREATE TABLE t1 (g GEOMETRY('EPSG:4326'));
```

----

### GEOMETRY Type Casting (v1.5 Core)

```sql
-- WKT to GEOMETRY (built into core, no spatial extension)
SELECT 'POINT(0 0)'::GEOMETRY;

-- GEOMETRY to WKT
SELECT geom::VARCHAR AS wkt FROM my_table;
```
