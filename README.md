# DuckDB Skill for AI Agents

A comprehensive Agent Skill for DuckDB v1.5 — spatial/GIS, GeoParquet, Overture Maps, DuckLake, and more.

**Also a Claude Code plugin** with auto-detection hooks, environment checks, and error suggestions.

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
- **Raster** — RASTER type, RaQuet v0.5 (raster-in-Parquet), QUADBIN spatial index, tile statistics, raquet-io CLI (`uvx`), Pyramid GeoParquet
- **VARIANT type** — semi-structured data with typed binary representation
- **Python API** — connection patterns, Arrow export, v1.5 migration guide
- **BigQuery connector** — query Google BigQuery from DuckDB, GEOGRAPHY/GEOMETRY mapping, authentication, incubating scan, performance tuning
- **Apache Iceberg** — read/write Iceberg tables, REST catalog integration (Polaris, Lakekeeper, AWS Glue, S3 Tables, BigLake), time travel, partition pruning, schema evolution
- **Common pitfalls** — sourced from real GitHub issues

## Install

### Claude Code Plugin (Recommended)

The easiest way to install in Claude Code. Add a marketplace, then install with one command.

**Step 1: Add the marketplace** (one-time setup)

Run inside Claude Code:
```
/plugin marketplace add https://github.com/yharby/duckdb-skill
```

**Step 2: Install the plugin**
```
/plugin install duckdb-skill
```

That's it! The plugin is now active with:
- `/duckdb-skill:detect` — check your environment (DuckDB CLI, uv/uvx, Python duckdb)
- **Auto error detection** — hook suggests fixes when DuckDB commands fail (missing CLI, spatial extension, CRS mismatch)
- **Pre-configured permissions** — DuckDB, uv/uvx commands are pre-allowed

**Update:**
```
/plugin update duckdb-skill
```

> Works on **macOS, Linux, and Windows**. The hook uses Node.js (guaranteed by Claude Code) for cross-platform support. Install suggestions are platform-aware (brew/winget/scoop/apt).

<details>
<summary><b>Alternative: Install as local plugin (no marketplace)</b></summary>

```bash
git clone https://github.com/yharby/duckdb-skill.git
claude --plugin-dir ./duckdb-skill
```

Or load it every session:
```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
alias claude='claude --plugin-dir /path/to/duckdb-skill'
```

</details>

<details>
<summary><b>Alternative: Install as standalone skill (legacy)</b></summary>

```bash
# User-level (works across all projects)
git clone https://github.com/yharby/duckdb-skill.git ~/.claude/skills/duckdb-skill

# Or project-level (specific to current project)
git clone https://github.com/yharby/duckdb-skill.git .claude/skills/duckdb-skill
```

**Update:** `cd ~/.claude/skills/duckdb-skill && git pull`

> Note: Standalone skill mode does not include hooks or the `/duckdb-skill:detect` command.

</details>

### Other AI Coding Tools

> This skill follows the [AgentSkills.io](https://agentskills.io) open standard, making it compatible with **30+ AI coding tools** including Cursor, Windsurf, VS Code Copilot, GitHub Copilot, OpenAI Codex, and many more.

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
</details>

<details>
<summary><b>Other Tools (30+)</b></summary>

**AgentSkills.io compatible tools:**

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
</details>

### Verification

After installation, test the skill by asking your AI assistant:
- "Show me how to read a GeoParquet file with DuckDB"
- "Help me query Overture Maps data"
- "How do I use spatial joins in DuckDB?"

The assistant should automatically use the DuckDB skill to provide detailed, accurate guidance.

**Claude Code plugin users** can also run:
```
/duckdb-skill:detect
```
to verify DuckDB CLI, uv/uvx, and Python duckdb are available on their system.

## Plugin Features (Claude Code only)

When installed as a Claude Code plugin, you get extra features beyond the base skill:

| Feature | What it does |
|---------|-------------|
| `/duckdb-skill:detect` | Checks DuckDB CLI, uv, uvx, Python duckdb — reports versions and platform-specific install commands |
| **Error detection hook** | Automatically suggests fixes when Bash commands fail with DuckDB-related errors |
| **Pre-configured permissions** | `duckdb`, `uvx`, `uv`, and detection commands are pre-allowed |

**Error detection examples** (fires automatically on failed commands):

| Error | Suggestion |
|-------|-----------|
| `duckdb: command not found` | `brew install duckdb` (macOS) / `winget install DuckDB.cli` (Windows) |
| `duckdb is not recognized` | `winget install DuckDB.cli OR scoop install duckdb` (Windows) |
| `No module named 'duckdb'` | `pip install duckdb` or `uvx --with duckdb python script.py` |
| `Catalog Error: ST_Intersects does not exist` | `INSTALL spatial; LOAD spatial;` |
| `Extension ... not found` | `FORCE INSTALL extension_name FROM core_nightly;` |
| `CRS mismatch` | `Strip CRS with ::GEOMETRY or use ST_Transform` |
| `geometry_always_xy` | `SET geometry_always_xy = true;` |

## File Structure

```
duckdb-skill/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest (Claude Code)
├── skills/duckdb/
│   ├── SKILL.md -> ../../SKILL.md   # Symlink for plugin skill loading
│   └── refs -> ../../refs           # Symlink for ref file access
├── commands/
│   └── detect.md               # /duckdb-skill:detect command
├── hooks/
│   ├── hooks.json              # PostToolUse hook config
│   └── post-bash-check.js      # Cross-platform error detection (Node.js)
├── settings.json               # Default permissions
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
    ├── raster-tiling.md        # RASTER type, RaQuet v0.5, QUADBIN, raquet-io CLI, Pyramid GeoParquet
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
