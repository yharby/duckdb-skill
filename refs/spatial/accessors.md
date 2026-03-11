# Spatial Functions — Accessors

Functions for extracting coordinates, counts, sub-geometries, and testing geometry properties.

---

### ST_X

#### Signatures

```sql
DOUBLE ST_X (geom GEOMETRY)
DOUBLE ST_X (point POINT_2D)
```

#### Description

Returns the X coordinate of a point geometry

#### Example

```sql
SELECT ST_X(ST_Point(1, 2))
```

----

### ST_Y

#### Signatures

```sql
DOUBLE ST_Y (geom GEOMETRY)
DOUBLE ST_Y (point POINT_2D)
```

#### Description

Returns the Y coordinate of a point geometry

#### Example

```sql
SELECT ST_Y(ST_Point(1, 2))
```

----

### ST_Z

#### Signature

```sql
DOUBLE ST_Z (geom GEOMETRY)
```

#### Description

Returns the Z coordinate of a point geometry

#### Example

```sql
SELECT ST_Z(ST_Point(1, 2, 3))
```

----

### ST_M

#### Signature

```sql
DOUBLE ST_M (geom GEOMETRY)
```

#### Description

Returns the M coordinate of a point geometry

#### Example

```sql
SELECT ST_M(ST_Point(1, 2, 3, 4))
```

----

### ST_HasM

#### Signatures

```sql
BOOLEAN ST_HasM (geom GEOMETRY)
BOOLEAN ST_HasM (wkb WKB_BLOB)
```

#### Description

Check if the input geometry has M values.

#### Example

```sql
-- HasM for a 2D geometry
SELECT ST_HasM(ST_GeomFromText('POINT(1 1)'));
----
false

-- HasM for a 3DZ geometry
SELECT ST_HasM(ST_GeomFromText('POINT Z(1 1 1)'));
----
false

-- HasM for a 3DM geometry
SELECT ST_HasM(ST_GeomFromText('POINT M(1 1 1)'));
----
true

-- HasM for a 4D geometry
SELECT ST_HasM(ST_GeomFromText('POINT ZM(1 1 1 1)'));
----
true
```

----

### ST_HasZ

#### Signatures

```sql
BOOLEAN ST_HasZ (geom GEOMETRY)
BOOLEAN ST_HasZ (wkb WKB_BLOB)
```

#### Description

Check if the input geometry has Z values.

#### Example

```sql
-- HasZ for a 2D geometry
SELECT ST_HasZ(ST_GeomFromText('POINT(1 1)'));
----
false

-- HasZ for a 3DZ geometry
SELECT ST_HasZ(ST_GeomFromText('POINT Z(1 1 1)'));
----
true

-- HasZ for a 3DM geometry
SELECT ST_HasZ(ST_GeomFromText('POINT M(1 1 1)'));
----
false

-- HasZ for a 4D geometry
SELECT ST_HasZ(ST_GeomFromText('POINT ZM(1 1 1 1)'));
----
true
```

----

### ST_ZMFlag

#### Signatures

```sql
UTINYINT ST_ZMFlag (geom GEOMETRY)
UTINYINT ST_ZMFlag (wkb WKB_BLOB)
```

#### Description

Returns a flag indicating the presence of Z and M values in the input geometry.
0 = No Z or M values
1 = M values only
2 = Z values only
3 = Z and M values

#### Example

```sql
-- ZMFlag for a 2D geometry
SELECT ST_ZMFlag(ST_GeomFromText('POINT(1 1)'));
----
0

-- ZMFlag for a 3DZ geometry
SELECT ST_ZMFlag(ST_GeomFromText('POINT Z(1 1 1)'));
----
2

-- ZMFlag for a 3DM geometry
SELECT ST_ZMFlag(ST_GeomFromText('POINT M(1 1 1)'));
----
1

-- ZMFlag for a 4D geometry
SELECT ST_ZMFlag(ST_GeomFromText('POINT ZM(1 1 1 1)'));
----
3
```

----

### ST_XMax

#### Signatures

```sql
DOUBLE ST_XMax (geom GEOMETRY)
DOUBLE ST_XMax (point POINT_2D)
DOUBLE ST_XMax (line LINESTRING_2D)
DOUBLE ST_XMax (polygon POLYGON_2D)
DOUBLE ST_XMax (box BOX_2D)
FLOAT ST_XMax (box BOX_2DF)
```

#### Description

Returns the maximum X coordinate of a geometry

#### Example

```sql
SELECT ST_XMax(ST_Point(1, 2))
```

----

### ST_XMin

#### Signatures

```sql
DOUBLE ST_XMin (geom GEOMETRY)
DOUBLE ST_XMin (point POINT_2D)
DOUBLE ST_XMin (line LINESTRING_2D)
DOUBLE ST_XMin (polygon POLYGON_2D)
DOUBLE ST_XMin (box BOX_2D)
FLOAT ST_XMin (box BOX_2DF)
```

#### Description

Returns the minimum X coordinate of a geometry

#### Example

```sql
SELECT ST_XMin(ST_Point(1, 2))
```

----

### ST_YMax

#### Signatures

```sql
DOUBLE ST_YMax (geom GEOMETRY)
DOUBLE ST_YMax (point POINT_2D)
DOUBLE ST_YMax (line LINESTRING_2D)
DOUBLE ST_YMax (polygon POLYGON_2D)
DOUBLE ST_YMax (box BOX_2D)
FLOAT ST_YMax (box BOX_2DF)
```

#### Description

Returns the maximum Y coordinate of a geometry

#### Example

```sql
SELECT ST_YMax(ST_Point(1, 2))
```

----

### ST_YMin

#### Signatures

```sql
DOUBLE ST_YMin (geom GEOMETRY)
DOUBLE ST_YMin (point POINT_2D)
DOUBLE ST_YMin (line LINESTRING_2D)
DOUBLE ST_YMin (polygon POLYGON_2D)
DOUBLE ST_YMin (box BOX_2D)
FLOAT ST_YMin (box BOX_2DF)
```

#### Description

Returns the minimum Y coordinate of a geometry

#### Example

```sql
SELECT ST_YMin(ST_Point(1, 2))
```

----

### ST_ZMax

#### Signature

```sql
DOUBLE ST_ZMax (geom GEOMETRY)
```

#### Description

Returns the maximum Z coordinate of a geometry

#### Example

```sql
SELECT ST_ZMax(ST_Point(1, 2, 3))
```

----

### ST_ZMin

#### Signature

```sql
DOUBLE ST_ZMin (geom GEOMETRY)
```

#### Description

Returns the minimum Z coordinate of a geometry

#### Example

```sql
SELECT ST_ZMin(ST_Point(1, 2, 3))
```

----

### ST_MMax

#### Signature

```sql
DOUBLE ST_MMax (geom GEOMETRY)
```

#### Description

Returns the maximum M coordinate of a geometry

#### Example

```sql
SELECT ST_MMax(ST_Point(1, 2, 3, 4))
```

----

### ST_MMin

#### Signature

```sql
DOUBLE ST_MMin (geom GEOMETRY)
```

#### Description

Returns the minimum M coordinate of a geometry

#### Example

```sql
SELECT ST_MMin(ST_Point(1, 2, 3, 4))
```

----

### ST_Dimension

#### Signature

```sql
INTEGER ST_Dimension (geom GEOMETRY)
```

#### Description

Returns the "topological dimension" of a geometry.

- For POINT and MULTIPOINT geometries, returns `0`
- For LINESTRING and MULTILINESTRING, returns `1`
- For POLYGON and MULTIPOLYGON, returns `2`
- For GEOMETRYCOLLECTION, returns the maximum dimension of the contained geometries, or 0 if the collection is empty

#### Example

```sql
select st_dimension('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))'::geometry);
----
2
```

----

### ST_NGeometries

#### Signature

```sql
INTEGER ST_NGeometries (geom GEOMETRY)
```

#### Description

Returns the number of component geometries in a collection geometry.
If the input geometry is not a collection, this function returns 0 or 1 depending on if the geometry is empty or not.

----

### ST_NInteriorRings

#### Signatures

```sql
INTEGER ST_NInteriorRings (geom GEOMETRY)
INTEGER ST_NInteriorRings (polygon POLYGON_2D)
```

#### Description

Returns the number of interior rings of a polygon

----

### ST_NPoints

#### Signatures

```sql
UINTEGER ST_NPoints (geom GEOMETRY)
UBIGINT ST_NPoints (point POINT_2D)
UBIGINT ST_NPoints (linestring LINESTRING_2D)
UBIGINT ST_NPoints (polygon POLYGON_2D)
UBIGINT ST_NPoints (box BOX_2D)
```

#### Description

Returns the number of vertices within a geometry

----

### ST_NumGeometries

#### Signature

```sql
INTEGER ST_NumGeometries (geom GEOMETRY)
```

#### Description

Returns the number of component geometries in a collection geometry.
If the input geometry is not a collection, this function returns 0 or 1 depending on if the geometry is empty or not.

----

### ST_NumInteriorRings

#### Signatures

```sql
INTEGER ST_NumInteriorRings (geom GEOMETRY)
INTEGER ST_NumInteriorRings (polygon POLYGON_2D)
```

#### Description

Returns the number of interior rings of a polygon

----

### ST_NumPoints

#### Signatures

```sql
UINTEGER ST_NumPoints (geom GEOMETRY)
UBIGINT ST_NumPoints (point POINT_2D)
UBIGINT ST_NumPoints (linestring LINESTRING_2D)
UBIGINT ST_NumPoints (polygon POLYGON_2D)
UBIGINT ST_NumPoints (box BOX_2D)
```

#### Description

Returns the number of vertices within a geometry

----

### ST_ExteriorRing

#### Signatures

```sql
GEOMETRY ST_ExteriorRing (geom GEOMETRY)
LINESTRING_2D ST_ExteriorRing (polygon POLYGON_2D)
```

#### Description

Returns the exterior ring (shell) of a polygon geometry.

----

### ST_StartPoint

#### Signatures

```sql
GEOMETRY ST_StartPoint (geom GEOMETRY)
POINT_2D ST_StartPoint (line LINESTRING_2D)
```

#### Description

Returns the start point of a LINESTRING.

----

### ST_EndPoint

#### Signatures

```sql
GEOMETRY ST_EndPoint (geom GEOMETRY)
POINT_2D ST_EndPoint (line LINESTRING_2D)
```

#### Description

Returns the end point of a LINESTRING.

----

### ST_PointN

#### Signatures

```sql
GEOMETRY ST_PointN (geom GEOMETRY, index INTEGER)
POINT_2D ST_PointN (linestring LINESTRING_2D, index INTEGER)
```

#### Description

Returns the n'th vertex from the input geometry as a point geometry

----

### ST_Points

#### Signature

```sql
GEOMETRY ST_Points (geom GEOMETRY)
```

#### Description

Collects all the vertices in the geometry into a MULTIPOINT

#### Example

```sql
select st_points('LINESTRING(1 1, 2 2)'::geometry);
----
MULTIPOINT (1 1, 2 2)

select st_points('MULTIPOLYGON Z EMPTY'::geometry);
----
MULTIPOINT Z EMPTY
```

----

### ST_IsClosed

#### Signature

```sql
BOOLEAN ST_IsClosed (geom GEOMETRY)
```

#### Description

Check if a geometry is 'closed'

----

### ST_IsEmpty

#### Signatures

```sql
BOOLEAN ST_IsEmpty (geom GEOMETRY)
BOOLEAN ST_IsEmpty (linestring LINESTRING_2D)
BOOLEAN ST_IsEmpty (polygon POLYGON_2D)
```

#### Description

Returns true if the geometry is "empty".

----

### ST_IsRing

#### Signature

```sql
BOOLEAN ST_IsRing (geom GEOMETRY)
```

#### Description

Returns true if the geometry is a ring (both ST_IsClosed and ST_IsSimple).

----

### ST_IsSimple

#### Signature

```sql
BOOLEAN ST_IsSimple (geom GEOMETRY)
```

#### Description

Returns true if the geometry is simple

----

### ST_IsValid

#### Signature

```sql
BOOLEAN ST_IsValid (geom GEOMETRY)
```

#### Description

Returns true if the geometry is valid

----

### ST_Extent

#### Signatures

```sql
BOX_2D ST_Extent (geom GEOMETRY)
BOX_2D ST_Extent (wkb WKB_BLOB)
```

#### Description

Returns the minimal bounding box enclosing the input geometry

----

### ST_Extent_Approx

#### Signature

```sql
BOX_2DF ST_Extent_Approx (geom GEOMETRY)
```

#### Description

Returns the approximate bounding box of a geometry, if available.

This function is only really used internally, and returns the cached bounding box of the geometry if it exists.
This function may be removed or renamed in the future.

----

### ST_Dump

#### Signature

```sql
STRUCT(geom GEOMETRY, path INTEGER[])[] ST_Dump (geom GEOMETRY)
```

#### Description

Dumps a geometry into a list of sub-geometries and their "path" in the original geometry.

You can use the `UNNEST(res, recursive := true)` function to explode  resulting list of structs into multiple rows.

#### Example

```sql
select st_dump('MULTIPOINT(1 2,3 4)'::geometry);
----
[{'geom': 'POINT(1 2)', 'path': [0]}, {'geom': 'POINT(3 4)', 'path': [1]}]

select unnest(st_dump('MULTIPOINT(1 2,3 4)'::geometry), recursive := true);
-- ┌─────────────┬─────────┐
-- │    geom     │  path   │
-- │  geometry   │ int32[] │
-- ├─────────────┼─────────┤
-- │ POINT (1 2) │ [1]     │
-- │ POINT (3 4) │ [2]     │
-- └─────────────┴─────────┘
```

----

### ST_CollectionExtract

#### Signatures

```sql
GEOMETRY ST_CollectionExtract (geom GEOMETRY, type INTEGER)
GEOMETRY ST_CollectionExtract (geom GEOMETRY)
```

#### Description

Extracts geometries from a GeometryCollection into a typed multi geometry.

If the input geometry is a GeometryCollection, the function will return a multi geometry, determined by the `type` parameter.
- if `type` = 1, returns a MultiPoint containg all the Points in the collection
- if `type` = 2, returns a MultiLineString containg all the LineStrings in the collection
- if `type` = 3, returns a MultiPolygon containg all the Polygons in the collection

If no `type` parameters is provided, the function will return a multi geometry matching the highest "surface dimension"
of the contained geometries. E.g. if the collection contains only Points, a MultiPoint will be returned. But if the
collection contains both Points and LineStrings, a MultiLineString will be returned. Similarly, if the collection
contains Polygons, a MultiPolygon will be returned. Contained geometries of a lower surface dimension will be ignored.

If the input geometry contains nested GeometryCollections, their geometries will be extracted recursively and included
into the final multi geometry as well.

If the input geometry is not a GeometryCollection, the function will return the input geometry as is.

#### Example

```sql
select st_collectionextract('MULTIPOINT(1 2,3 4)'::geometry, 1);
-- MULTIPOINT (1 2, 3 4)
```

----

### ST_Polygonize

#### Signature

```sql
GEOMETRY ST_Polygonize (geometries GEOMETRY[])
```

#### Description

Returns a polygonized representation of the input geometries

#### Example

```sql
-- Create a polygon from a closed linestring ring
SELECT ST_Polygonize([
    ST_GeomFromText('LINESTRING(0 0, 0 10, 10 10, 10 0, 0 0)')
]);
---
GEOMETRYCOLLECTION (POLYGON ((0 0, 0 10, 10 10, 10 0, 0 0)))
```
