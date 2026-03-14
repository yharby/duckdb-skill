# Raster, RaQuet & Pyramid GeoParquet Reference

## RaQuet: Raster Data in Parquet (v0.5.0)

> [RaQuet](https://github.com/CartoDB/raquet) stores raster tiles as standard Parquet rows with QUADBIN spatial indexing. Think of it as "GeoParquet for raster" — any tool that reads Parquet can read RaQuet. The spec is at v0.5.0; the CLI (`raquet-io`) is at v0.9.0.

### Converting Raster to RaQuet

**DuckDB cannot convert GeoTIFF/COG/NetCDF → RaQuet natively.** Use the `raquet-io` Python CLI:

```bash
# Run on-the-fly with uvx (no install needed — uses ephemeral cached env)
uvx raquet-io convert raster input.tif output.parquet

# Basic conversion (GeoTIFF → RaQuet)
uvx raquet-io convert raster input.tif output.parquet

# With tile statistics (enables SQL analytics without pixel decompression)
uvx raquet-io convert raster dem.tif dem.parquet --tile-stats

# Analytics-only (skip overview pyramid, fastest)
uvx raquet-io convert raster slope.tif slope.parquet --tile-stats --overviews none

# NetCDF with time dimensions (auto-adds time_cf + time_ts columns)
uvx raquet-io convert raster temperature.nc temperature.parquet

# Large files: streaming mode (lower memory) + parallel workers
uvx raquet-io convert raster huge.tif output.parquet --streaming --workers 4 --overviews none

# Custom block size and row group size for remote access
uvx raquet-io convert raster input.tif output.parquet --block-size 256 --row-group-size 100

# ArcGIS ImageServer endpoint
uvx raquet-io convert imageserver https://example.com/arcgis/rest/services/DEM/ImageServer output.parquet --bbox -4,40,-3,41

# Export back to GeoTIFF
uvx raquet-io export geotiff input.parquet output.tif

# Inspect and validate
uvx raquet-io inspect output.parquet -v
uvx raquet-io validate output.parquet --json

# Spatial partitioning for cloud storage (recommended for >1 GB files)
uvx raquet-io partition large.parquet ./partitioned/ --target-size-mb 128

# Split by zoom level (selective remote retrieval)
uvx raquet-io split-zoom large.parquet ./by_zoom/
```

**CLI convert options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--tile-stats` | off | Add per-tile statistics columns (count, min, max, sum, mean, stddev) |
| `--overviews` | `auto` | `auto` (full pyramid) or `none` (native only, fastest) |
| `--min-zoom` | auto | Minimum zoom for overviews |
| `--block-size` | 256 | Tile size in pixels (256, 512, 1024) |
| `--row-group-size` | 200 | Rows per Parquet row group (smaller = better remote pruning) |
| `--resampling` | `near` | `near`, `average`, `bilinear`, `cubic`, `lanczos`, `mode`, etc. |
| `--zoom-strategy` | `auto` | `auto`, `lower`, `upper` |
| `--streaming` | off | Two-pass memory-safe mode for large files |
| `--workers` | 1 | Parallel processes (requires `--overviews none`) |

**Supported input formats:** Any GDAL-readable raster — GeoTIFF, COG, NetCDF, AAIGrid, HDF5, GRIB, JPEG2000, etc. Source is reprojected to Web Mercator (EPSG:3857) automatically.

---

### RaQuet Schema

Every RaQuet file has this structure:

```sql
-- Required columns
block      UBIGINT    -- QUADBIN cell ID (block = 0 is the metadata row)
metadata   VARCHAR    -- JSON metadata (populated only when block = 0)
band_1     BLOB       -- Compressed pixel data (gzip by default)
band_2     BLOB       -- Additional bands as separate columns (sequential layout)

-- Optional: time series columns (NetCDF with time dimensions)
time_cf    DOUBLE     -- CF convention numeric time value (authoritative)
time_ts    TIMESTAMP  -- Derived Gregorian timestamp (nullable for non-Gregorian calendars)

-- Optional: per-tile statistics (when converted with --tile-stats)
band_1_count    BIGINT   -- Valid (non-nodata) pixel count
band_1_min      DOUBLE   -- Minimum value
band_1_max      DOUBLE   -- Maximum value
band_1_sum      DOUBLE   -- Sum of valid pixels
band_1_mean     DOUBLE   -- Mean of valid pixels
band_1_stddev   DOUBLE   -- Population standard deviation
```

**Band layouts:**
- **Sequential** (default): One column per band, row-major pixels, little-endian. Best for analytical queries on individual bands.
- **Interleaved**: Single `pixels` column with Band Interleaved by Pixel (BIP) format `[R₀G₀B₀, R₁G₁B₁, ...]`. Required for lossy compression (JPEG/WebP). Best for RGB imagery display.

**Compression:** `gzip` (default, lossless), `jpeg` (interleaved uint8 only, quality 1-100), `webp` (interleaved uint8 only, quality 1-100), `none`.

**Row ordering:** Sorted by QUADBIN cell ID for optimal Parquet row group pruning.

---

### Metadata JSON

The metadata row (`block = 0`) contains a JSON object with full dataset information:

```json
{
  "file_format": "raquet",
  "version": "0.5.0",
  "width": 9216, "height": 7936,
  "crs": "EPSG:3857",
  "bounds": [-19.69, 26.43, 5.63, 44.09],
  "bounds_crs": "EPSG:4326",
  "compression": "gzip",
  "tiling": {
    "scheme": "quadbin",
    "block_width": 256, "block_height": 256,
    "min_zoom": 3, "max_zoom": 9,
    "pixel_zoom": 17,
    "num_blocks": 1116
  },
  "bands": [{
    "name": "band_1", "type": "float32", "nodata": -9999.0,
    "unit": "meters", "colorinterp": "gray",
    "STATISTICS_MINIMUM": 0.0, "STATISTICS_MAXIMUM": 8848.0,
    "STATISTICS_MEAN": 840.5, "STATISTICS_STDDEV": 950.2
  }],
  "tile_statistics": true,
  "tile_statistics_columns": ["count", "min", "max", "sum", "mean", "stddev"],
  "time": {
    "cf:units": "minutes since 1980-01-01 00:00:00",
    "cf:calendar": "standard",
    "count": 432
  }
}
```

**Band data types:** uint8, int8, uint16, int16, uint32, int32, uint64, int64, float16, float32, float64.

---

### Querying RaQuet in DuckDB

#### With the DuckDB Raquet Extension (recommended)

```sql
INSTALL raquet FROM community; LOAD raquet;

-- Point query — elevation at Madrid (reads only the needed tile, ~2KB from cloud)
SELECT ST_RasterValue(block, band_1, ST_Point(-3.7038, 40.4168), metadata) AS elevation
FROM read_raquet_at(
    'https://storage.googleapis.com/raquet_demo_data/world_elevation.parquet',
    -3.7038, 40.4168
);

-- Spatial filter — only reads tiles that intersect the polygon
SELECT * FROM read_raquet(
    'https://storage.googleapis.com/raquet_demo_data/world_solar_pvout.parquet',
    'POLYGON((-4 40, -3 40, -3 41, -4 41, -4 40))'::GEOMETRY
);

-- Region statistics — aggregate within a polygon
SELECT (ST_RegionStats(
    band_1, block,
    'POLYGON((-4 40, -3 40, -3 41, -4 41, -4 40))'::GEOMETRY,
    metadata
)).*
FROM read_raquet(
    'https://storage.googleapis.com/raquet_demo_data/world_solar_pvout.parquet',
    'POLYGON((-4 40, -3 40, -3 41, -4 41, -4 40))'::GEOMETRY
);

-- Time series analysis — yearly average SST
SELECT YEAR(time_ts) AS year,
       AVG((ST_RasterSummaryStats(band_1, metadata)).mean) AS avg_sst
FROM read_raquet('https://storage.googleapis.com/raquet_demo_data/cfsr_sst.parquet')
GROUP BY YEAR(time_ts)
ORDER BY year;

-- Band math — NDVI (Normalized Difference Vegetation Index)
SELECT block, (ST_NormalizedDifferenceStats(band_4, band_3, metadata)).*
FROM read_raquet('satellite.parquet')
LIMIT 5;

-- Per-tile summary stats
SELECT block, (ST_RasterSummaryStats(band_1, metadata)).*
FROM read_raquet('elevation.parquet')
LIMIT 5;

-- Read metadata only
SELECT metadata FROM read_raquet_metadata('elevation.parquet');
```

**Extension functions:**

| Function | Description |
|----------|-------------|
| `read_raquet(file)` | Read all data rows (metadata propagated, block=0 excluded) |
| `read_raquet(file, geometry)` | Spatial filter with auto resolution selection |
| `read_raquet_at(file, lon, lat)` | Point query (reads only the tile needed) |
| `read_raquet_metadata(file)` | Read metadata row only |
| `ST_RasterValue(block, band, point, metadata)` | Get pixel value at a coordinate |
| `ST_RasterSummaryStats(band, metadata)` | Per-tile statistics (count, sum, mean, min, max, stddev) |
| `ST_RegionStats(band, block, geometry, metadata)` | Aggregate stats within a polygon |
| `ST_Intersects(block, geometry)` | Spatial filter (EPSG:4326) |
| `ST_Clip(band, block, geometry, metadata)` | Extract pixels within a geometry |
| `ST_NormalizedDifference(band1, band2, metadata)` | Band math (e.g., NDVI) |
| `ST_NormalizedDifferenceStats(band1, band2, metadata)` | Band math with stats |

> **Note:** The DuckDB raquet extension requires DuckDB 1.5+ and may not be available on all platforms yet. Check `INSTALL raquet FROM community;` — if it fails, use the plain Parquet approach below.

#### Without the Extension (plain Parquet — works everywhere)

RaQuet files are standard Parquet, so DuckDB can query them directly. You just need to filter out the metadata row manually:

```sql
INSTALL httpfs; LOAD httpfs;

-- Read data rows (exclude metadata row where block = 0)
SELECT * FROM 'https://storage.googleapis.com/raquet_demo_data/world_elevation.parquet'
WHERE block != 0
LIMIT 10;

-- Read metadata
SELECT metadata::JSON
FROM 'https://storage.googleapis.com/raquet_demo_data/world_elevation.parquet'
WHERE block = 0;

-- Parse metadata fields
SELECT metadata::JSON->>'version' AS version,
       metadata::JSON->>'crs' AS crs,
       metadata::JSON->'tiling'->>'min_zoom' AS min_zoom,
       metadata::JSON->'tiling'->>'max_zoom' AS max_zoom,
       metadata::JSON->'tiling'->>'num_blocks' AS num_blocks
FROM 'world_elevation.parquet'
WHERE block = 0;

-- Time series query (SST data with time columns)
SELECT YEAR(time_ts) AS year, count(*) AS tile_count
FROM 'https://storage.googleapis.com/raquet_demo_data/cfsr_sst.parquet'
WHERE block != 0
GROUP BY ALL ORDER BY year;
```

#### Tile Statistics Queries (no extension or UDFs needed)

When files are converted with `--tile-stats`, analytics become simple column reads — no pixel decompression:

```sql
-- Aggregate statistics across all tiles
SELECT AVG(band_1_mean) AS avg_elevation,
       MAX(band_1_max) AS max_elevation,
       MIN(band_1_min) AS min_elevation,
       SUM(band_1_count) AS total_pixels
FROM 'elevation.parquet'
WHERE block != 0;

-- Filter tiles by statistics (find flat areas for solar farms)
SELECT block, band_1_mean, band_1_max
FROM 'slope.parquet'
WHERE block != 0 AND band_1_max < 5.0;

-- Works identically on any Parquet engine: DuckDB, BigQuery, Snowflake, Spark
```

### Sample Data for Testing

These public GCS URLs can be queried directly from DuckDB:

| Dataset | URL | Features |
|---------|-----|----------|
| World Elevation | `gs://raquet_demo_data/world_elevation.parquet` | Basic single-band, overviews |
| World Solar PVOUT | `gs://raquet_demo_data/world_solar_pvout.parquet` | Solar irradiation |
| CFSR SST | `gs://raquet_demo_data/cfsr_sst.parquet` | Time series (time_cf + time_ts) |
| Spain Solar GHI | `gs://raquet_demo_data/spain_solar_ghi.parquet` | Regional subset |

Use HTTPS prefix for DuckDB: `https://storage.googleapis.com/raquet_demo_data/...`

---

## QUADBIN Spatial Index

QUADBIN encodes Web Mercator tile coordinates (x, y, z) into a single 64-bit integer. It's the spatial indexing backbone of RaQuet.

### Why QUADBIN Matters

- **Single-column index**: Location + zoom level in one INT64 — no compound keys
- **Morton order (Z-order curve)**: Spatially adjacent tiles have numerically similar IDs
- **Parquet row group pruning**: Sorted QUADBIN values enable min/max statistics to skip irrelevant row groups — a point query on 13 GB reads only the tiles it needs, skipping 99%+ of data
- **Resolution range**: Zoom levels 0–26 (sub-meter precision at equator)

### Bit Layout

```
Bits 60-63:  Header (0b0100 = 4, cell mode indicator)
Bits 52-59:  Resolution (zoom level, 5 bits)
Bits 2-51:   Morton code (interleaved x,y coordinates, 2×z bits)
Bits 0-1:    Footer (unused bits set to 1 for consistent sorting)
```

### QUADBIN vs Other Spatial Indexes

| Property | QUADBIN | H3 | Quadkey |
|----------|---------|-----|---------|
| Grid shape | Squares | Hexagons | Squares |
| Encoding | 64-bit integer | 64-bit integer | Variable-length string |
| Projection | Web Mercator | Icosahedron | Web Mercator |
| Area distortion | High at poles | Minimal | High at poles |
| Best for | Raster tiling, SQL range scans, Parquet pruning | Analytics, equal-area | Tile serving, prefix queries |

### Using QUADBIN in Python

```bash
# Run a Python script that uses quadbin on-the-fly (no install needed):
uvx --with quadbin python my_script.py

# With multiple dependencies:
uvx --with quadbin --with pyarrow --with duckdb python my_script.py

```

```python
import quadbin

# Point → cell at zoom 10
cell = quadbin.point_to_cell(-3.7038, 40.4168, 10)
# → 5234261499580514303

# Cell → geographic point (center)
quadbin.cell_to_point(cell)        # → [-3.69, 40.31]

# Cell → tile coordinates
quadbin.cell_to_tile(cell)         # → (505, 392, 10)

# Tile → cell
quadbin.tile_to_cell((505, 392, 10))

# Cell properties
quadbin.get_resolution(cell)       # → 10
quadbin.cell_area(cell)            # → 888546364.79 m²
quadbin.cell_to_bounding_box(cell) # → [xmin, ymin, xmax, ymax]
quadbin.cell_to_boundary(cell)     # → polygon coordinates
quadbin.cell_to_boundary(cell, geojson=True)  # → GeoJSON geometry

# Hierarchy
quadbin.cell_to_parent(cell, 9)    # → parent at zoom 9
quadbin.cell_to_children(cell, 11) # → 4 children at zoom 11

# Neighbors
quadbin.k_ring(cell, 1)            # → 9 cells (self + 8 neighbors)
quadbin.k_ring_distances(cell, 1)  # → cells with distance
quadbin.cell_sibling(cell, 'right')  # → neighbor in direction

# Validation
quadbin.is_valid_cell(cell)        # → True

# String representation
s = quadbin.index_to_string(cell)  # → '48a3d519ffffffff'
quadbin.string_to_index(s)         # → back to int

# Cover a geometry with cells
quadbin.geometry_to_cells(geojson_geometry, resolution)
```

---

## RaQuet Version History

| Version | Key Additions |
|---------|--------------|
| v0.2.0 | Core spec: QUADBIN tiling, sequential bands, gzip, overview pyramids, band metadata |
| v0.3.0 | Time series: NetCDF time dimensions, CF calendar handling (standard, 360_day, 365_day, etc.), `time_cf` + `time_ts` columns |
| v0.4.0 | Interleaved band layout (BIP), lossy compression (JPEG/WebP), 10-15× smaller RGB imagery |
| v0.5.0 | Per-tile statistics columns (`{band}_count/min/max/sum/mean/stddev`), streaming CLI mode, parallel workers, spatial partitioning, `--overviews none` |

---

## Performance

### Compression Results

| Dataset | Source | Source Size | RaQuet Size | Reduction |
|---------|--------|-------------|-------------|-----------|
| World Elevation | AAIGrid | 3.2 GB | 805 MB | 75% |
| World Solar PVOUT | AAIGrid | 2.8 GB | 255 MB | 91% |
| CFSR SST (time series) | NetCDF | 854 MB | 75 MB | 91% |

### DuckDB vs Cloud Engines (15 GB slope raster, 563K tiles)

| Query | DuckDB (local) | Snowflake (Small WH) |
|-------|----------------|---------------------|
| Point query (~0.5 km², 16 tiles) | 1.9s | 10.8s |
| Region (~25 km², 1,776 tiles) | 1.7s | 13.3s |
| Large region (~3,000 km², 60K tiles) | 4.3s | 31.2s |
| Full area scan (475K tiles) | 17s | — |

DuckDB's C++ raquet extension is 2-3× faster than BigQuery's JavaScript UDFs for interactive queries. Snowflake excels at tile-statistics-only queries (sub-second with no UDF overhead).

### Row Group Size Trade-offs

| Size | Remote Access | Local Analytics | File Size |
|------|--------------|-----------------|-----------|
| 50-100 | Fastest (fine pruning) | Slower | Larger |
| 200 (default) | Fast | Fast | Medium |
| 1000+ | Slower | Fastest | Smallest |

---

## Spatial Raster Extension (RASTER Type)

> **Status**: Prototype from [ahuarte47/duckdb-spatial-raster](https://github.com/ahuarte47/duckdb-spatial-raster), build from source. Not part of the official spatial extension.

```sql
LOAD spatial_raster;

-- Read + inspect a GeoTIFF
SELECT RT_Width(raster) AS cols, RT_Height(raster) AS rows,
       RT_NumBands(raster) AS bands, RT_Srid(raster) AS srid,
       RT_PixelWidth(raster) AS px_w, RT_PixelHeight(raster) AS px_h
FROM RT_Read('./elevation.tif');

-- Read raster metadata without loading pixels
SELECT * FROM RT_Read_Meta('./elevation.tif');

-- Pixel value access
SELECT RT_Value(raster, 1, col, row) FROM RT_Read('./dem.tif');

-- Raster → geometry extent
SELECT RT_GetGeometry(raster) AS extent_polygon FROM RT_Read('./image.tif');
SELECT RT_GetBBox(raster) AS bbox FROM RT_Read('./image.tif');

-- Coordinate transforms: pixel ↔ geographic
SELECT RT_RasterToWorldCoord(raster, 100, 200) FROM RT_Read('./image.tif');
SELECT RT_WorldToRasterCoord(raster, 541020.0, 4796640.0) FROM RT_Read('./image.tif');

-- Mosaic multiple tiles
WITH tiles AS (
    SELECT 1 AS mosaic_id, RT_RasterFromFile(file) AS raster
    FROM glob('./tiles/*.tiff')
)
SELECT RT_GetGeometry(RT_RasterMosaic_Agg(raster, options => ['-r', 'bilinear'])) AS extent
FROM tiles GROUP BY mosaic_id;

-- Clip raster with vector geometry
SELECT RT_RasterClip(raster,
    (SELECT geom FROM ST_Read('./boundary.gpkg') LIMIT 1),
    options => ['-crop_to_cutline', '-r', 'bilinear']
) AS clipped FROM RT_Read('./image.tif');

-- Reproject / warp
SELECT RT_RasterWarp(raster, options => ['-r', 'bilinear', '-tr', '40.0', '40.0'])
FROM RT_Read('./input.tif');

-- Split raster into tiles
SELECT UNNEST(RT_RasterSplit(raster, 2048, 2048)) AS tile FROM RT_Read('./large.tif');

-- Export as Cloud-Optimized GeoTIFF (COG)
COPY (SELECT * FROM './input.tif')
TO './output.tif' WITH (FORMAT RASTER, DRIVER 'COG', CREATION_OPTIONS ('COMPRESS=LZW'));

-- Blob roundtrip (for storing raster in Parquet)
SELECT RT_RasterAsBlob(raster, 'GTiff') AS blob FROM RT_Read('./input.tif');
SELECT RT_GetGeometry(RT_RasterFromBlob(blob_col, ['COG', 'GTiff'])) FROM my_table;

-- List supported GDAL raster drivers
SELECT * FROM RT_Drivers();
```

**RT_* function categories:**

| Category | Functions |
|----------|-----------|
| Metadata | `RT_Width`, `RT_Height`, `RT_NumBands`, `RT_Srid` |
| Georeference | `RT_UpperLeftX/Y`, `RT_ScaleX/Y`, `RT_SkewX/Y`, `RT_PixelWidth/Height` |
| Band info | `RT_GetBandPixelType/Name`, `RT_GetBandColorInterpretation/Name`, `RT_GetBandNoDataValue`, `RT_HasNoBand` |
| Geometry | `RT_GetBBox`, `RT_GetGeometry` → returns `GEOMETRY` |
| Pixel access | `RT_Value(raster, band, col, row)` |
| Coord transform | `RT_RasterToWorldCoord/X/Y`, `RT_WorldToRasterCoord/X/Y` |
| Processing | `RT_RasterClip(raster, geometry)`, `RT_RasterWarp`, `RT_RasterSplit` |
| I/O | `RT_RasterFromFile`, `RT_RasterFromBlob`, `RT_RasterAsFile`, `RT_RasterAsBlob` |
| Aggregates | `RT_RasterMosaic_Agg`, `RT_RasterUnion_Agg` |
| Tables | `RT_Read(path)`, `RT_Read_Meta(path)`, `RT_Drivers()` |

---

## Pyramid GeoParquet (Spatial Tiling)

### Yosegi Pipeline (Pure DuckDB SQL)

The [Yosegi](https://github.com/Kanahiro/yosegi) algorithm generates Pyramid GeoParquet using density-based zoom assignment:

```sql
LOAD spatial;

-- STEP 1: Read input
CREATE TABLE input_data AS SELECT * FROM ST_Read('input.geojson');

-- STEP 2: Base table with UID and representative point
CREATE TABLE base AS
SELECT *, row_number() OVER () AS _uid,
    CASE WHEN upper(ST_GeometryType(geom)::varchar) LIKE '%POINT' THEN geom
         ELSE ST_PointOnSurface(geom)
    END AS _rep_geom
FROM input_data;

-- STEP 3: Working tables for zoom assignment
CREATE TABLE unassigned AS SELECT _uid, _rep_geom FROM base;
CREATE TABLE assigned (_uid BIGINT PRIMARY KEY, zoomlevel INTEGER);

-- STEP 4: Loop from minzoom to maxzoom-1 (density-based decimation)
-- precision = 2.5 / (2.0 ^ z)
-- z=0: prec=2.5, z=5: prec=0.078, z=10: prec=0.00244

-- Example for z=0 (precision 2.5):
INSERT INTO assigned
SELECT u._uid, 0 AS zoomlevel FROM unassigned u
QUALIFY row_number() OVER (
    PARTITION BY ST_ReducePrecision(u._rep_geom, 2.5) ORDER BY u._uid
) = 1;
DELETE FROM unassigned USING assigned a WHERE unassigned._uid = a._uid AND a.zoomlevel = 0;
-- Repeat for z=1 (1.25), z=2 (0.625), ..., z=maxzoom-1

-- STEP 5: Assign remaining to maxzoom
INSERT INTO assigned SELECT _uid, 16 FROM unassigned;

-- STEP 6: Final output
COPY (
    SELECT b.* EXCLUDE (_rep_geom, _uid), a.zoomlevel,
           ST_Quadkey(b._rep_geom, 16) AS quadkey
    FROM base b JOIN assigned a USING (_uid)
    ORDER BY zoomlevel, quadkey
) TO 'output.pyramid.parquet' (FORMAT PARQUET, ROW_GROUP_SIZE 10240);
```

### Querying Pyramid GeoParquet

```sql
-- Features visible at zoom 10 in a specific tile
SELECT * FROM 'data.pyramid.parquet'
WHERE zoomlevel <= 10 AND quadkey LIKE '133002110%';

-- Admin-partitioned distribution (100+ GB datasets)
COPY (SELECT * FROM pyramid)
TO 's3://bucket/data/' (FORMAT PARQUET, PARTITION_BY (country_iso));
```

**Why sorted (zoomlevel, quadkey) is fast**: Row group min/max statistics enable predicate pushdown. `LIKE 'prefix%'` on a sorted string = range scan, skipping non-matching row groups.
