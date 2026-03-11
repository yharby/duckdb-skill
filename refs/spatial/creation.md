# Spatial Functions — Geometry Creation

Functions for creating new geometry objects (points, lines, polygons, envelopes, collections).

---

### ST_Point

#### Signature

```sql
GEOMETRY ST_Point (x DOUBLE, y DOUBLE)
```

#### Description

Creates a GEOMETRY point

----

### ST_Point2D

#### Signature

```sql
POINT_2D ST_Point2D (x DOUBLE, y DOUBLE)
```

#### Description

Creates a POINT_2D

----

### ST_Point3D

#### Signature

```sql
POINT_3D ST_Point3D (x DOUBLE, y DOUBLE, z DOUBLE)
```

#### Description

Creates a POINT_3D

----

### ST_Point4D

#### Signature

```sql
POINT_4D ST_Point4D (x DOUBLE, y DOUBLE, z DOUBLE, m DOUBLE)
```

#### Description

Creates a POINT_4D

----

### ST_MakePoint

#### Signatures

```sql
POINT_2D ST_MakePoint (x DOUBLE, y DOUBLE)
POINT_3D ST_MakePoint (x DOUBLE, y DOUBLE, z DOUBLE)
POINT_4D ST_MakePoint (x DOUBLE, y DOUBLE, z DOUBLE, m DOUBLE)
```

#### Description

Creates a GEOMETRY point from an pair of floating point numbers.

For geodetic coordinate systems, x is typically the longitude value and y is the latitude value.

Note that ST_Point is equivalent. ST_MakePoint is provided for PostGIS compatibility.

#### Example

```sql
SELECT ST_AsText(ST_MakePoint(143.3, -24.2));
----
POINT (143.3 -24.2)
```

----

### ST_MakeLine

#### Signatures

```sql
GEOMETRY ST_MakeLine (geoms GEOMETRY[])
GEOMETRY ST_MakeLine (start GEOMETRY, end GEOMETRY)
```

#### Description

Create a LINESTRING from a list of POINT geometries

#### Example

```sql
SELECT ST_MakeLine([ST_Point(0, 0), ST_Point(1, 1)]);
----
LINESTRING(0 0, 1 1)
```

----

### ST_MakePolygon

#### Signatures

```sql
GEOMETRY ST_MakePolygon (shell GEOMETRY)
GEOMETRY ST_MakePolygon (shell GEOMETRY, holes GEOMETRY[])
```

#### Description

Create a POLYGON from a LINESTRING shell

#### Example

```sql
SELECT ST_MakePolygon(ST_LineString([ST_Point(0, 0), ST_Point(1, 0), ST_Point(1, 1), ST_Point(0, 0)]));
```

----

### ST_MakeBox2D

#### Signature

```sql
BOX_2D ST_MakeBox2D (point1 GEOMETRY, point2 GEOMETRY)
```

#### Description

Create a BOX2D from two POINT geometries

#### Example

```sql
SELECT ST_MakeBox2D(ST_Point(0, 0), ST_Point(1, 1));
----
BOX(0 0, 1 1)
```

----

### ST_MakeEnvelope

#### Signature

```sql
GEOMETRY ST_MakeEnvelope (min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE)
```

#### Description

Create a rectangular polygon from min/max coordinates

----

### ST_Collect

#### Signature

```sql
GEOMETRY ST_Collect (geoms GEOMETRY[])
```

#### Description

Collects a list of geometries into a collection geometry.
- If all geometries are `POINT`'s, a `MULTIPOINT` is returned.
- If all geometries are `LINESTRING`'s, a `MULTILINESTRING` is returned.
- If all geometries are `POLYGON`'s, a `MULTIPOLYGON` is returned.
- Otherwise if the input collection contains a mix of geometry types, a `GEOMETRYCOLLECTION` is returned.

Empty and `NULL` geometries are ignored. If all geometries are empty or `NULL`, a `GEOMETRYCOLLECTION EMPTY` is returned.

#### Example

```sql
-- With all POINT's, a MULTIPOINT is returned
SELECT ST_Collect([ST_Point(1, 2), ST_Point(3, 4)]);
----
MULTIPOINT (1 2, 3 4)

-- With mixed geometry types, a GEOMETRYCOLLECTION is returned
SELECT ST_Collect([ST_Point(1, 2), ST_GeomFromText('LINESTRING(3 4, 5 6)')]);
----
GEOMETRYCOLLECTION (POINT (1 2), LINESTRING (3 4, 5 6))

-- Note that the empty geometry is ignored, so the result is a MULTIPOINT
SELECT ST_Collect([ST_Point(1, 2), NULL, ST_GeomFromText('GEOMETRYCOLLECTION EMPTY')]);
----
MULTIPOINT (1 2)

-- If all geometries are empty or NULL, a GEOMETRYCOLLECTION EMPTY is returned
SELECT ST_Collect([NULL, ST_GeomFromText('GEOMETRYCOLLECTION EMPTY')]);
----
GEOMETRYCOLLECTION EMPTY

-- Tip: You can use the `ST_Collect` function together with the `list()` aggregate function to collect multiple rows of geometries into a single geometry collection:

CREATE TABLE points (geom GEOMETRY);

INSERT INTO points VALUES (ST_Point(1, 2)), (ST_Point(3, 4));

SELECT ST_Collect(list(geom)) FROM points;
----
MULTIPOINT (1 2, 3 4)
```

----

### ST_Multi

#### Signature

```sql
GEOMETRY ST_Multi (geom GEOMETRY)
```

#### Description

Turns a single geometry into a multi geometry.

If the geometry is already a multi geometry, it is returned as is.

#### Example

```sql
SELECT ST_Multi(ST_GeomFromText('POINT(1 2)'));
----
MULTIPOINT (1 2)

SELECT ST_Multi(ST_GeomFromText('LINESTRING(1 1, 2 2)'));
----
MULTILINESTRING ((1 1, 2 2))

SELECT ST_Multi(ST_GeomFromText('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))'));
----
MULTIPOLYGON (((0 0, 0 1, 1 1, 1 0, 0 0)))
```

----

### ST_BuildArea

#### Signature

```sql
GEOMETRY ST_BuildArea (geom GEOMETRY)
```

#### Description

Creates a polygonal geometry by attemtping to "fill in" the input geometry.

Unlike ST_Polygonize, this function does not fill in holes.
