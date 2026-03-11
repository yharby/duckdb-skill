# Raster, RaQuet & Pyramid GeoParquet Reference

## Spatial Raster Extension (RASTER Type)

> **Status**: Prototype from [ahuarte47/duckdb-spatial-raster](https://github.com/ahuarte47/duckdb-spatial-raster), build from source.

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

## RaQuet: Raster Data in Parquet

> [RaQuet](https://github.com/CartoDB/raquet) (v0.4.0) stores raster tiles as Parquet rows with QUADBIN spatial indexing.

```sql
INSTALL raquet FROM community; LOAD raquet;

-- Point query: pixel value at a coordinate
SELECT ST_RasterValue('elevation.parquet', ST_Point(-122.4194, 37.7749));

-- Spatial filter with row group pruning
SELECT * FROM read_raquet('satellite.parquet')
WHERE ST_RasterIntersects(block, ST_MakeEnvelope(-122.5, 37.5, -122.0, 38.0));

-- Zonal statistics
SELECT ST_RasterSummaryStat(
    'elevation.parquet',
    (SELECT geometry FROM regions WHERE name = 'California'),
    'mean'
);
```

**RaQuet schema:**

```sql
CREATE TABLE raster_tiles (
    block      INT64,      -- QUADBIN cell ID (0x00 = metadata row)
    band_1     BLOB,       -- Gzip-compressed pixel data
    band_2     BLOB,
    metadata   VARCHAR     -- JSON metadata (only in block=0 row)
);
-- Sorted by block (QUADBIN) for row group pruning
```

**QUADBIN**: 64-bit integer encoding of Web Mercator tile coordinates (Morton/Z-order). Integer range scans are faster than string `LIKE 'prefix%'` for Parquet row group statistics.

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
