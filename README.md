# DuckDB Skill for Claude Code

A comprehensive Claude Code skill for DuckDB v1.5 — spatial/GIS, GeoParquet, Overture Maps, DuckLake, and more.

## What's Included

- **DuckDB v1.5.0** core features, breaking changes, and Friendly SQL
- **Spatial** — 155+ ST_* functions, CRS, geometry shredding, R-Tree indexes
- **GeoParquet** — native Parquet geometry, `GEOPARQUET_VERSION` options (V1/V2/BOTH/NONE)
- **Overture Maps** — latest release paths (S3/Azure), all 6 themes, bbox filtering
- **DuckLake** — lakehouse setup, time travel, partitioning, ACID, spatial support
- **H3 / A5 / S2** — hexagonal, pentagonal, and spherical spatial indexing
- **Extensions** — FTS (BM25), VSS (HNSW vector search), GDAL formats, WASM patterns
- **Raster** — RASTER type, RaQuet, Pyramid GeoParquet
- **Common pitfalls** — sourced from real GitHub issues

## Install

### One-liner

```bash
git clone https://github.com/yharby/duckdb-skill.git ~/.claude/skills/duckdb-skill
```

### Or step by step

```bash
git clone https://github.com/yharby/duckdb-skill.git
cp -r duckdb-skill ~/.claude/skills/duckdb-skill
```

### Update

```bash
cd ~/.claude/skills/duckdb-skill && git pull
```

That's it. The skill activates automatically when you mention DuckDB, spatial queries, GeoParquet, Overture Maps, or related topics in Claude Code.

## File Structure

```
duckdb-skill/
├── SKILL.md                    # Main skill (loaded when triggered)
└── refs/                       # Deep-dive references (loaded on demand)
    ├── spatial/                # 155+ ST_* functions split by category
    │   ├── index.md            #   Function index (read first)
    │   ├── predicates.md       #   ST_Intersects, ST_Contains, ...
    │   ├── measurement.md      #   ST_Distance, ST_Area, ...
    │   ├── transforms.md       #   ST_Transform, ST_Buffer, ...
    │   ├── creation.md         #   ST_Point, ST_MakeLine, ...
    │   ├── accessors.md        #   ST_X, ST_Y, ST_IsValid, ...
    │   ├── conversion-io.md    #   ST_AsGeoJSON, ST_GeomFromText, ...
    │   ├── aggregates.md       #   ST_Union_Agg, ST_AsMVT, ...
    │   ├── coverage-tiling.md  #   ST_Coverage*, ST_TileEnvelope
    │   ├── linear-ref.md       #   ST_LineInterpolatePoint, ...
    │   ├── table-functions.md  #   ST_Read, ST_ReadOSM, ST_Drivers
    │   ├── macros.md           #   ST_Rotate, ST_Scale, ST_Translate
    │   ├── core-v15.md         #   Built-in functions (no ext needed)
    │   └── a5-s2.md            #   A5 + S2/Geography extensions
    ├── gdal-formats.md         # GPKG, Shapefile, GeoJSON, Overture Maps
    ├── ducklake.md             # DuckLake lakehouse
    ├── h3.md                   # H3 hexagonal indexing (60+ functions)
    ├── a5.md                   # A5 pentagonal indexing
    ├── spatial-indexes.md      # H3 vs A5 vs S2 comparison
    ├── fts.md                  # Full-text search (BM25)
    ├── vss.md                  # Vector similarity (HNSW)
    ├── raster-tiling.md        # RASTER type, RaQuet, Pyramid
    ├── wasm-patterns.md        # DuckDB-WASM browser patterns
    ├── summarize.md            # SUMMARIZE command
    └── autocomplete.md         # SQL auto-complete
```

## License

[MIT](LICENSE)
