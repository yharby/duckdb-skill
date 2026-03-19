# Spatial Function Reference — Index

> **Includes**: DuckDB spatial extension (ST_* functions), v1.5 core geometry functions, A5 pentagonal index, S2/Geography spherical geometry.
>
> **How to use**: Find the function you need in the index tables below, then read the corresponding sub-file for full signatures, descriptions, and examples.

## Quick Navigation

| Topic | File | Key Functions |
|-------|------|---------------|
| Conversion & I/O | `spatial/conversion-io.md` | ST_AsGeoJSON, ST_AsText, ST_AsWKB, ST_AsHEXWKB, ST_AsMVTGeom, ST_AsSVG, ST_GeomFromGeoJSON, ST_GeomFromText, ST_GeomFromWKB, ST_GeomFromHEXWKB, ST_GeometryType, GEOMETRY casting |
| Geometry Creation | `spatial/creation.md` | ST_Point, ST_Point2D/3D/4D, ST_MakePoint, ST_MakeLine, ST_MakePolygon, ST_MakeBox2D, ST_MakeEnvelope, ST_Collect, ST_Multi, ST_BuildArea |
| Predicates | `spatial/predicates.md` | ST_Contains, ST_ContainsProperly, ST_CoveredBy, ST_Covers, ST_Crosses, ST_Disjoint, ST_DWithin, ST_Equals, ST_Intersects, ST_Overlaps, ST_Touches, ST_Within, ST_WithinProperly |
| Measurement | `spatial/measurement.md` | ST_Area, ST_Distance, ST_Length, ST_Perimeter (+ _Spheroid/_Sphere variants), ST_Azimuth, ST_ClosestPoint, ST_ShortestLine |
| Transforms | `spatial/transforms.md` | ST_Transform, ST_Affine, ST_Buffer, ST_Simplify, ST_ReducePrecision, ST_FlipCoordinates, ST_Force2D/3D/4D, ST_MakeValid, ST_Centroid, ST_ConvexHull, ST_ConcaveHull, ST_Envelope, ST_Boundary, ST_Difference, ST_Intersection, ST_Union, ST_VoronoiDiagram, ST_Hilbert, ST_Node |
| Accessors | `spatial/accessors.md` | ST_X/Y/Z/M, ST_HasM/Z, ST_ZMFlag, ST_XMax/XMin/YMax/YMin/ZMax/ZMin/MMax/MMin, ST_Dimension, ST_NPoints, ST_NGeometries, ST_ExteriorRing, ST_InteriorRingN, ST_PointN, ST_Points, ST_IsClosed/IsEmpty/IsRing/IsSimple/IsValid, ST_Extent, ST_Dump, ST_CollectionExtract, ST_Polygonize |
| Linear Referencing | `spatial/linear-ref.md` | ST_LineInterpolatePoint(s), ST_LineLocatePoint, ST_LineMerge, ST_LineSubstring, ST_LocateAlong, ST_LocateBetween, ST_InterpolatePoint, ST_*2DFromWKB |
| Coverage & Tiling | `spatial/coverage-tiling.md` | ST_CoverageInvalidEdges, ST_CoverageSimplify, ST_CoverageUnion, ST_TileEnvelope, ST_QuadKey |
| Aggregates | `spatial/aggregates.md` | ST_AsMVT, ST_Union_Agg, ST_MemUnion_Agg, ST_Extent_Agg, ST_Envelope_Agg, ST_Intersection_Agg, ST_Coverage*_Agg |
| Macros | `spatial/macros.md` | ST_Rotate, ST_RotateX/Y/Z, ST_Scale, ST_TransScale, ST_Translate |
| Table Functions | `spatial/table-functions.md` | ST_Read, ST_ReadOSM, ST_ReadSHP, ST_Read_Meta, ST_Drivers, ST_GeneratePoints |
| Core v1.5 (no ext) | `spatial/core-v15.md` | &&, ST_GeomFromWKB (core), ST_CRS, ST_SetCRS, GEOMETRY casting |
| A5 & S2 | `spatial/a5-s2.md` | a5_lonlat_to_cell, a5_cell_to_*, s2_area, s2_distance, s2_contains, s2_intersection, GEOGRAPHY type |

## Utility Functions

| Function | Summary |
| --- | --- |
| `DuckDB_PROJ_Compiled_Version` | Returns the PROJ library version compiled against |
| `DuckDB_Proj_Version` | Returns the PROJ library version in use |

## Scalar Function Index

| Function | Summary |
| --- | --- |
| [`ST_Affine`](#) | Applies an affine transformation to a geometry. |
| [`ST_Area`](#) | Compute the area of a geometry. |
| [`ST_Area_Spheroid`](#) | Returns the area of a geometry in meters, using an ellipsoidal model of the earth |
| [`ST_AsGeoJSON`](#) | Returns the geometry as a GeoJSON fragment |
| [`ST_AsHEXWKB`](#) | Returns the geometry as a HEXWKB string |
| [`ST_AsMVTGeom`](#) | Transform and clip geometry to a tile boundary |
| [`ST_AsSVG`](#) | Convert the geometry into a SVG fragment or path |
| [`ST_AsText`](#) | Returns the geometry as a WKT string |
| [`ST_AsWKB`](#) | Returns the geometry as a WKB (Well-Known-Binary) blob |
| [`ST_Azimuth`](#) | Returns the azimuth (a clockwise angle measured from north) of two points in radian. |
| [`ST_Boundary`](#) | Returns the "boundary" of a geometry |
| [`ST_Buffer`](#) | Returns a buffer around the input geometry at the target distance |
| [`ST_BuildArea`](#) | Creates a polygonal geometry by attemtping to "fill in" the input geometry. |
| [`ST_Centroid`](#) | Returns the centroid of a geometry |
| [`ST_Collect`](#) | Collects a list of geometries into a collection geometry. |
| [`ST_CollectionExtract`](#) | Extracts geometries from a GeometryCollection into a typed multi geometry. |
| [`ST_ConcaveHull`](#) | Returns the concave hull of the input geometry. |
| [`ST_Contains`](#) | Returns true if the first geometry contains the second geometry |
| [`ST_ContainsProperly`](#) | Returns true if the first geometry "properly" contains the second geometry |
| [`ST_ConvexHull`](#) | Returns the convex hull enclosing the geometry |
| [`ST_CoverageInvalidEdges`](#) | Returns the invalid edges in a polygonal coverage. |
| [`ST_CoverageSimplify`](#) | Simplify the edges in a polygonal coverage. |
| [`ST_CoverageUnion`](#) | Union all geometries in a polygonal coverage into a single geometry. |
| [`ST_CoveredBy`](#) | Returns true if geom1 is "covered by" geom2 |
| [`ST_Covers`](#) | Returns true if the geom1 "covers" geom2 |
| [`ST_Crosses`](#) | Returns true if geom1 "crosses" geom2 |
| [`ST_DWithin`](#) | Returns if two geometries are within a target distance of each-other |
| [`ST_DWithin_GEOS`](#) | Returns if two geometries are within a target distance of each-other |
| [`ST_DWithin_Spheroid`](#) | Returns if two POINT_2D's are within a target distance in meters, using an ellipsoidal model |
| [`ST_Difference`](#) | Returns the "difference" between two geometries |
| [`ST_Dimension`](#) | Returns the "topological dimension" of a geometry. |
| [`ST_Disjoint`](#) | Returns true if the geometries are disjoint |
| [`ST_Distance`](#) | Returns the planar distance between two geometries |
| [`ST_Distance_GEOS`](#) | Returns the planar distance between two geometries |
| [`ST_Distance_Sphere`](#) | Returns the haversine (great circle) distance between two geometries. |
| [`ST_Distance_Spheroid`](#) | Returns the distance between two geometries in meters using an ellipsoidal model |
| [`ST_Dump`](#) | Dumps a geometry into a list of sub-geometries and their "path". |
| [`ST_EndPoint`](#) | Returns the end point of a LINESTRING. |
| [`ST_Envelope`](#) | Returns the minimum bounding rectangle of a geometry as a polygon |
| [`ST_Equals`](#) | Returns true if the geometries are "equal" |
| [`ST_Extent`](#) | Returns the minimal bounding box enclosing the input geometry |
| [`ST_Extent_Approx`](#) | Returns the approximate bounding box of a geometry. |
| [`ST_ExteriorRing`](#) | Returns the exterior ring (shell) of a polygon geometry. |
| [`ST_FlipCoordinates`](#) | Returns a new geometry with x = y and y = x |
| [`ST_Force2D`](#) | Forces the vertices of a geometry to have X and Y components |
| [`ST_Force3DM`](#) | Forces the vertices of a geometry to have X, Y and M components |
| [`ST_Force3DZ`](#) | Forces the vertices of a geometry to have X, Y and Z components |
| [`ST_Force4D`](#) | Forces the vertices of a geometry to have X, Y, Z and M components |
| [`ST_GeomFromGeoJSON`](#) | Deserializes a GEOMETRY from a GeoJSON fragment. |
| [`ST_GeomFromHEXEWKB`](#) | Deserialize a GEOMETRY from a HEX(E)WKB encoded string |
| [`ST_GeomFromHEXWKB`](#) | Deserialize a GEOMETRY from a HEX(E)WKB encoded string |
| [`ST_GeomFromText`](#) | Deserialize a GEOMETRY from a WKT encoded string |
| [`ST_GeomFromWKB`](#) | Deserializes a GEOMETRY from a WKB encoded blob |
| [`ST_GeometryType`](#) | Returns a GEOMETRY_TYPE enum identifying the input geometry type. |
| [`ST_HasM`](#) | Check if the input geometry has M values. |
| [`ST_HasZ`](#) | Check if the input geometry has Z values. |
| [`ST_Hilbert`](#) | Encodes the X and Y values as the hilbert curve index. |
| [`ST_InterpolatePoint`](#) | Returns the interpolated M value at the closest point on a LINESTRING. |
| [`ST_Intersection`](#) | Returns the intersection of two geometries |
| [`ST_Intersects`](#) | Returns true if the geometries intersect |
| [`ST_Intersects_Extent`](#) | Returns true if the extent of two geometries intersects |
| [`ST_IsClosed`](#) | Check if a geometry is 'closed' |
| [`ST_IsEmpty`](#) | Returns true if the geometry is "empty". |
| [`ST_IsRing`](#) | Returns true if the geometry is a ring. |
| [`ST_IsSimple`](#) | Returns true if the geometry is simple |
| [`ST_IsValid`](#) | Returns true if the geometry is valid |
| [`ST_Length`](#) | Returns the length of the input line geometry |
| [`ST_Length_Spheroid`](#) | Returns the length of the input geometry in meters, using an ellipsoidal model |
| [`ST_LineInterpolatePoint`](#) | Returns a point interpolated along a line at a fraction of total 2D length. |
| [`ST_LineInterpolatePoints`](#) | Returns a multi-point interpolated along a line. |
| [`ST_LineLocatePoint`](#) | Returns the location on a line closest to a point as a fraction. |
| [`ST_LineMerge`](#) | Merges the input line geometry. |
| [`ST_LineString2DFromWKB`](#) | Deserialize a LINESTRING_2D from a WKB encoded blob |
| [`ST_LineSubstring`](#) | Returns a substring of a line between two fractions. |
| [`ST_LocateAlong`](#) | Returns point(s) at the geometry with the given measure |
| [`ST_LocateBetween`](#) | Returns geometry filtered by a range of M values |
| [`ST_M`](#) | Returns the M coordinate of a point geometry |
| [`ST_MMax`](#) | Returns the maximum M coordinate of a geometry |
| [`ST_MMin`](#) | Returns the minimum M coordinate of a geometry |
| [`ST_MakeBox2D`](#) | Create a BOX2D from two POINT geometries |
| [`ST_MakeEnvelope`](#) | Create a rectangular polygon from min/max coordinates |
| [`ST_MakeLine`](#) | Create a LINESTRING from a list of POINT geometries |
| [`ST_MakePoint`](#) | Creates a GEOMETRY point from floating point numbers. |
| [`ST_MakePolygon`](#) | Create a POLYGON from a LINESTRING shell |
| [`ST_MakeValid`](#) | Returns a valid representation of the geometry |
| [`ST_MaximumInscribedCircle`](#) | Returns the maximum inscribed circle of the input geometry. |
| [`ST_MinimumRotatedRectangle`](#) | Returns the minimum rotated rectangle bounding the geometry. |
| [`ST_Multi`](#) | Turns a single geometry into a multi geometry. |
| [`ST_NGeometries`](#) | Returns the number of component geometries in a collection. |
| [`ST_NInteriorRings`](#) | Returns the number of interior rings of a polygon |
| [`ST_NPoints`](#) | Returns the number of vertices within a geometry |
| [`ST_Node`](#) | Returns a noded MultiLinestring. |
| [`ST_Normalize`](#) | Returns the "normalized" representation of the geometry |
| [`ST_NumGeometries`](#) | Returns the number of component geometries in a collection. |
| [`ST_NumInteriorRings`](#) | Returns the number of interior rings of a polygon |
| [`ST_NumPoints`](#) | Returns the number of vertices within a geometry |
| [`ST_Overlaps`](#) | Returns true if the geometries overlap |
| [`ST_Perimeter`](#) | Returns the length of the perimeter of the geometry |
| [`ST_Perimeter_Spheroid`](#) | Returns the perimeter in meters using an ellipsoidal model |
| [`ST_Point`](#) | Creates a GEOMETRY point |
| [`ST_Point2D`](#) | Creates a POINT_2D |
| [`ST_Point2DFromWKB`](#) | Deserialize a POINT_2D from a WKB encoded blob |
| [`ST_Point3D`](#) | Creates a POINT_3D |
| [`ST_Point4D`](#) | Creates a POINT_4D |
| [`ST_PointN`](#) | Returns the n'th vertex from the input geometry as a point |
| [`ST_PointOnSurface`](#) | Returns a point guaranteed to lie on the surface |
| [`ST_Points`](#) | Collects all the vertices in the geometry into a MULTIPOINT |
| [`ST_Polygon2DFromWKB`](#) | Deserialize a POLYGON_2D from a WKB encoded blob |
| [`ST_Polygonize`](#) | Returns a polygonized representation of the input geometries |
| [`ST_QuadKey`](#) | Compute the quadkey for a given lon/lat point at a given level. |
| [`ST_ReducePrecision`](#) | Returns the geometry with all vertices reduced to the given precision |
| [`ST_RemoveRepeatedPoints`](#) | Remove repeated points from a LINESTRING. |
| [`ST_Reverse`](#) | Returns the geometry with the order of its vertices reversed |
| [`ST_ShortestLine`](#) | Returns the shortest line between two geometries |
| [`ST_Simplify`](#) | Returns a simplified version of the geometry |
| [`ST_SimplifyPreserveTopology`](#) | Returns a simplified version that preserves topology |
| [`ST_StartPoint`](#) | Returns the start point of a LINESTRING. |
| [`ST_TileEnvelope`](#) | Generates tile envelope polygons from zoom level and tile indices. |
| [`ST_Touches`](#) | Returns true if the geometries touch |
| [`ST_Transform`](#) | Transforms a geometry between two coordinate systems |
| [`ST_Union`](#) | Returns the union of two geometries |
| [`ST_VoronoiDiagram`](#) | Returns the Voronoi diagram of the supplied MultiPoint geometry |
| [`ST_Within`](#) | Returns true if the first geometry is within the second |
| [`ST_WithinProperly`](#) | Returns true if first geometry "properly" is within second |
| [`ST_X`](#) | Returns the X coordinate of a point geometry |
| [`ST_XMax`](#) | Returns the maximum X coordinate of a geometry |
| [`ST_XMin`](#) | Returns the minimum X coordinate of a geometry |
| [`ST_Y`](#) | Returns the Y coordinate of a point geometry |
| [`ST_YMax`](#) | Returns the maximum Y coordinate of a geometry |
| [`ST_YMin`](#) | Returns the minimum Y coordinate of a geometry |
| [`ST_Z`](#) | Returns the Z coordinate of a point geometry |
| [`ST_ZMFlag`](#) | Returns a flag indicating the presence of Z and M values. |
| [`ST_ZMax`](#) | Returns the maximum Z coordinate of a geometry |
| [`ST_ZMin`](#) | Returns the minimum Z coordinate of a geometry |

## Aggregate Function Index

| Function | Summary |
| --- | --- |
| [`ST_AsMVT`](#) | Make a Mapbox Vector Tile from a set of geometries and properties |
| [`ST_CoverageInvalidEdges_Agg`](#) | Returns the invalid edges of a coverage geometry |
| [`ST_CoverageSimplify_Agg`](#) | Simplifies a set of geometries while maintaining coverage |
| [`ST_CoverageUnion_Agg`](#) | Unions a set of geometries while maintaining coverage |
| [`ST_Envelope_Agg`](#) | Alias for ST_Extent_Agg. |
| [`ST_Extent_Agg`](#) | Computes the minimal-bounding-box polygon containing the set of input geometries |
| [`ST_Intersection_Agg`](#) | Computes the intersection of a set of geometries |
| [`ST_MemUnion_Agg`](#) | Computes the union of a set of input geometries. |
| [`ST_Union_Agg`](#) | Computes the union of a set of input geometries |

## Macro Function Index

| Function | Summary |
| --- | --- |
| [`ST_Rotate`](#) | Alias of ST_RotateZ |
| [`ST_RotateX`](#) | Rotates a geometry around the X axis. |
| [`ST_RotateY`](#) | Rotates a geometry around the Y axis. |
| [`ST_RotateZ`](#) | Rotates a geometry around the Z axis. |
| [`ST_Scale`](#) | Scales a geometry. |
| [`ST_TransScale`](#) | Translates and then scales a geometry. |
| [`ST_Translate`](#) | Translates a geometry. |

## Table Function Index

| Function | Summary |
| --- | --- |
| [`ST_Drivers`](#) | Returns the list of supported GDAL drivers and file formats |
| [`ST_GeneratePoints`](#) | Generates a set of random points within the specified bounding box. |
| [`ST_Read`](#) | Read and import a variety of geospatial file formats using the GDAL library. |
| [`ST_ReadOSM`](#) | Read compressed OpenStreetMap data from `.osm.pbf` files. |
| [`ST_ReadSHP`](#) | Read a Shapefile without relying on the GDAL library |
| [`ST_Read_Meta`](#) | Read the metadata from geospatial file formats using the GDAL library. |
