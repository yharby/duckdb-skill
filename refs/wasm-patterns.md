# DuckDB-WASM Patterns Reference

## Feature Comparison

| Feature | Native DuckDB | DuckDB-WASM |
|---------|--------------|-------------|
| **httpfs** | `INSTALL httpfs; LOAD httpfs;` | Implicit — remote Parquet via `read_parquet('https://...')` works out of the box |
| **Extension install** | `INSTALL spatial; LOAD spatial;` (SQL) | `await db.loadExtension('spatial')` (JS API), then `LOAD spatial;` in SQL |
| **spatial** | Full GDAL support | Available; **no GDAL** — `ST_Read()`, `ST_ReadSHP()`, `COPY ... WITH (FORMAT GDAL)` unavailable |
| **h3** | `INSTALL h3 FROM community; LOAD h3;` | Available — full H3 hexagonal indexing in the browser |
| **ducklake** | `INSTALL ducklake; LOAD ducklake;` | Available — `ATTACH 'ducklake:sqlite:https://...'` works in the browser |
| **sqlite** | `INSTALL sqlite; LOAD sqlite;` | Available — DuckLake's SQLite catalog backend works in WASM |
| **FTS** | `INSTALL fts; LOAD fts;` | Available — use JACCARD similarity as fallback if not loaded |
| **File system** | Native filesystem access | Virtual FS — use URLs for remote data, `registerFileBuffer()` / `registerFileHandle()` for local files |
| **GDAL formats** | Shapefile, GPKG, FlatGeobuf via `ST_Read()` | Not available — convert to Parquet or GeoJSON beforehand |

## Extension Loading (WASM)

Extensions are loaded via the **JS API**, not SQL `INSTALL` commands:

```javascript
const db = await duckdb.AsyncDuckDB.create(/* ... */);
await db.loadExtension('spatial');
await db.loadExtension('h3');
await db.loadExtension('ducklake');
await db.loadExtension('sqlite');
await db.loadExtension('fts');
```

After JS-side loading, SQL `LOAD` commands still apply:

```sql
LOAD spatial;
LOAD h3;
LOAD ducklake;
```

## Geocoding: H3-Partitioned Geocoding (Pure SQL)

Production patterns from [@tabaqat/geocoding-sdk](https://github.com/tabaqatdev/geocoding-sdk) — DuckDB-WASM + H3 tiling + FTS for geocoding. All queries run directly against remote Parquet tiles via HTTP range requests.

### H3 Tile Partitioning

```sql
-- Convert lat/lng to H3 tile at resolution 5 (~252 km² hexagons)
SELECT h3_h3_to_string(h3_latlng_to_cell(24.7136, 46.6753, 5)) AS h3_tile;

-- Get neighboring tiles (k-ring of radius 1)
SELECT h3_h3_to_string(cell) AS neighbor
FROM (SELECT UNNEST(h3_grid_disk(h3_string_to_h3('857b59c7fffffff'), 1)) AS cell);

-- Load tile index (lightweight metadata: ~50KB)
CREATE VIEW tile_index AS
SELECT * FROM read_parquet('https://data.source.coop/tabaqat/geocoding-cng/v0.1.0/tile_index.parquet');
```

### Reverse Geocoding (Haversine Distance)

```sql
SELECT addr_id, latitude, longitude, street, district_en, postcode,
    6371000 * 2 * ASIN(SQRT(
        POWER(SIN((RADIANS(latitude) - RADIANS(24.7136)) / 2), 2) +
        COS(RADIANS(24.7136)) * COS(RADIANS(latitude)) *
        POWER(SIN((RADIANS(longitude) - RADIANS(46.6753)) / 2), 2)
    )) AS distance_m
FROM read_parquet(['https://...tile1.parquet', 'https://...tile2.parquet'])
WHERE longitude BETWEEN 46.55 AND 46.80
  AND latitude BETWEEN 24.60 AND 24.85
ORDER BY distance_m LIMIT 5;
```

### Point-in-Polygon (Admin Boundaries)

```sql
CREATE VIEW world_countries AS
SELECT * FROM read_parquet('https://.../world_countries_simple.parquet');

SELECT iso_a3, name_en, name_ar
FROM world_countries
WHERE ST_Contains(geometry, ST_Point(46.6753, 24.7136)) LIMIT 1;
```

### Forward Geocoding (FTS + BM25)

```sql
CREATE TABLE fts_temp AS
SELECT addr_id, full_address_ar, full_address_en, latitude, longitude
FROM read_parquet(['https://...tile1.parquet']);

PRAGMA create_fts_index(fts_temp, addr_id, full_address_ar, stemmer='arabic');

SELECT addr_id, full_address_ar, latitude, longitude,
    fts_main_fts_temp.match_bm25(addr_id, 'حي النرجس الرياض', fields := 'full_address_ar') AS similarity
FROM fts_temp WHERE similarity IS NOT NULL
ORDER BY similarity DESC LIMIT 10;

DROP TABLE IF EXISTS fts_temp;
```

### JACCARD Fallback (No FTS Extension)

```sql
SELECT addr_id, full_address_ar, latitude, longitude,
    JACCARD('حي النرجس', full_address_ar) AS similarity
FROM read_parquet(['https://...tile1.parquet'])
WHERE full_address_ar IS NOT NULL
  AND (full_address_ar LIKE '%النرجس%' OR full_address_ar LIKE '%الرياض%')
ORDER BY similarity DESC LIMIT 10;
```

## MVT Generation in Browser (duckdb-wasm-mvt)

[duckdb-wasm-mvt](https://github.com/rot1024/duckdb-wasm-mvt) — generates Mapbox Vector Tiles directly from DuckDB-WASM. Native ST_AsMVT is **6.8x faster** than GeoJSON→geojson-vt pipeline.

### Native MVT Query

```sql
SELECT ST_AsMVT(tile, 'default') AS mvt
FROM (
    SELECT ST_AsMVTGeom(
        geometry, ST_Extent(ST_TileEnvelope(z, x, y)),
        4096, 0, true
    ) AS geometry, name, type
    FROM my_table
    WHERE geometry && ST_TileEnvelope(z, x, y)
) AS tile;
```

### MapLibre Custom Protocol Handler

```javascript
import maplibregl from 'maplibre-gl';

maplibregl.addProtocol('duckdb', async (params) => {
    const { z, x, y } = parseTileCoords(params.url);
    const result = await conn.query(`
        SELECT ST_AsMVT(tile, 'default') AS mvt
        FROM (
            SELECT ST_AsMVTGeom(geometry, ST_Extent(ST_TileEnvelope(${z}, ${x}, ${y})), 4096, 0, true) AS geometry,
                   name, type
            FROM my_table
            WHERE geometry && ST_TileEnvelope(${z}, ${x}, ${y})
        ) AS tile
    `);
    return { data: result.get(0).mvt };
});

map.addSource('duckdb-source', {
    type: 'vector',
    tiles: ['duckdb://{z}/{x}/{y}'],
    maxzoom: 14
});
```
