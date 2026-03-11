# Spatial Functions — Linear Referencing & M Values

Functions for interpolating points along lines, locating positions, and working with M (measure) values.

---

### ST_LineInterpolatePoint

#### Signature

```sql
GEOMETRY ST_LineInterpolatePoint (line GEOMETRY, fraction DOUBLE)
```

#### Description

Returns a point interpolated along a line at a fraction of total 2D length.

----

### ST_LineInterpolatePoints

#### Signature

```sql
GEOMETRY ST_LineInterpolatePoints (line GEOMETRY, fraction DOUBLE, repeat BOOLEAN)
```

#### Description

Returns a multi-point interpolated along a line at a fraction of total 2D length.

if repeat is false, the result is a single point, (and equivalent to ST_LineInterpolatePoint),
otherwise, the result is a multi-point with points repeated at the fraction interval.

----

### ST_LineLocatePoint

#### Signature

```sql
DOUBLE ST_LineLocatePoint (line GEOMETRY, point GEOMETRY)
```

#### Description

Returns the location on a line closest to a point as a fraction of the total 2D length of the line.

----

### ST_LineMerge

#### Signatures

```sql
GEOMETRY ST_LineMerge (geom GEOMETRY)
GEOMETRY ST_LineMerge (geom GEOMETRY, preserve_direction BOOLEAN)
```

#### Description

"Merges" the input line geometry, optionally taking direction into account.

----

### ST_LineSubstring

#### Signature

```sql
GEOMETRY ST_LineSubstring (line GEOMETRY, start_fraction DOUBLE, end_fraction DOUBLE)
```

#### Description

Returns a substring of a line between two fractions of total 2D length.

----

### ST_LocateAlong

#### Signatures

```sql
GEOMETRY ST_LocateAlong (line GEOMETRY, measure DOUBLE, offset DOUBLE)
GEOMETRY ST_LocateAlong (line GEOMETRY, measure DOUBLE)
```

#### Description

Returns a point or multi-point, containing the point(s) at the geometry with the given measure

For a LINESTRING, or MULTILINESTRING, the location is determined by interpolating between M values
For a POINT and MULTIPOINT, the point is returned if the measure matches the M value of the vertex, otherwise an empty geometry is returned
For a POLYGON, only the exterior ring is considered, and treated as a LINESTRING

If offset is provided, the resulting point(s) is offset by the given amount perpendicular to the line direction.

----

### ST_LocateBetween

#### Signatures

```sql
GEOMETRY ST_LocateBetween (line GEOMETRY, start_measure DOUBLE, end_measure DOUBLE, offset DOUBLE)
GEOMETRY ST_LocateBetween (line GEOMETRY, start_measure DOUBLE, end_measure DOUBLE)
```

#### Description

Returns a geometry or geometry collection created by filtering and interpolating vertices within a range of "M" values

Creates a geometry or geometry collection, containing the parts formed by vertices that have an "M" value within the "start_measure" and "end_measure" range

For LINESTRING or MULTILINESTRING, if a line segment would cross either the upper or lower bound, a vertex is added by interpolating the coordinates at the "intersection"
For a POINT and MULTIPOINT, the point is added to the collection if its vertex has an "M" value within the range, otherwise it is skipped
For a POLYGON, only the exterior ring is considered, and treated like a LINESTRING

If offset is provided, the resulting vertices are offset by the given amount perpendicular to the line direction.

----

### ST_InterpolatePoint

#### Signature

```sql
DOUBLE ST_InterpolatePoint (line GEOMETRY, point GEOMETRY)
```

#### Description

Computes the closest point on a LINESTRING to a given POINT and returns the interpolated M value of that point.

First argument must be a linestring and must have a M dimension. The second argument must be a point.
Neither argument can be empty.

----

### ST_LineString2DFromWKB

#### Signature

```sql
GEOMETRY ST_LineString2DFromWKB (linestring LINESTRING_2D)
```

#### Description

Deserialize a LINESTRING_2D from a WKB encoded blob

----

### ST_Polygon2DFromWKB

#### Signature

```sql
GEOMETRY ST_Polygon2DFromWKB (polygon POLYGON_2D)
```

#### Description

Deserialize a POLYGON_2D from a WKB encoded blob

----

### ST_Point2DFromWKB

#### Signature

```sql
GEOMETRY ST_Point2DFromWKB (point POINT_2D)
```

#### Description

Deserialize a POINT_2D from a WKB encoded blob
