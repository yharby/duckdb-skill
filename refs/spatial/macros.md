# Spatial Functions — Macros

Shorthand macro functions built on top of ST_Affine for common geometric transformations.

---

### ST_Rotate

#### Signature

```sql
GEOMETRY ST_Rotate (geom GEOMETRY, radians double)
```

#### Description

Alias of ST_RotateZ

----

### ST_RotateX

#### Signature

```sql
GEOMETRY ST_RotateX (geom GEOMETRY, radians double)
```

#### Description

Rotates a geometry around the X axis. This is a shorthand macro for calling ST_Affine.

#### Example

```sql
-- Rotate a 3D point 90 degrees (pi/2 radians) around the X-axis
SELECT ST_RotateX(ST_GeomFromText('POINT Z(0 1 0)'), pi()/2);
----
POINT Z (0 0 1)
```

----

### ST_RotateY

#### Signature

```sql
GEOMETRY ST_RotateY (geom GEOMETRY, radians double)
```

#### Description

Rotates a geometry around the Y axis. This is a shorthand macro for calling ST_Affine.

#### Example

```sql
-- Rotate a 3D point 90 degrees (pi/2 radians) around the Y-axis
SELECT ST_RotateY(ST_GeomFromText('POINT Z(1 0 0)'), pi()/2);
----
POINT Z (0 0 -1)
```

----

### ST_RotateZ

#### Signature

```sql
GEOMETRY ST_RotateZ (geom GEOMETRY, radians double)
```

#### Description

Rotates a geometry around the Z axis. This is a shorthand macro for calling ST_Affine.

#### Example

```sql
-- Rotate a point 90 degrees (pi/2 radians) around the Z-axis
SELECT ST_RotateZ(ST_Point(1, 0), pi()/2);
----
POINT (0 1)
```

----

### ST_Scale

#### Signatures

```sql
GEOMETRY ST_Scale (geom GEOMETRY, xs double, ys double, zs double)
GEOMETRY ST_Scale (geom GEOMETRY, xs double, ys double)
```

----

### ST_TransScale

#### Signature

```sql
GEOMETRY ST_TransScale (geom GEOMETRY, dx double, dy double, xs double, ys double)
```

#### Description

Translates and then scales a geometry in X and Y direction. This is a shorthand macro for calling ST_Affine.

#### Example

```sql
-- Translate by (1, 2) then scale by (2, 3)
SELECT ST_TransScale(ST_Point(1, 1), 1, 2, 2, 3);
----
POINT (4 9)
```

----

### ST_Translate

#### Signatures

```sql
GEOMETRY ST_Translate (geom GEOMETRY, dx double, dy double, dz double)
GEOMETRY ST_Translate (geom GEOMETRY, dx double, dy double)
```
