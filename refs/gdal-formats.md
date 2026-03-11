# GDAL Format I/O Reference

DuckDB's spatial extension includes GDAL for reading/writing vector geospatial formats. GDAL is single-threaded — for large datasets, prefer native readers (Parquet, CSV) when possible.

## Listing Available Drivers

```sql
LOAD spatial;
SELECT short_name, long_name FROM ST_Drivers();
-- Key drivers: GeoJSON, GeoJSONSeq, GPKG, ESRI Shapefile, OpenFileGDB, FlatGeobuf, CSV, KML, GML, MapInfo File
```

## GeoPackage (GPKG)

The most versatile open format — supports multiple layers, CRS, attributes, and large datasets.

### Read

```sql
-- Read default layer
SELECT * FROM ST_Read('data.gpkg');

-- Read specific layer by name
SELECT * FROM ST_Read('data.gpkg', layer='buildings');

-- Inspect all layers and their schemas
SELECT * FROM ST_Read_Meta('data.gpkg');

-- Remote GeoPackage via httpfs
LOAD httpfs;
SELECT * FROM ST_Read('https://example.com/data.gpkg', layer='roads');
```

### Write

```sql
-- Basic write
COPY tbl TO 'output.gpkg' WITH (FORMAT GDAL, DRIVER 'GPKG');

-- With layer name
COPY tbl TO 'output.gpkg' WITH (FORMAT GDAL, DRIVER 'GPKG', LAYER_NAME 'my_layer');

-- With CRS (SRS_ID sets the EPSG code, no reprojection)
COPY tbl TO 'output.gpkg' WITH (FORMAT GDAL, DRIVER 'GPKG', LAYER_NAME 'roads', SRS_ID 4326);

-- With layer creation options
COPY tbl TO 'output.gpkg' WITH (FORMAT GDAL, DRIVER 'GPKG', LAYER_NAME 'features',
    LAYER_CREATION_OPTIONS 'FID=feature_id');
```

## ESRI File Geodatabase (OpenFileGDB)

ESRI's native format. DuckDB uses the open-source OpenFileGDB driver (no ESRI SDK needed). Supports read and write.

### Read

```sql
-- Read specific layer
SELECT * FROM ST_Read('data.gdb', layer='parcels');

-- Read default (first) layer
SELECT * FROM ST_Read('data.gdb');

-- Inspect all layers and schemas
SELECT * FROM ST_Read_Meta('data.gdb');
```

**Quirks on read:**
- Geometry column is always named `SHAPE` (ESRI convention)
- The geometry type in the column header includes a full CRS PROJJSON string
- Polygons may be returned as MULTIPOLYGON

### Write

```sql
-- GEOMETRY_TYPE is required for OpenFileGDB writes
-- Valid values: POINT, LINESTRING, POLYGON, MULTIPOINT, MULTILINESTRING, MULTIPOLYGON
COPY tbl TO 'output.gdb' WITH (
    FORMAT GDAL, DRIVER 'OpenFileGDB',
    LAYER_NAME 'parks',
    GEOMETRY_TYPE 'POLYGON'
);

-- With CRS
COPY tbl TO 'output.gdb' WITH (
    FORMAT GDAL, DRIVER 'OpenFileGDB',
    LAYER_NAME 'roads',
    GEOMETRY_TYPE 'LINESTRING',
    SRS_ID 4326
);

-- Multiple layers in the same .gdb
COPY polygons TO 'output.gdb' WITH (FORMAT GDAL, DRIVER 'OpenFileGDB', LAYER_NAME 'buildings', GEOMETRY_TYPE 'POLYGON');
COPY lines TO 'output.gdb' WITH (FORMAT GDAL, DRIVER 'OpenFileGDB', LAYER_NAME 'roads', GEOMETRY_TYPE 'LINESTRING');
COPY points TO 'output.gdb' WITH (FORMAT GDAL, DRIVER 'OpenFileGDB', LAYER_NAME 'stations', GEOMETRY_TYPE 'POINT');
```

**Quirks on write:**
- `GEOMETRY_TYPE` is mandatory — the driver errors without it
- Polygons are promoted to MULTIPOLYGON on round-trip
- The .gdb output is a directory (not a single file)

## GeoJSON

```sql
-- Read
SELECT * FROM ST_Read('data.geojson');

-- Read from URL
SELECT * FROM ST_Read('https://example.com/data.geojson');

-- Write
COPY tbl TO 'output.geojson' WITH (FORMAT GDAL, DRIVER 'GeoJSON');

-- Write with bbox
COPY tbl TO 'output.geojson' WITH (FORMAT GDAL, DRIVER 'GeoJSON', LAYER_CREATION_OPTIONS 'WRITE_BBOX=YES');

-- GeoJSONSeq (newline-delimited, streaming-friendly)
COPY tbl TO 'output.geojsonseq' WITH (FORMAT GDAL, DRIVER 'GeoJSONSeq');
```

## Shapefile

Legacy format — 2GB limit, 10-char field names, single geometry type per file.

```sql
-- Read via GDAL
SELECT * FROM ST_Read('data.shp');

-- Read without GDAL (faster, but limited feature support)
SELECT * FROM ST_ReadSHP('data.shp');

-- Read remote Shapefile (native reader)
SELECT * FROM ST_ReadSHP('https://example.com/data.shp');

-- Write
COPY tbl TO 'output.shp' WITH (FORMAT GDAL, DRIVER 'ESRI Shapefile');
```

## FlatGeobuf

Cloud-native binary format optimized for streaming and random access.

```sql
-- Read
SELECT * FROM ST_Read('data.fgb');

-- Write
COPY tbl TO 'output.fgb' WITH (FORMAT GDAL, DRIVER 'FlatGeobuf');
```

## KML / GML

```sql
-- Read KML
SELECT * FROM ST_Read('data.kml');

-- Read GML
SELECT * FROM ST_Read('data.gml');

-- Write KML
COPY tbl TO 'output.kml' WITH (FORMAT GDAL, DRIVER 'KML');
```

## CSV with Geometry

```sql
-- Read CSV with lat/lon, create geometry
SELECT *, ST_Point(longitude, latitude) AS geom FROM read_csv('points.csv');

-- Write geometry as WKT in CSV
COPY (SELECT *, ST_AsText(geom) AS wkt FROM tbl) TO 'output.csv' (HEADER);
```

## Common COPY Options for GDAL

| Option | Purpose | Example |
|--------|---------|---------|
| `DRIVER` | GDAL driver name | `'GPKG'`, `'OpenFileGDB'`, `'GeoJSON'` |
| `LAYER_NAME` | Output layer name | `'buildings'` |
| `SRS_ID` | CRS EPSG code (no reprojection) | `4326` |
| `SRS` | CRS as string (PROJ/WKT) | `'EPSG:4326'` |
| `GEOMETRY_TYPE` | Required for some drivers | `'POLYGON'`, `'POINT'` |
| `LAYER_CREATION_OPTIONS` | Driver-specific options | `'WRITE_BBOX=YES'` |
| `CREATION_OPTIONS` | Dataset-level options | Driver-dependent |

## Format Comparison

| Format | Multi-layer | CRS | Max Size | Cloud-native | Read Speed | Write Speed |
|--------|------------|-----|----------|-------------|------------|-------------|
| **GeoPackage** | Yes | Yes | Unlimited | No | Good | Good |
| **FileGDB** | Yes | Yes | Unlimited | No | Good | Good |
| **Parquet** | No | Yes (v1.5) | Unlimited | Yes | **Fastest** | **Fastest** |
| **GeoJSON** | No | WGS84 only | ~2GB practical | Yes (streaming) | Slow | Slow |
| **Shapefile** | No | Yes | 2GB hard limit | No | Fast (native) | Fast |
| **FlatGeobuf** | No | Yes | Unlimited | Yes (HTTP range) | Fast | Fast |
| **KML/GML** | Yes | WGS84/any | ~1GB practical | No | Slow | Slow |

## WFS / API GeoJSON Direct Query

```sql
-- Query WFS endpoints directly (returns GeoJSON)
SELECT unnest(feature.properties) AS properties,
       ST_GeomFromGeoJSON(feature.geometry) AS geometry
FROM (
    SELECT unnest(features) AS feature
    FROM read_json_auto(
        'https://data.transportforcairo.com/geoserver/geonode/ows?'
        'service=WFS&version=1.1.0&request=GetFeature'
        '&typeName=geonode:cairo_od_stats'
        '&maxFeatures=1000&outputFormat=application/json'
    )
);

-- Query OpenDataSoft API
SELECT ST_GeomFromGeoJSON(geo_shape) AS geom, *
FROM read_json_auto(
    'https://www.data.gov.bh/api/explore/v2.1/catalog/datasets/embassies/exports/geojson'
);
```

## Overture Maps

See `refs/overture-maps.md` for Overture Maps data access (themes, S3/Azure paths, bbox filtering).
