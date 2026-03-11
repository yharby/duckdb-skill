# Spatial Functions — Transforms

Functions that transform, simplify, buffer, combine, or otherwise modify geometries.

> **v1.5 reminder:** Always `SET geometry_always_xy = true;` at session start before using `ST_Transform` and other coordinate-sensitive functions. This ensures lon/lat (x/y) axis order consistency.

---

### ST_Transform

#### Signatures

```sql
BOX_2D ST_Transform (box BOX_2D, source_crs VARCHAR, target_crs VARCHAR)
BOX_2D ST_Transform (box BOX_2D, source_crs VARCHAR, target_crs VARCHAR, always_xy BOOLEAN)
POINT_2D ST_Transform (point POINT_2D, source_crs VARCHAR, target_crs VARCHAR)
POINT_2D ST_Transform (point POINT_2D, source_crs VARCHAR, target_crs VARCHAR, always_xy BOOLEAN)
GEOMETRY ST_Transform (geom GEOMETRY, source_crs VARCHAR, target_crs VARCHAR)
GEOMETRY ST_Transform (geom GEOMETRY, source_crs VARCHAR, target_crs VARCHAR, always_xy BOOLEAN)
```

#### Description

Transforms a geometry between two coordinate systems

The source and target coordinate systems can be specified using any format that the [PROJ library](https://proj.org) supports.

The third optional `always_xy` parameter can be used to force the input and output geometries to be interpreted as having a [easting, northing] coordinate axis order regardless of what the source and target coordinate system definition says. This is particularly useful when transforming to/from the [WGS84/EPSG:4326](https://en.wikipedia.org/wiki/World_Geodetic_System) coordinate system (what most people think of when they hear "longitude"/"latitude" or "GPS coordinates"), which is defined as having a [latitude, longitude] axis order even though [longitude, latitude] is commonly used in practice (e.g. in [GeoJSON](https://tools.ietf.org/html/rfc7946)). More details available in the [PROJ documentation](https://proj.org/en/9.3/faq.html#why-is-the-axis-ordering-in-proj-not-consistent).

DuckDB spatial vendors its own static copy of the PROJ database of coordinate systems, so if you have your own installation of PROJ on your system the available coordinate systems may differ to what's available in other GIS software.

#### Example

```sql
-- Transform a geometry from EPSG:4326 to EPSG:3857 (WGS84 to WebMercator)
-- Note that since WGS84 is defined as having a [latitude, longitude] axis order
-- we follow the standard and provide the input geometry using that axis order,
-- but the output will be [easting, northing] because that is what's defined by
-- WebMercator.

SELECT
    ST_Transform(
        st_point(52.373123, 4.892360),
        'EPSG:4326',
        'EPSG:3857'
    );
----
POINT (544615.0239773799 6867874.103539125)

-- Alternatively, let's say we got our input point from e.g. a GeoJSON file,
-- which uses WGS84 but with [longitude, latitude] axis order. We can use the
-- `always_xy` parameter to force the input geometry to be interpreted as having
-- a [northing, easting] axis order instead, even though the source coordinate
-- reference system definition (WGS84) says otherwise.

SELECT
    ST_Transform(
        -- note the axis order is reversed here
        st_point(4.892360, 52.373123),
        'EPSG:4326',
        'EPSG:3857',
        always_xy := true
    );
----
POINT (544615.0239773799 6867874.103539125)

-- Transform a geometry from OSG36 British National Grid EPSG:27700 to EPSG:4326 WGS84
-- Standard transform is often fine for the first few decimal places before being wrong
-- which could result in an error starting at about 10m and possibly much more
SELECT ST_Transform(bng, 'EPSG:27700', 'EPSG:4326', xy := true) AS without_grid_file
FROM (SELECT ST_GeomFromText('POINT( 170370.718 11572.405 )') AS bng);
----
POINT (-5.202992651563592 49.96007490162923)

-- By using an official NTv2 grid file, we can reduce the error down around the 9th decimal place
-- which in theory is below a millimetre, and in practise unlikely that your coordinates are that precise
-- British National Grid "NTv2 format files" download available here:
-- https://www.ordnancesurvey.co.uk/products/os-net/for-developers
SELECT ST_Transform(bng
    , '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +units=m +no_defs +nadgrids=/full/path/to/OSTN15-NTv2/OSTN15_NTv2_OSGBtoETRS.gsb +type=crs'
    , 'EPSG:4326', xy := true) AS with_grid_file
FROM (SELECT ST_GeomFromText('POINT( 170370.718 11572.405 )') AS bng) t;
----
POINT (-5.203046090608746 49.96006137018598)
```

----

### ST_Affine

#### Signatures

```sql
GEOMETRY ST_Affine (geom GEOMETRY, a DOUBLE, b DOUBLE, c DOUBLE, d DOUBLE, e DOUBLE, f DOUBLE, g DOUBLE, h DOUBLE, i DOUBLE, xoff DOUBLE, yoff DOUBLE, zoff DOUBLE)
GEOMETRY ST_Affine (geom GEOMETRY, a DOUBLE, b DOUBLE, d DOUBLE, e DOUBLE, xoff DOUBLE, yoff DOUBLE)
```

#### Description

Applies an affine transformation to a geometry.

For the 2D variant, the transformation matrix is defined as follows:
```
| a b xoff |
| d e yoff |
| 0 0 1    |
```

For the 3D variant, the transformation matrix is defined as follows:
```
| a b c xoff |
| d e f yoff |
| g h i zoff |
| 0 0 0 1    |
```

The transformation is applied to all vertices of the geometry.

#### Example

```sql
-- Translate a point by (2, 3)
SELECT ST_Affine(ST_Point(1, 1),
                 1, 0,   -- a, b
                 0, 1,   -- d, e
                 2, 3);  -- xoff, yoff
----
POINT (3 4)

-- Scale a geometry by factor 2 in X and Y
SELECT ST_Affine(ST_Point(1, 1),
                 2, 0, 0,   -- a, b, c
                 0, 2, 0,   -- d, e, f
                 0, 0, 1,   -- g, h, i
                 0, 0, 0);  -- xoff, yoff, zoff
----
POINT (2 2)
```

----

### ST_Buffer

#### Signatures

```sql
GEOMETRY ST_Buffer (geom GEOMETRY, distance DOUBLE)
GEOMETRY ST_Buffer (geom GEOMETRY, distance DOUBLE, num_triangles INTEGER)
GEOMETRY ST_Buffer (geom GEOMETRY, distance DOUBLE, num_triangles INTEGER, cap_style VARCHAR, join_style VARCHAR, mitre_limit DOUBLE)
```

#### Description

Returns a buffer around the input geometry at the target distance

`geom` is the input geometry.

`distance` is the target distance for the buffer, using the same units as the input geometry.

`num_triangles` represents how many triangles that will be produced to approximate a quarter circle. The larger the number, the smoother the resulting geometry. The default value is 8.

`cap_style` must be one of "CAP_ROUND", "CAP_FLAT", "CAP_SQUARE". This parameter is case-insensitive.

`join_style` must be one of "JOIN_ROUND", "JOIN_MITRE", "JOIN_BEVEL". This parameter is case-insensitive.

`mitre_limit` only applies when `join_style` is "JOIN_MITRE". It is the ratio of the distance from the corner to the mitre point to the corner radius. The default value is 1.0.

This is a planar operation and will not take into account the curvature of the earth.

----

### ST_Simplify

#### Signature

```sql
GEOMETRY ST_Simplify (geom GEOMETRY, tolerance DOUBLE)
```

#### Description

Returns a simplified version of the geometry

----

### ST_SimplifyPreserveTopology

#### Signature

```sql
GEOMETRY ST_SimplifyPreserveTopology (geom GEOMETRY, tolerance DOUBLE)
```

#### Description

Returns a simplified version of the geometry that preserves topology

----

### ST_ReducePrecision

#### Signature

```sql
GEOMETRY ST_ReducePrecision (geom GEOMETRY, precision DOUBLE)
```

#### Description

Returns the geometry with all vertices reduced to the given precision

----

### ST_RemoveRepeatedPoints

#### Signatures

```sql
LINESTRING_2D ST_RemoveRepeatedPoints (line LINESTRING_2D)
LINESTRING_2D ST_RemoveRepeatedPoints (line LINESTRING_2D, tolerance DOUBLE)
GEOMETRY ST_RemoveRepeatedPoints (geom GEOMETRY)
GEOMETRY ST_RemoveRepeatedPoints (geom GEOMETRY, tolerance DOUBLE)
```

#### Description

Remove repeated points from a LINESTRING.

----

### ST_Reverse

#### Signature

```sql
GEOMETRY ST_Reverse (geom GEOMETRY)
```

#### Description

Returns the geometry with the order of its vertices reversed

----

### ST_FlipCoordinates

#### Signatures

```sql
GEOMETRY ST_FlipCoordinates (geom GEOMETRY)
POINT_2D ST_FlipCoordinates (point POINT_2D)
LINESTRING_2D ST_FlipCoordinates (linestring LINESTRING_2D)
POLYGON_2D ST_FlipCoordinates (polygon POLYGON_2D)
BOX_2D ST_FlipCoordinates (box BOX_2D)
```

#### Description

Returns a new geometry with the coordinates of the input geometry "flipped" so that x = y and y = x

----

### ST_Force2D

#### Signature

```sql
GEOMETRY ST_Force2D (geom GEOMETRY)
```

#### Description

Forces the vertices of a geometry to have X and Y components

This function will drop any Z and M values from the input geometry, if present. If the input geometry is already 2D, it will be returned as is.

----

### ST_Force3DM

#### Signature

```sql
GEOMETRY ST_Force3DM (geom GEOMETRY, m DOUBLE)
```

#### Description

Forces the vertices of a geometry to have X, Y and M components

The following cases apply:
- If the input geometry has a Z component but no M component, the Z component will be replaced with the new M value.
- If the input geometry has a M component but no Z component, it will be returned as is.
- If the input geometry has both a Z component and a M component, the Z component will be removed.
- Otherwise, if the input geometry has neither a Z or M component, the new M value will be added to the vertices of the input geometry.

----

### ST_Force3DZ

#### Signature

```sql
GEOMETRY ST_Force3DZ (geom GEOMETRY, z DOUBLE)
```

#### Description

Forces the vertices of a geometry to have X, Y and Z components

The following cases apply:
- If the input geometry has a M component but no Z component, the M component will be replaced with the new Z value.
- If the input geometry has a Z component but no M component, it will be returned as is.
- If the input geometry has both a Z component and a M component, the M component will be removed.
- Otherwise, if the input geometry has neither a Z or M component, the new Z value will be added to the vertices of the input geometry.

----

### ST_Force4D

#### Signature

```sql
GEOMETRY ST_Force4D (geom GEOMETRY, z DOUBLE, m DOUBLE)
```

#### Description

Forces the vertices of a geometry to have X, Y, Z and M components

The following cases apply:
- If the input geometry has a Z component but no M component, the new M value will be added to the vertices of the input geometry.
- If the input geometry has a M component but no Z component, the new Z value will be added to the vertices of the input geometry.
- If the input geometry has both a Z component and a M component, the geometry will be returned as is.
- Otherwise, if the input geometry has neither a Z or M component, the new Z and M values will be added to the vertices of the input geometry.

----

### ST_MakeValid

#### Signature

```sql
GEOMETRY ST_MakeValid (geom GEOMETRY)
```

#### Description

Returns a valid representation of the geometry

----

### ST_Normalize

#### Signature

```sql
GEOMETRY ST_Normalize (geom GEOMETRY)
```

#### Description

Returns the "normalized" representation of the geometry

----

### ST_Centroid

#### Signatures

```sql
GEOMETRY ST_Centroid (geom GEOMETRY)
POINT_2D ST_Centroid (point POINT_2D)
POINT_2D ST_Centroid (linestring LINESTRING_2D)
POINT_2D ST_Centroid (polygon POLYGON_2D)
POINT_2D ST_Centroid (box BOX_2D)
POINT_2D ST_Centroid (box BOX_2DF)
```

#### Description

Returns the centroid of a geometry

----

### ST_ConvexHull

#### Signature

```sql
GEOMETRY ST_ConvexHull (geom GEOMETRY)
```

#### Description

Returns the convex hull enclosing the geometry

----

### ST_ConcaveHull

#### Signature

```sql
GEOMETRY ST_ConcaveHull (geom GEOMETRY, ratio DOUBLE, allowHoles BOOLEAN)
```

#### Description

Returns the 'concave' hull of the input geometry, containing all of the source input's points, and which can be used to create polygons from points. The ratio parameter dictates the level of concavity; 1.0 returns the convex hull; and 0 indicates to return the most concave hull possible. Set allowHoles to a non-zero value to allow output containing holes.

----

### ST_Envelope

#### Signature

```sql
GEOMETRY ST_Envelope (geom GEOMETRY)
```

#### Description

Returns the minimum bounding rectangle of a geometry as a polygon geometry

----

### ST_Boundary

#### Signature

```sql
GEOMETRY ST_Boundary (geom GEOMETRY)
```

#### Description

Returns the "boundary" of a geometry

----

### ST_Difference

#### Signature

```sql
GEOMETRY ST_Difference (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns the "difference" between two geometries

----

### ST_Intersection

#### Signature

```sql
GEOMETRY ST_Intersection (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns the intersection of two geometries

----

### ST_Union

#### Signature

```sql
GEOMETRY ST_Union (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns the union of two geometries

----

### ST_VoronoiDiagram

#### Signature

```sql
GEOMETRY ST_VoronoiDiagram (geom GEOMETRY)
```

#### Description

Returns the Voronoi diagram of the supplied MultiPoint geometry

----

### ST_MaximumInscribedCircle

#### Signatures

```sql
STRUCT(center GEOMETRY, nearest GEOMETRY, radius DOUBLE) ST_MaximumInscribedCircle (geom GEOMETRY)
STRUCT(center GEOMETRY, nearest GEOMETRY, radius DOUBLE) ST_MaximumInscribedCircle (geom GEOMETRY, tolerance DOUBLE)
```

#### Description

Returns the maximum inscribed circle of the input geometry, optionally with a tolerance.

By default, the tolerance is computed as `max(width, height) / 1000`.
The return value is a struct with the center of the circle, the nearest point to the center on the boundary of the geometry, and the radius of the circle.

#### Example

```sql
-- Find the maximum inscribed circle of a square
SELECT ST_MaximumInscribedCircle(
    ST_GeomFromText('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))')
);
----
{'center': POINT (5 5), 'nearest': POINT (5 0), 'radius': 5.0}
```

----

### ST_MinimumRotatedRectangle

#### Signature

```sql
GEOMETRY ST_MinimumRotatedRectangle (geom GEOMETRY)
```

#### Description

Returns the minimum rotated rectangle that bounds the input geometry, finding the surrounding box that has the lowest area by using a rotated rectangle, rather than taking the lowest and highest coordinate values as per ST_Envelope().

----

### ST_PointOnSurface

#### Signature

```sql
GEOMETRY ST_PointOnSurface (geom GEOMETRY)
```

#### Description

Returns a point guaranteed to lie on the surface of the geometry

----

### ST_Hilbert

#### Signatures

```sql
UINTEGER ST_Hilbert (x DOUBLE, y DOUBLE, bounds BOX_2D)
UINTEGER ST_Hilbert (geom GEOMETRY, bounds BOX_2D)
UINTEGER ST_Hilbert (geom GEOMETRY)
UINTEGER ST_Hilbert (box BOX_2D, bounds BOX_2D)
UINTEGER ST_Hilbert (box BOX_2DF, bounds BOX_2DF)
```

#### Description

Encodes the X and Y values as the hilbert curve index for a curve covering the given bounding box.
If a geometry is provided, the center of the approximate bounding box is used as the point to encode.
If no bounding box is provided, the hilbert curve index is mapped to the full range of a single-presicion float.
For the BOX_2D and BOX_2DF variants, the center of the box is used as the point to encode.

----

### ST_Node

#### Signature

```sql
GEOMETRY ST_Node (geom GEOMETRY)
```

#### Description

Returns a "noded" MultiLinestring, produced by combining a collection of input linestrings and adding additional vertices where they intersect.

#### Example

```sql
-- Create a noded multilinestring from two intersecting lines
SELECT ST_Node(
    ST_GeomFromText('MULTILINESTRING((0 0, 2 2), (0 2, 2 0))')
);
----
MULTILINESTRING ((0 0, 1 1), (1 1, 2 2), (0 2, 1 1), (1 1, 2 0))
```
