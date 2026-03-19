# Spatial Functions — Aggregates

Aggregate functions that combine multiple geometry rows into a single result.

---

### ST_AsMVT

#### Signatures

```sql
BLOB ST_AsMVT (col0 ANY)
BLOB ST_AsMVT (col0 ANY, col1 VARCHAR)
BLOB ST_AsMVT (col0 ANY, col1 VARCHAR, col2 INTEGER)
BLOB ST_AsMVT (col0 ANY, col1 VARCHAR, col2 INTEGER, col3 VARCHAR)
BLOB ST_AsMVT (col0 ANY, col1 VARCHAR, col2 INTEGER, col3 VARCHAR, col4 VARCHAR)
```

#### Description

Make a Mapbox Vector Tile from a set of geometries and properties
The function takes as input a row type (STRUCT) containing a geometry column and any number of property columns.
It returns a single binary BLOB containing the Mapbox Vector Tile.

The function has the following signature:

`ST_AsMVT(row STRUCT, layer_name VARCHAR DEFAULT 'layer', extent INTEGER DEFAULT 4096, geom_column_name VARCHAR DEFAULT NULL, feature_id_column_name VARCHAR DEFAULT NULL) -> BLOB`

- The first argument is a struct containing the geometry and properties.
- The second argument is the name of the layer in the vector tile. This argument is optional and defaults to 'layer'.
- The third argument is the extent of the tile. This argument is optional and defaults to 4096.
- The fourth argument is the name of the geometry column in the input row. This argument is optional. If not provided, the first geometry column in the input row will be used. If multiple geometry columns are present, an error will be raised.
- The fifth argument is the name of the feature id column in the input row. This argument is optional. If provided, the values in this column will be used as feature ids in the vector tile. The column must be of type INTEGER or BIGINT. If set to negative or NULL, a feature id will not be assigned to the corresponding feature.

The input struct must contain exactly one geometry column of type GEOMETRY. It can contain any number of property columns of types VARCHAR, FLOAT, DOUBLE, INTEGER, BIGINT, or BOOLEAN.

Example:
```sql
SELECT ST_AsMVT({'geom': geom, 'id': id, 'name': name}, 'cities', 4096, 'geom', 'id') AS tile
FROM cities;
 ```

This example creates a vector tile named 'cities' with an extent of 4096 from the 'cities' table, using 'geom' as the geometry column and 'id' as the feature id column.

However, you probably want to use the ST_AsMVTGeom function to first transform and clip your geometries to the tile extent.
The following example assumes the geometry is in WebMercator ("EPSG:3857") coordinates.
Replace `{z}`, `{x}`, and `{y}` with the appropriate tile coordinates, `{your table}` with your table name, and `{tile_path}` with the path to write the tile to.

```sql
COPY (
    SELECT ST_AsMVT({{
        "geometry": ST_AsMVTGeom(
            geometry,
            ST_Extent(ST_TileEnvelope({z}, {x}, {y})),
            4096,
            256,
            false
        )
    }})
    FROM {your table} WHERE ST_Intersects(geometry, ST_TileEnvelope({z}, {x}, {y}))
) to {tile_path} (FORMAT 'BLOB');
```

----

### ST_Union_Agg

#### Signature

```sql
GEOMETRY ST_Union_Agg (col0 GEOMETRY)
```

#### Description

Computes the union of a set of input geometries

----

### ST_MemUnion_Agg

#### Signature

```sql
GEOMETRY ST_MemUnion_Agg (col0 GEOMETRY)
```

#### Description

Computes the union of a set of input geometries.
                "Slower, but might be more memory efficient than ST_UnionAgg as each geometry is merged into the union individually rather than all at once.

----

### ST_Extent_Agg

#### Signature

```sql
GEOMETRY ST_Extent_Agg (col0 GEOMETRY)
```

#### Description

Computes the minimal-bounding-box polygon containing the set of input geometries

#### Example

```sql
SELECT ST_Extent_Agg(geom) FROM UNNEST([ST_Point(1,1), ST_Point(5,5)]) AS _(geom);
-- POLYGON ((1 1, 1 5, 5 5, 5 1, 1 1))
```

----

### ST_Envelope_Agg

#### Signature

```sql
GEOMETRY ST_Envelope_Agg (col0 GEOMETRY)
```

#### Description

Alias for [ST_Extent_Agg](#st_extent_agg).

Computes the minimal-bounding-box polygon containing the set of input geometries.

#### Example

```sql
SELECT ST_Extent_Agg(geom) FROM UNNEST([ST_Point(1,1), ST_Point(5,5)]) AS _(geom);
-- POLYGON ((1 1, 1 5, 5 5, 5 1, 1 1))
```

----

### ST_Intersection_Agg

#### Signature

```sql
GEOMETRY ST_Intersection_Agg (col0 GEOMETRY)
```

#### Description

Computes the intersection of a set of geometries.

> **Important:** Intersection is processed sequentially ("one by one") and is **not associative** — the result depends on processing order. Use `ORDER BY` in the aggregate to get deterministic results:
> ```sql
> SELECT ST_Intersection_Agg(geom ORDER BY id) FROM my_table;
> ```

----

### ST_CoverageInvalidEdges_Agg

#### Signatures

```sql
GEOMETRY ST_CoverageInvalidEdges_Agg (col0 GEOMETRY)
GEOMETRY ST_CoverageInvalidEdges_Agg (col0 GEOMETRY, col1 DOUBLE)
```

#### Description

Returns the invalid edges of a coverage geometry

----

### ST_CoverageSimplify_Agg

#### Signatures

```sql
GEOMETRY ST_CoverageSimplify_Agg (col0 GEOMETRY, col1 DOUBLE)
GEOMETRY ST_CoverageSimplify_Agg (col0 GEOMETRY, col1 DOUBLE, col2 BOOLEAN)
```

#### Description

Simplifies a set of geometries while maintaining coverage

----

### ST_CoverageUnion_Agg

#### Signature

```sql
GEOMETRY ST_CoverageUnion_Agg (col0 GEOMETRY)
```

#### Description

Unions a set of geometries while maintaining coverage
