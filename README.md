# DuckDB Skill for AI Agents

A comprehensive Agent Skill for DuckDB v1.5 — spatial/GIS, GeoParquet, Overture Maps, DuckLake, and more.

**Compatible with 30+ AI coding tools** via the [AgentSkills.io](https://agentskills.io) open standard.

## What's Included

- **DuckDB v1.5.0** core features, breaking changes, and Friendly SQL
- **Discovery workflow** — Phase 1 (discover), Phase 2 (understand), Phase 3 (analyze)
- **Query profiling** — EXPLAIN ANALYZE for troubleshooting complex or failing queries
- **CRS detection** — GeoParquet metadata, plain Parquet WKB, GDAL-format files
- **Spatial** — 155+ ST_* functions, CRS, geometry shredding, R-Tree indexes
- **Core GEOMETRY type** — built-in (no extension) WKT cast, `&&` operator, ST_CRS, ST_SetCRS, ST_GeomFromWKB
- **GeoParquet** — native Parquet geometry, `GEOPARQUET_VERSION` options (V1/V2/BOTH/NONE)
- **Overture Maps** — latest release paths (S3/Azure), all 6 themes, bbox filtering
- **DuckLake** — lakehouse setup, time travel, partitioning, ACID, spatial support
- **H3 / A5 / S2** — hexagonal, pentagonal, and spherical spatial indexing
- **Extensions** — FTS (BM25), VSS (HNSW vector search), GDAL formats, WASM patterns
- **Raster** — RASTER type, RaQuet, Pyramid GeoParquet
- **VARIANT type** — semi-structured data with typed binary representation
- **Python API** — connection patterns, Arrow export, v1.5 migration guide
- **BigQuery connector** — query Google BigQuery from DuckDB, GEOGRAPHY/GEOMETRY mapping, authentication, incubating scan, performance tuning
- **Apache Iceberg** — read/write Iceberg tables, REST catalog integration (Polaris, Lakekeeper, AWS Glue, S3 Tables, BigLake), time travel, partition pruning, schema evolution
- **Common pitfalls** — sourced from real GitHub issues

## Install

> **💡 About Agent Skills**: This skill follows the [AgentSkills.io](https://agentskills.io) open standard, making it compatible with **30+ AI coding tools** including Claude Code, Cursor, Windsurf, VS Code Copilot, GitHub Copilot, OpenAI Codex, and many more.

### Quick Start (Universal)

**For most AI coding tools** that support the AgentSkills.io standard:

```bash
# Clone the skill
git clone https://github.com/yharby/duckdb-skill.git

# Install to your preferred location:

# Option 1: User-level (works across all projects)
mkdir -p ~/.claude/skills && cp -r duckdb-skill ~/.claude/skills/
# OR: mkdir -p ~/.agents/skills && cp -r duckdb-skill ~/.agents/skills/

# Option 2: Project-level (specific to current project)
mkdir -p .claude/skills && cp -r duckdb-skill .claude/skills/
# OR: mkdir -p .agents/skills && cp -r duckdb-skill .agents/skills/
```

The skill activates automatically when you mention DuckDB, spatial queries, GeoParquet, Overture Maps, or related topics.

**Update:**
```bash
cd ~/.claude/skills/duckdb-skill && git pull
```

### Platform-Specific Instructions

<details>
<summary><b>Claude Code</b></summary>

```bash
git clone https://github.com/yharby/duckdb-skill.git ~/.claude/skills/duckdb-skill
```

Or project-specific:
```bash
git clone https://github.com/yharby/duckdb-skill.git .claude/skills/duckdb-skill
```

**Update:** `cd ~/.claude/skills/duckdb-skill && git pull`

📚 [Claude Code Skills Docs](https://code.claude.com/docs/en/skills)
</details>

<details>
<summary><b>VS Code / GitHub Copilot</b></summary>

**Supported locations:**
- Project: `.github/skills/`, `.claude/skills/`, `.agents/skills/`
- Personal: `~/.copilot/skills/`, `~/.claude/skills/`, `~/.agents/skills/`

```bash
# Clone the skill
git clone https://github.com/yharby/duckdb-skill.git

# Install (choose one):
# Project-level
mkdir -p .agents/skills && cp -r duckdb-skill .agents/skills/

# User-level
mkdir -p ~/.copilot/skills && cp -r duckdb-skill ~/.copilot/skills/
```

Access with `/duckdb-skill` or `/duckdb` in Copilot chat.

📚 [VS Code Copilot Skills Docs](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
</details>

<details>
<summary><b>Cursor IDE</b></summary>

**Using AgentSkills.io format** (recommended):

```bash
git clone https://github.com/yharby/duckdb-skill.git

# Project-level
mkdir -p .claude/skills && cp -r duckdb-skill .claude/skills/
# OR: mkdir -p .agents/skills && cp -r duckdb-skill .agents/skills/

# User-level
mkdir -p ~/.claude/skills && cp -r duckdb-skill ~/.claude/skills/
```

**Legacy Cursor rules** (alternative):

```bash
mkdir -p .cursor/rules
ln -s "$(pwd)/duckdb-skill/SKILL.md" .cursor/rules/duckdb.md
```

📚 [Cursor Skills Docs](https://cursor.com/docs/context/skills) | [Setup Guide](https://www.heyuan110.com/posts/ai/2026-03-08-cursor-setup-guide/)
</details>

<details>
<summary><b>Windsurf IDE</b></summary>

**Using AgentSkills.io format** (recommended):

```bash
git clone https://github.com/yharby/duckdb-skill.git

# Workspace-level
mkdir -p .agents/skills && cp -r duckdb-skill .agents/skills/
# OR: mkdir -p .claude/skills && cp -r duckdb-skill .claude/skills/

# User-level
mkdir -p ~/.agents/skills && cp -r duckdb-skill ~/.agents/skills/
```

**Legacy Windsurf rules** (has character limits):

```bash
mkdir -p .windsurf/rules
cp duckdb-skill/SKILL.md .windsurf/rules/duckdb.md  # Note: 6K char limit per file
```

**Via UI:** Customizations icon → Rules panel → + Workspace

📚 [Windsurf Setup](https://markaicode.com/windsurf-setup-first-week-productivity-tips/) | [Rules Guide](https://uibakery.io/blog/windsurf-ai-rules)
</details>

<details>
<summary><b>OpenAI Codex</b></summary>

**Supported locations:**
- Repository: `.agents/skills`
- User: `~/.agents/skills`

```bash
git clone https://github.com/yharby/duckdb-skill.git

# Install
mkdir -p ~/.agents/skills && cp -r duckdb-skill ~/.agents/skills/
# OR project-level: mkdir -p .agents/skills && cp -r duckdb-skill .agents/skills/
```

Access with `$duckdb-skill` or let Codex select it automatically.

📚 [OpenAI Codex Skills Docs](https://developers.openai.com/codex/skills/)
</details>

<details>
<summary><b>Other Tools</b></summary>

**AgentSkills.io compatible tools** (30+ total):

Junie, Gemini CLI, Autohand Code, OpenCode, OpenHands, Mux, Amp, Letta, Firebender, Goose, Roo Code, Mistral Vibe, Command Code, Ona, VT Code, Qodo, Laravel Boost, Emdash, Snowflake Cortex, Databricks, and more.

**Installation:**
```bash
git clone https://github.com/yharby/duckdb-skill.git

# Standard locations (try in order):
mkdir -p .agents/skills && cp -r duckdb-skill .agents/skills/
mkdir -p .claude/skills && cp -r duckdb-skill .claude/skills/
mkdir -p ~/.agents/skills && cp -r duckdb-skill ~/.agents/skills/
```

**Check your tool's docs** for skill installation instructions, or consult the [AgentSkills.io directory](https://agentskills.io/).

📚 [AgentSkills.io](https://agentskills.io) | [Comparison](https://designrevision.com/blog/best-ai-for-coding)
</details>

### Verification

After installation, test the skill by asking your AI assistant:
- "Show me how to read a GeoParquet file with DuckDB"
- "Help me query Overture Maps data"
- "How do I use spatial joins in DuckDB?"

The assistant should automatically use the DuckDB skill to provide detailed, accurate guidance.

## File Structure

```
duckdb-skill/
├── SKILL.md                    # Main skill (loaded when triggered)
└── refs/                       # Deep-dive references (loaded on demand)
    ├── spatial/                # 155+ ST_* functions split by category
    │   ├── index.md            #   Function index (read first)
    │   ├── core-v15.md         #   Built-in functions (no ext needed)
    │   ├── predicates.md       #   ST_Intersects, ST_Contains, ...
    │   ├── measurement.md      #   ST_Distance, ST_Area, ...
    │   ├── transforms.md       #   ST_Transform, ST_Buffer, ...
    │   ├── creation.md         #   ST_Point, ST_MakeLine, ...
    │   ├── accessors.md        #   ST_X, ST_Y, ST_IsValid, ...
    │   ├── conversion-io.md    #   ST_AsGeoJSON, ST_GeomFromText, ...
    │   ├── aggregates.md       #   ST_Union_Agg, ST_Collect, ...
    │   ├── coverage-tiling.md  #   ST_Coverage*, ST_TileEnvelope
    │   ├── linear-ref.md       #   ST_LineInterpolatePoint, ...
    │   ├── table-functions.md  #   ST_Read, ST_ReadOSM, ST_Drivers
    │   ├── macros.md           #   ST_Rotate, ST_Scale, ST_Translate
    │   └── a5-s2.md            #   A5 + S2/Geography extensions
    ├── overture-maps.md        # Overture Maps data (themes, S3/Azure, bbox)
    ├── gdal-formats.md         # GPKG, Shapefile, GeoJSON, FlatGeobuf, KML
    ├── ducklake.md             # DuckLake lakehouse
    ├── h3.md                   # H3 hexagonal indexing (60+ functions)
    ├── a5.md                   # A5 pentagonal indexing
    ├── spatial-indexes.md      # H3 vs A5 vs S2 vs QUADBIN comparison
    ├── raster-tiling.md        # RASTER type, RaQuet, Pyramid GeoParquet
    ├── fts.md                  # Full-text search (BM25)
    ├── vss.md                  # Vector similarity (HNSW)
    ├── wasm-patterns.md        # DuckDB-WASM browser patterns
    ├── summarize.md            # SUMMARIZE command details
    ├── autocomplete.md         # SQL auto-complete
    ├── explain-analyze.md      # Query profiling and performance diagnostics
    ├── bigquery.md             # Google BigQuery connector (community extension)
    ├── iceberg.md              # Apache Iceberg tables (read/write, catalogs, time travel)
    └── python-api.md           # Python API patterns and v1.5 migration
```

## License

[MIT](LICENSE)
