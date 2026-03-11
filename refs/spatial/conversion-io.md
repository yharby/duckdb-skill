# Spatial Functions — Conversion & I/O

Functions for serializing/deserializing geometries to/from various formats (WKT, WKB, GeoJSON, HEXWKB, SVG, MVT).

---

### ST_AsGeoJSON

#### Signature

```sql
JSON ST_AsGeoJSON (geom GEOMETRY)
```

#### Description

Returns the geometry as a GeoJSON fragment

This does not return a complete GeoJSON document, only the geometry fragment.
To construct a complete GeoJSON document or feature, look into using the DuckDB JSON extension in conjunction with this function.
This function supports geometries with Z values, but not M values. M values are ignored.

#### Example

```sql
select ST_AsGeoJSON('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))'::geometry);
----
{"type":"Polygon","coordinates":[[[0.0,0.0],[0.0,1.0],[1.0,1.0],[1.0,0.0],[0.0,0.0]]]}

-- Convert a geometry into a full GeoJSON feature (requires the JSON extension to be loaded)
SELECT CAST({
    type: 'Feature',
    geometry: ST_AsGeoJSON(ST_Point(1,2)),
    properties: {
        name: 'my_point'
    }
} AS JSON);
----
{"type":"Feature","geometry":{"type":"Point","coordinates":[1.0,2.0]},"properties":{"name":"my_point"}}
```

----

### ST_AsHEXWKB

#### Signature

```sql
VARCHAR ST_AsHEXWKB (geom GEOMETRY)
```

#### Description

Returns the geometry as a HEXWKB string

#### Example

```sql
SELECT ST_AsHexWKB('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))'::geometry);
----
01030000000100000005000000000000000000000000000...
```

----

### ST_AsMVTGeom

#### Signatures

```sql
GEOMETRY ST_AsMVTGeom (geom GEOMETRY, bounds BOX_2D, extent BIGINT, buffer BIGINT, clip_geom BOOLEAN)
GEOMETRY ST_AsMVTGeom (geom GEOMETRY, bounds BOX_2D, extent BIGINT, buffer BIGINT)
GEOMETRY ST_AsMVTGeom (geom GEOMETRY, bounds BOX_2D, extent BIGINT)
GEOMETRY ST_AsMVTGeom (geom GEOMETRY, bounds BOX_2D)
```

#### Description

Transform and clip geometry to a tile boundary

See "ST_AsMVT" for more details

----

### ST_AsSVG

#### Signature

```sql
VARCHAR ST_AsSVG (geom GEOMETRY, relative BOOLEAN, precision INTEGER)
```

#### Description

Convert the geometry into a SVG fragment or path

The SVG fragment is returned as a string. The fragment is a path element that can be used in an SVG document.
The second boolean argument specifies whether the path should be relative or absolute.
The third argument specifies the maximum number of digits to use for the coordinates.

Points are formatted as cx/cy using absolute coordinates or x/y using relative coordinates.

#### Example

```sql
SELECT ST_AsSVG('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))'::GEOMETRY, false, 15);
----
M 0 0 L 0 -1 1 -1 1 0 Z
```

----

### ST_AsText

#### Signatures

```sql
VARCHAR ST_AsText (geom GEOMETRY)
VARCHAR ST_AsText (point POINT_2D)
VARCHAR ST_AsText (linestring LINESTRING_2D)
VARCHAR ST_AsText (polygon POLYGON_2D)
VARCHAR ST_AsText (box BOX_2D)
```

#### Description

Returns the geometry as a WKT string

#### Example

```sql
SELECT ST_MakeEnvelope(0,0,1,1);
----
POLYGON ((0 0, 0 1, 1 1, 1 0, 0 0))
```

----

### ST_AsWKB

#### Signature

```sql
WKB_BLOB ST_AsWKB (geom GEOMETRY)
```

#### Description

Returns the geometry as a WKB (Well-Known-Binary) blob

#### Example

```sql
SELECT ST_AsWKB('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))'::GEOMETRY)::BLOB;
----
\x01\x03\x00\x00\x00\x01\x00\x00\x00\x05...
```

----

### ST_GeomFromGeoJSON

#### Signatures

```sql
GEOMETRY ST_GeomFromGeoJSON (geojson JSON)
GEOMETRY ST_GeomFromGeoJSON (geojson VARCHAR)
```

#### Description

Deserializes a GEOMETRY from a GeoJSON fragment.

#### Example

```sql
SELECT ST_GeomFromGeoJSON('{"type":"Point","coordinates":[1.0,2.0]}');
----
POINT (1 2)
```

----

### ST_GeomFromHEXEWKB

#### Signature

```sql
GEOMETRY ST_GeomFromHEXEWKB (hexwkb VARCHAR)
```

#### Description

Deserialize a GEOMETRY from a HEX(E)WKB encoded string

DuckDB spatial doesnt currently differentiate between `WKB` and `EWKB`, so `ST_GeomFromHEXWKB` and `ST_GeomFromHEXEWKB" are just aliases of eachother.

----

### ST_GeomFromHEXWKB

#### Signature

```sql
GEOMETRY ST_GeomFromHEXWKB (hexwkb VARCHAR)
```

#### Description

Deserialize a GEOMETRY from a HEX(E)WKB encoded string

DuckDB spatial doesnt currently differentiate between `WKB` and `EWKB`, so `ST_GeomFromHEXWKB` and `ST_GeomFromHEXEWKB" are just aliases of eachother.

----

### ST_GeomFromText

#### Signatures

```sql
GEOMETRY ST_GeomFromText (wkt VARCHAR)
GEOMETRY ST_GeomFromText (wkt VARCHAR, ignore_invalid BOOLEAN)
```

#### Description

Deserialize a GEOMETRY from a WKT encoded string

----

### ST_GeomFromWKB

#### Signatures

```sql
GEOMETRY ST_GeomFromWKB (wkb WKB_BLOB)
GEOMETRY ST_GeomFromWKB (blob BLOB)
```

#### Description

Deserializes a GEOMETRY from a WKB encoded blob

----

### ST_GeometryType

#### Signatures

```sql
ANY ST_GeometryType (geom GEOMETRY)
ANY ST_GeometryType (point POINT_2D)
ANY ST_GeometryType (linestring LINESTRING_2D)
ANY ST_GeometryType (polygon POLYGON_2D)
ANY ST_GeometryType (wkb WKB_BLOB)
```

#### Description

Returns a 'GEOMETRY_TYPE' enum identifying the input geometry type. Possible enum return types are: `POINT`, `LINESTRING`, `POLYGON`, `MULTIPOINT`, `MULTILINESTRING`, `MULTIPOLYGON`, and `GEOMETRYCOLLECTION`.

#### Example

```sql
SELECT DISTINCT ST_GeometryType(ST_GeomFromText('POINT(1 1)'));
----
POINT
```

----

### GEOMETRY Type Casting

```sql
-- WKT to GEOMETRY
SELECT 'POINT(0 0)'::GEOMETRY;

-- GEOMETRY to WKT
SELECT geom::VARCHAR AS wkt FROM my_table;
```
