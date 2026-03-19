# Spatial Functions — Measurement

Functions for computing distance, area, length, perimeter, and azimuth.

> **v1.5 reminder:** Always `SET geometry_always_xy = true;` at session start before using spheroid/sphere functions (`ST_Distance_Spheroid`, `ST_Area_Spheroid`, `ST_Length_Spheroid`, etc.). This ensures lon/lat (x/y) axis order consistency.

---

### ST_Area

#### Signatures

```sql
DOUBLE ST_Area (geom GEOMETRY)
DOUBLE ST_Area (polygon POLYGON_2D)
DOUBLE ST_Area (linestring LINESTRING_2D)
DOUBLE ST_Area (point POINT_2D)
DOUBLE ST_Area (box BOX_2D)
```

#### Description

Compute the area of a geometry.

Returns `0.0` for any geometry that is not a `POLYGON`, `MULTIPOLYGON` or `GEOMETRYCOLLECTION` containing polygon
geometries.

The area is in the same units as the spatial reference system of the geometry.

The `POINT_2D` and `LINESTRING_2D` overloads of this function always return `0.0` but are included for completeness.

#### Example

```sql
select ST_Area('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))'::geometry);
-- 1.0
```

----

### ST_Area_Spheroid

#### Signatures

```sql
DOUBLE ST_Area_Spheroid (geom GEOMETRY)
DOUBLE ST_Area_Spheroid (poly POLYGON_2D)
```

#### Description

Returns the area of a geometry in meters, using an ellipsoidal model of the earth

The input geometry is assumed to be in the [EPSG:4326](https://en.wikipedia.org/wiki/World_Geodetic_System) coordinate system (WGS84), with [latitude, longitude] axis order and the area is returned in square meters. This function uses the [GeographicLib](https://geographiclib.sourceforge.io/) library, calculating the area using an ellipsoidal model of the earth. This is a highly accurate method for calculating the area of a polygon taking the curvature of the earth into account, but is also the slowest.

Returns `0.0` for any geometry that is not a `POLYGON`, `MULTIPOLYGON` or `GEOMETRYCOLLECTION` containing polygon geometries.

----

### ST_Distance

#### Signatures

```sql
DOUBLE ST_Distance (point1 POINT_2D, point2 POINT_2D)
DOUBLE ST_Distance (point POINT_2D, linestring LINESTRING_2D)
DOUBLE ST_Distance (linestring LINESTRING_2D, point POINT_2D)
DOUBLE ST_Distance (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns the planar distance between two geometries

#### Example

```sql
SELECT ST_Distance('POINT (0 0)'::GEOMETRY, 'POINT (3 4)'::GEOMETRY);
----
5.0

-- Z coordinates are ignored
SELECT ST_Distance('POINT Z (0 0 0)'::GEOMETRY, 'POINT Z (3 4 5)'::GEOMETRY);
----
5.0
```

----

### ST_Distance_GEOS

#### Signature

```sql
DOUBLE ST_Distance_GEOS (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns the planar distance between two geometries

----

### ST_Distance_Sphere

#### Signatures

```sql
DOUBLE ST_Distance_Sphere (geom1 GEOMETRY, geom2 GEOMETRY)
DOUBLE ST_Distance_Sphere (point1 POINT_2D, point2 POINT_2D)
```

#### Description

Returns the haversine (great circle) distance between two geometries.

- Only supports POINT geometries.
- Returns the distance in meters.
- The input is expected to be in WGS84 (EPSG:4326) coordinates, using a [latitude, longitude] axis order.

----

### ST_Distance_Spheroid

#### Signature

```sql
DOUBLE ST_Distance_Spheroid (p1 POINT_2D, p2 POINT_2D)
```

#### Description

Returns the distance between two geometries in meters using an ellipsoidal model of the earths surface

The input geometry is assumed to be in the [EPSG:4326](https://en.wikipedia.org/wiki/World_Geodetic_System) coordinate system (WGS84), with [latitude, longitude] axis order and the distance limit is expected to be in meters. This function uses the [GeographicLib](https://geographiclib.sourceforge.io/) library to solve the [inverse geodesic problem](https://en.wikipedia.org/wiki/Geodesics_on_an_ellipsoid#Solution_of_the_direct_and_inverse_problems), calculating the distance between two points using an ellipsoidal model of the earth. This is a highly accurate method for calculating the distance between two arbitrary points taking the curvature of the earths surface into account, but is also the slowest.

#### Example

```sql
-- Note: the coordinates are in WGS84 and [latitude, longitude] axis order
-- Whats the distance between New York and Amsterdam (JFK and AMS airport)?
SELECT st_distance_spheroid(
st_point(40.6446, -73.7797),
st_point(52.3130, 4.7725)
);
----
5863418.7459356235
-- Roughly 5863km!
```

----

### ST_Length

#### Signatures

```sql
DOUBLE ST_Length (geom GEOMETRY)
DOUBLE ST_Length (linestring LINESTRING_2D)
```

#### Description

Returns the length of the input line geometry

----

### ST_Length_Spheroid

#### Signatures

```sql
DOUBLE ST_Length_Spheroid (geom GEOMETRY)
DOUBLE ST_Length_Spheroid (line LINESTRING_2D)
```

#### Description

Returns the length of the input geometry in meters, using an ellipsoidal model of the earth

The input geometry is assumed to be in the [EPSG:4326](https://en.wikipedia.org/wiki/World_Geodetic_System) coordinate system (WGS84), with [latitude, longitude] axis order and the length is returned in meters. This function uses the [GeographicLib](https://geographiclib.sourceforge.io/) library, calculating the length using an ellipsoidal model of the earth. This is a highly accurate method for calculating the length of a line geometry taking the curvature of the earth into account, but is also the slowest.

Returns `0.0` for any geometry that is not a `LINESTRING`, `MULTILINESTRING` or `GEOMETRYCOLLECTION` containing line geometries.

----

### ST_Perimeter

#### Signatures

```sql
DOUBLE ST_Perimeter (geom GEOMETRY)
DOUBLE ST_Perimeter (polygon POLYGON_2D)
DOUBLE ST_Perimeter (box BOX_2D)
```

#### Description

Returns the length of the perimeter of the geometry

----

### ST_Perimeter_Spheroid

#### Signatures

```sql
DOUBLE ST_Perimeter_Spheroid (geom GEOMETRY)
DOUBLE ST_Perimeter_Spheroid (poly POLYGON_2D)
```

#### Description

Returns the length of the perimeter in meters using an ellipsoidal model of the earths surface

The input geometry is assumed to be in the [EPSG:4326](https://en.wikipedia.org/wiki/World_Geodetic_System) coordinate system (WGS84), with [latitude, longitude] axis order and the length is returned in meters. This function uses the [GeographicLib](https://geographiclib.sourceforge.io/) library, calculating the perimeter using an ellipsoidal model of the earth. This is a highly accurate method for calculating the perimeter of a polygon taking the curvature of the earth into account, but is also the slowest.

Returns `0.0` for any geometry that is not a `POLYGON`, `MULTIPOLYGON` or `GEOMETRYCOLLECTION` containing polygon geometries.

----

### ST_Azimuth

#### Signatures

```sql
DOUBLE ST_Azimuth (origin GEOMETRY, target GEOMETRY)
DOUBLE ST_Azimuth (origin POINT_2D, target POINT_2D)
```

#### Description

Returns the azimuth (a clockwise angle measured from north) of two points in radian.

#### Example

```sql
SELECT degrees(ST_Azimuth(ST_Point(0, 0), ST_Point(0, 1)));
----
90.0
```

----

### ST_ClosestPoint

#### Signature

```sql
GEOMETRY ST_ClosestPoint (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns the point on geom1 that is closest to geom2. This is the first point of the shortest line between the two geometries.

> **New in v1.5.**

----

### ST_ShortestLine

#### Signature

```sql
GEOMETRY ST_ShortestLine (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns the shortest line between two geometries
