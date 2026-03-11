# Spatial Index Extensions — Overview & Comparison

Three community extensions provide spatial indexing in DuckDB. This page helps choose the right one — see individual ref files for full API details.

## Quick Comparison

| Property | H3 | A5 | S2 (geography) |
|----------|-----|-----|-----------------|
| Grid shape | Hexagons (+12 pentagons) | Pentagons (all) | Quadrilaterals |
| Equal area? | Approximate | **Exact (OGC DGGS)** | No |
| Resolutions | 16 (0-15) | **31 (0-30)** | **31 (0-30)** |
| Finest cell | ~1.1 m² | ~0.03 mm² | ~2 cm² |
| Children/cell | 7 | 4 | 4 |
| Geometry ops? | No (index only) | No (index only) | **Yes (full spherical)** |
| Best for | Analytics, tiling, visualization | Equal-area aggregation, DGGS compliance | Geodesic operations, BigQuery compat |

## H3 vs Quadkey vs QUADBIN

| Property | H3 | Quadkey | QUADBIN |
|----------|-----|---------|---------|
| Grid shape | Hexagons | Squares | Squares |
| Neighbors | 6 (uniform) | 8 (non-uniform) | 8 (non-uniform) |
| Area distortion | Minimal (icosahedron) | High at poles | High at poles |
| Encoding | 64-bit integer | Variable-length string | 64-bit integer |
| Best for | Analytics, equal-area | Tile serving, prefix queries | Tile serving, SQL range scans |

## When to Use What

- **H3** — Best for spatial aggregation and analytics. Hexagons have uniform neighbor distance. Largest ecosystem and tooling support. See `refs/h3.md` for 60+ functions.
- **A5** — When you need mathematically exact equal-area cells (regulatory, environmental monitoring). OGC DGGS compliant. See `refs/a5.md` for all 11 functions.
- **S2/Geography** — When you need actual spherical geometry operations (geodesic distance, area, boolean ops). Same library as BigQuery Geography. See `refs/spatial/a5-s2.md` for full S2 API.

## Quick Setup

```sql
-- H3
INSTALL h3 FROM community; LOAD h3;
SELECT h3_latlng_to_cell(40.7128, -74.0060, 7) AS cell;

-- A5
INSTALL a5 FROM community; LOAD a5;
SELECT a5_lonlat_to_cell(-74.0060, 40.7128, 15) AS cell;

-- S2/Geography
INSTALL geography FROM community; LOAD geography;
SELECT s2_distance(s2_data_city('Vancouver'), s2_data_city('Toronto'));
```
