# Spatial Functions — Coverage, Tiling & MVT

Functions for polygonal coverage operations, tile envelope generation, and quadkey computation.

---

### ST_CoverageInvalidEdges

#### Signatures

```sql
GEOMETRY ST_CoverageInvalidEdges (geoms GEOMETRY[], tolerance DOUBLE)
GEOMETRY ST_CoverageInvalidEdges (geoms GEOMETRY[])
```

#### Description

Returns the invalid edges in a polygonal coverage, which are edges that are not shared by two polygons.
Returns NULL if the input is not a polygonal coverage, or if the input is valid.
Tolerance is 0 by default.

----

### ST_CoverageSimplify

#### Signatures

```sql
GEOMETRY ST_CoverageSimplify (geoms GEOMETRY[], tolerance DOUBLE, simplify_boundary BOOLEAN)
GEOMETRY ST_CoverageSimplify (geoms GEOMETRY[], tolerance DOUBLE)
```

#### Description

Simplify the edges in a polygonal coverage, preserving the coverange by ensuring that the there are no seams between the resulting simplified polygons.

By default, the boundary of the coverage is also simplified, but this can be controlled with the optional third 'simplify_boundary' parameter.

----

### ST_CoverageUnion

#### Signature

```sql
GEOMETRY ST_CoverageUnion (geoms GEOMETRY[])
```

#### Description

Union all geometries in a polygonal coverage into a single geometry.
This may be faster than using `ST_Union`, but may use more memory.

----

### ST_TileEnvelope

#### Signature

```sql
GEOMETRY ST_TileEnvelope (tile_zoom INTEGER, tile_x INTEGER, tile_y INTEGER)
```

#### Description

The `ST_TileEnvelope` scalar function generates tile envelope rectangular polygons from specified zoom level and tile indices.

This is used in MVT generation to select the features corresponding to the tile extent. The envelope is in the Web Mercator
coordinate reference system (EPSG:3857). The tile pyramid starts at zoom level 0, corresponding to a single tile for the
world. Each zoom level doubles the number of tiles in each direction, such that zoom level 1 is 2 tiles wide by 2 tiles high,
zoom level 2 is 4 tiles wide by 4 tiles high, and so on. Tile indices start at `[x=0, y=0]` at the top left, and increase
down and right. For example, at zoom level 2, the top right tile is `[x=3, y=0]`, the bottom left tile is `[x=0, y=3]`, and
the bottom right is `[x=3, y=3]`.

#### Example

```sql
SELECT ST_TileEnvelope(2, 3, 1);
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         st_tileenvelope(2, 3, 1)                                          │
│                                                 geometry                                                  │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ POLYGON ((1.00188E+07 0, 1.00188E+07 1.00188E+07, 2.00375E+07 1.00188E+07, 2.00375E+07 0, 1.00188E+07 0)) │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

----

### ST_QuadKey

#### Signatures

```sql
VARCHAR ST_QuadKey (longitude DOUBLE, latitude DOUBLE, level INTEGER)
VARCHAR ST_QuadKey (point GEOMETRY, level INTEGER)
```

#### Description

Compute the [quadkey](https://learn.microsoft.com/en-us/bingmaps/articles/bing-maps-tile-system) for a given lon/lat point at a given level.
Note that the parameter order is __longitude__, __latitude__.

`level` has to be between 1 and 23, inclusive.

The input coordinates will be clamped to the lon/lat bounds of the earth (longitude between -180 and 180, latitude between -85.05112878 and 85.05112878).

The geometry overload throws an error if the input geometry is not a `POINT`

#### Example

```sql
SELECT ST_QuadKey(st_point(11.08, 49.45), 10);
----
1333203202
```
