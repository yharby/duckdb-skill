# Spatial Functions — Table Functions

Table-returning functions for reading geospatial files and generating geometry data.

---

### ST_Read

#### Signature

```sql
ST_Read (col0 VARCHAR, keep_wkb BOOLEAN, max_batch_size INTEGER, layer VARCHAR, sibling_files VARCHAR[], allowed_drivers VARCHAR[], open_options VARCHAR[])
```

#### Description

Read and import a variety of geospatial file formats using the GDAL library.

The `ST_Read` table function is based on the [GDAL](https://gdal.org/index.html) translator library and enables reading spatial data from a variety of geospatial vector file formats as if they were DuckDB tables.

> See [ST_Drivers](#st_drivers) for a list of supported file formats and drivers.

Except for the `path` parameter, all parameters are optional.

| Parameter | Type | Description |
| --------- | -----| ----------- |
| `path` | VARCHAR | The path to the file to read. Mandatory |
| `open_options` | VARCHAR[] | A list of key-value pairs that are passed to the GDAL driver to control the opening of the file. E.g., the GeoJSON driver supports a FLATTEN_NESTED_ATTRIBUTES=YES option to flatten nested attributes. |
| `layer` | VARCHAR | The name of the layer to read from the file. If NULL, the first layer is returned. Can also be a layer index (starting at 0). |
| `allowed_drivers` | VARCHAR[] | A list of GDAL driver names that are allowed to be used to open the file. If empty, all drivers are allowed. |
| `sibling_files` | VARCHAR[] | A list of sibling files that are required to open the file. E.g., the ESRI Shapefile driver requires a .shx file to be present. Although most of the time these can be discovered automatically. |
| `keep_wkb` | BOOLEAN | If set, the table function will return geometries in a wkb_geometry column with the type WKB_BLOB (which can be cast to BLOB) instead of GEOMETRY. This is useful if you want to use DuckDB with more exotic geometry subtypes that DuckDB spatial doesnt support representing in the GEOMETRY type yet. |

> **v1.5 changes:**
> - `spatial_filter` and `spatial_filter_box` parameters have been **removed**. Use `WHERE geom && ST_MakeBox2D(...)` instead — DuckDB automatically pushes bounding-box filters down to GDAL. The `&&` and `ST_Intersects_Extent` predicates are fully pushed down (filter removed); other spatial predicates get bbox pushdown as a pre-filter but are still evaluated after.
> - `sequential_layer_scan` parameter has been **removed** — auto-applied for OSM format.
> - `ST_Read` now emits the `OGC_FID` column if available in the source data.
> - `COPY TO (FORMAT GDAL)` uses Arrow internally, making exports significantly faster.

Note that GDAL is single-threaded, so this table function will not be able to make full use of parallelism. `ST_ReadOSM` (below) CAN use multiple threads because `.osm.pbf` is block-structured.

By using `ST_Read`, the spatial extension also provides "replacement scans" for common geospatial file formats, allowing you to query files of these formats as if they were tables directly.

```sql
SELECT * FROM './path/to/some/shapefile/dataset.shp';
```

In practice this is just syntax-sugar for calling ST_Read, so there is no difference in performance. If you want to pass additional options, you should use the ST_Read table function directly.

The following formats are currently recognized by their file extension:

| Format | Extension |
| ------ | --------- |
| ESRI ShapeFile | .shp |
| GeoPackage | .gpkg |
| FlatGeoBuf | .fgb |

#### Example

```sql
-- Read a Shapefile
SELECT * FROM ST_Read('some/file/path/filename.shp');

-- Read a GeoJSON file
CREATE TABLE my_geojson_table AS SELECT * FROM ST_Read('some/file/path/filename.json');

-- Spatial filtering (v1.5+ — use WHERE clause, not spatial_filter_box parameter)
SELECT * FROM ST_Read('data.fgb')
WHERE geom && ST_MakeBox2D(ST_Point(-74.1, 40.6), ST_Point(-73.9, 40.8));
```

----

### ST_ReadOSM

#### Signature

```sql
ST_ReadOSM (col0 VARCHAR)
```

#### Description

The `ST_ReadOsm()` table function enables reading compressed OpenStreetMap data directly from a `.osm.pbf file.`

This function uses multithreading and zero-copy protobuf parsing which makes it a lot faster than using the `ST_Read()` OSM driver, however it only outputs the raw OSM data (Nodes, Ways, Relations), without constructing any geometries. For simple node entities (like PoI's) you can trivially construct POINT geometries, but it is also possible to construct LINESTRING and POLYGON geometries by manually joining refs and nodes together in SQL, although with available memory usually being a limiting factor.
The `ST_ReadOSM()` function also provides a "replacement scan" to enable reading from a file directly as if it were a table. This is just syntax sugar for calling `ST_ReadOSM()` though. Example:

```sql
SELECT * FROM 'tmp/data/germany.osm.pbf' LIMIT 5;
```

#### Example

```sql
SELECT *
FROM ST_ReadOSM('tmp/data/germany.osm.pbf')
WHERE tags['highway'] != []
LIMIT 5;
----
┌──────────────────────┬────────┬──────────────────────┬─────────┬────────────────────┬────────────┬───────────┬────────────────────────┐
│         kind         │   id   │         tags         │  refs   │        lat         │    lon     │ ref_roles │       ref_types        │
│ enum('node', 'way'…  │ int64  │ map(varchar, varch…  │ int64[] │       double       │   double   │ varchar[] │ enum('node', 'way', …  │
├──────────────────────┼────────┼──────────────────────┼─────────┼────────────────────┼────────────┼───────────┼────────────────────────┤
│ node                 │ 122351 │ {bicycle=yes, butt…  │         │         53.5492951 │   9.977553 │           │                        │
│ node                 │ 122397 │ {crossing=no, high…  │         │ 53.520990100000006 │ 10.0156924 │           │                        │
│ node                 │ 122493 │ {TMC:cid_58:tabcd_…  │         │ 53.129614600000004 │  8.1970173 │           │                        │
│ node                 │ 123566 │ {highway=traffic_s…  │         │ 54.617268200000005 │  8.9718171 │           │                        │
│ node                 │ 125801 │ {TMC:cid_58:tabcd_…  │         │ 53.070685000000005 │  8.7819939 │           │                        │
└──────────────────────┴────────┴──────────────────────┴─────────┴────────────────────┴────────────┴───────────┴────────────────────────┘
```

----

### ST_ReadSHP

#### Signature

```sql
ST_ReadSHP (col0 VARCHAR, encoding VARCHAR)
```

#### Description

Read a Shapefile without relying on the GDAL library

----

### ST_Read_Meta

#### Signature

```sql
ST_Read_Meta (col0 VARCHAR)
ST_Read_Meta (col0 VARCHAR[])
```

#### Description

Read the metadata from a variety of geospatial file formats using the GDAL library.

The `ST_Read_Meta` table function accompanies the `ST_Read` table function, but instead of reading the contents of a file, this function scans the metadata instead.
Since the data model of the underlying GDAL library is quite flexible, most of the interesting metadata is within the returned `layers` column, which is a somewhat complex nested structure of DuckDB `STRUCT` and `LIST` types.

#### Example

```sql
-- Find the coordinate reference system authority name and code for the first layers first geometry column in the file
SELECT
    layers[1].geometry_fields[1].crs.auth_name as name,
    layers[1].geometry_fields[1].crs.auth_code as code
FROM st_read_meta('../../tmp/data/amsterdam_roads.fgb');
```

----

### ST_Drivers

#### Signature

```sql
ST_Drivers ()
```

#### Description

Returns the list of supported GDAL drivers and file formats

Note that far from all of these drivers have been tested properly.
Some may require additional options to be passed to work as expected.
If you run into any issues please first consult the [consult the GDAL docs](https://gdal.org/drivers/vector/index.html).

#### Example

```sql
SELECT * FROM ST_Drivers();
```

----

### ST_GeneratePoints

#### Signature

```sql
ST_GeneratePoints (col0 BOX_2D, col1 BIGINT)
ST_GeneratePoints (col0 BOX_2D, col1 BIGINT, col2 BIGINT)
```

#### Description

Generates a set of random points within the specified bounding box.

Takes a bounding box (min_x, min_y, max_x, max_y), a count of points to generate, and optionally a seed for the random number generator.

#### Example

```sql
SELECT * FROM ST_GeneratePoints({min_x: 0, min_y:0, max_x:10, max_y:10}::BOX_2D, 5, 42);
```
