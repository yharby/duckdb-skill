# Spatial Functions — Predicates

Boolean functions that test spatial relationships between geometries.

---

### ST_Contains

#### Signatures

```sql
BOOLEAN ST_Contains (geom1 POLYGON_2D, geom2 POINT_2D)
BOOLEAN ST_Contains (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns true if the first geometry contains the second geometry

In contrast to `ST_ContainsProperly`, this function will also return true if `geom2` is contained strictly on the boundary of `geom1`.
A geometry always `ST_Contains` itself, but does not `ST_ContainsProperly` itself.

----

### ST_ContainsProperly

#### Signature

```sql
BOOLEAN ST_ContainsProperly (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns true if the first geometry "properly" contains the second geometry

In contrast to `ST_Contains`, this function does not return true if `geom2` is contained strictly on the boundary of `geom1`.
A geometry always `ST_Contains` itself, but does not `ST_ContainsProperly` itself.

----

### ST_CoveredBy

#### Signature

```sql
BOOLEAN ST_CoveredBy (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns true if geom1 is "covered by" geom2

----

### ST_Covers

#### Signature

```sql
BOOLEAN ST_Covers (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns true if the geom1 "covers" geom2

----

### ST_Crosses

#### Signature

```sql
BOOLEAN ST_Crosses (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns true if geom1 "crosses" geom2

----

### ST_DWithin

#### Signature

```sql
BOOLEAN ST_DWithin (geom1 GEOMETRY, geom2 GEOMETRY, distance DOUBLE)
```

#### Description

Returns if two geometries are within a target distance of each-other

----

### ST_DWithin_GEOS

#### Signature

```sql
BOOLEAN ST_DWithin_GEOS (geom1 GEOMETRY, geom2 GEOMETRY, distance DOUBLE)
```

#### Description

Returns if two geometries are within a target distance of each-other

----

### ST_DWithin_Spheroid

#### Signature

```sql
BOOLEAN ST_DWithin_Spheroid (p1 POINT_2D, p2 POINT_2D, distance DOUBLE)
```

#### Description

Returns if two POINT_2D's are within a target distance in meters, using an ellipsoidal model of the earths surface

The input geometry is assumed to be in the [EPSG:4326](https://en.wikipedia.org/wiki/World_Geodetic_System) coordinate system (WGS84), with [latitude, longitude] axis order and the distance is returned in meters. This function uses the [GeographicLib](https://geographiclib.sourceforge.io/) library to solve the [inverse geodesic problem](https://en.wikipedia.org/wiki/Geodesics_on_an_ellipsoid#Solution_of_the_direct_and_inverse_problems), calculating the distance between two points using an ellipsoidal model of the earth. This is a highly accurate method for calculating the distance between two arbitrary points taking the curvature of the earths surface into account, but is also the slowest.

----

### ST_Disjoint

#### Signature

```sql
BOOLEAN ST_Disjoint (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns true if the geometries are disjoint

----

### ST_Equals

#### Signature

```sql
BOOLEAN ST_Equals (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns true if the geometries are "equal"

----

### ST_Intersects

#### Signatures

```sql
BOOLEAN ST_Intersects (box1 BOX_2D, box2 BOX_2D)
BOOLEAN ST_Intersects (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns true if the geometries intersect

----

### ST_Intersects_Extent

#### Signature

```sql
BOOLEAN ST_Intersects_Extent (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns true if the extent of two geometries intersects

----

### ST_Overlaps

#### Signature

```sql
BOOLEAN ST_Overlaps (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns true if the geometries overlap

----

### ST_Touches

#### Signature

```sql
BOOLEAN ST_Touches (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns true if the geometries touch

----

### ST_Within

#### Signatures

```sql
BOOLEAN ST_Within (geom1 POINT_2D, geom2 POLYGON_2D)
BOOLEAN ST_Within (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns true if the first geometry is within the second

----

### ST_WithinProperly

#### Signature

```sql
BOOLEAN ST_WithinProperly (geom1 GEOMETRY, geom2 GEOMETRY)
```

#### Description

Returns true if the first geometry "properly" is contained by the second geometry

This function functions the same as `ST_ContainsProperly`, but the arguments are swapped.
