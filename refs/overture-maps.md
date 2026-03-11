# Overture Maps (GeoParquet)

Overture Maps is a collaborative open map dataset released as GeoParquet. Latest release: **2026-02-18.0**.

## Themes and Types

| Theme | Types |
|-------|-------|
| `addresses` | `address` |
| `base` | `land`, `land_cover`, `land_use`, `water` |
| `buildings` | `building`, `building_part` |
| `divisions` | `division`, `division_area`, `division_boundary` |
| `places` | `place` |
| `transportation` | `segment`, `connector` |

## Storage Paths

```
S3:    s3://overturemaps-us-west-2/release/2026-02-18.0/theme={THEME}/type={TYPE}/*
Azure: az://overturemapswestus2.blob.core.windows.net/release/2026-02-18.0/theme={THEME}/type={TYPE}/*
```

## Setup

```sql
INSTALL spatial; INSTALL httpfs;
LOAD spatial; LOAD httpfs;
SET s3_region = 'us-west-2';
SET geometry_always_xy = true;
```

## Query with Bounding Box Filter

Overture files include `bbox` struct columns (`bbox.xmin`, `bbox.xmax`, `bbox.ymin`, `bbox.ymax`) for efficient spatial filtering without geometry parsing.

```sql
-- Places in a bounding box (e.g., San Francisco area)
SELECT id, names.primary AS name, categories.primary AS category, geometry
FROM read_parquet('s3://overturemaps-us-west-2/release/2026-02-18.0/theme=places/type=place/*',
     hive_partitioning=1)
WHERE bbox.xmin > -122.52 AND bbox.xmax < -122.35
  AND bbox.ymin > 37.70   AND bbox.ymax < 37.82;

-- Buildings in an area, export to GeoJSON
COPY (
    SELECT id, names.primary AS name, geometry
    FROM read_parquet('s3://overturemaps-us-west-2/release/2026-02-18.0/theme=buildings/type=building/*',
         hive_partitioning=1)
    WHERE bbox.xmin > -74.02 AND bbox.xmax < -73.97
      AND bbox.ymin > 40.70  AND bbox.ymax < 40.75
) TO 'manhattan_buildings.geojson' WITH (FORMAT GDAL, DRIVER 'GeoJSON');

-- Road segments
COPY (
    SELECT id, names.primary AS name, class, geometry
    FROM read_parquet('s3://overturemaps-us-west-2/release/2026-02-18.0/theme=transportation/type=segment/*',
         hive_partitioning=1)
    WHERE bbox.xmin > -0.2 AND bbox.xmax < 0.1
      AND bbox.ymin > 51.4 AND bbox.ymax < 51.6
) TO 'london_roads.parquet' (FORMAT PARQUET);
```

## Azure Access

```sql
INSTALL azure; LOAD azure;
SELECT * FROM read_parquet(
    'az://overturemapswestus2.blob.core.windows.net/release/2026-02-18.0/theme=buildings/type=building/*',
    hive_partitioning=1)
WHERE bbox.xmin BETWEEN -122.5 AND -122.3
  AND bbox.ymin BETWEEN 37.7 AND 37.8
LIMIT 100;
```

## GeoParquet Metadata Inspection

```sql
-- Read GeoParquet metadata from remote Parquet files
WITH kv AS (
    SELECT file_name,
           decode(key) AS key_str,
           decode(value)::JSON AS geo_json
    FROM parquet_kv_metadata(
        's3://overturemaps-us-west-2/release/2026-02-18.0/theme=addresses/type=address/*'
    )
)
SELECT file_name,
       geo_json->'$.columns.geometry.bbox' AS bbox,
       geo_json->'$.columns.geometry.geometry_types' AS geom_types,
       geo_json->>'$.columns.geometry.encoding' AS encoding,
       geo_json->>'$.primary_column' AS primary_column
FROM kv WHERE key_str = 'geo';
```
