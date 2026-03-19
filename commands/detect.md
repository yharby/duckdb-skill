---
description: Detect DuckDB CLI, uv/uvx, and Python duckdb availability in the current environment
---

# Environment Detection

Check the current environment for DuckDB-related tools. First detect the platform, then run the appropriate commands.

**Step 1: Detect platform** — run `node -e "console.log(process.platform)"` to get the OS.

**Step 2: Run detection commands** (all independent — run in parallel):

For **macOS/Linux** (`darwin` or `linux`):
1. `command -v duckdb && duckdb --version` — DuckDB CLI
2. `command -v uv && uv --version` — uv package manager
3. `command -v uvx && uvx --version` — uvx runner
4. `python3 -c "import duckdb; print('Python duckdb:', duckdb.__version__)"` — Python duckdb package

For **Windows** (`win32`):
1. `where duckdb 2>nul && duckdb --version` — DuckDB CLI
2. `where uv 2>nul && uv --version` — uv package manager
3. `where uvx 2>nul && uvx --version` — uvx runner
4. `python -c "import duckdb; print('Python duckdb:', duckdb.__version__)"` — Python duckdb package (note: `python` not `python3` on Windows)

**Step 3: Report summary table:**

| Tool | Status | Version | Install Command |
|------|--------|---------|-----------------|
| DuckDB CLI | ... | ... | see below |
| uv | ... | ... | see below |
| uvx | ... | ... | Included with uv |
| Python duckdb | ... | ... | see below |

**Platform-specific install commands:**

| Tool | macOS | Linux | Windows |
|------|-------|-------|---------|
| DuckDB CLI | `brew install duckdb` | Download from duckdb.org | `winget install DuckDB.cli` or `scoop install duckdb` |
| uv/uvx | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | Same curl command | `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 \| iex"` |
| Python duckdb | `pip install duckdb` | `pip install duckdb` | `pip install duckdb` |

**Recommendations based on results:**

- If DuckDB CLI is missing: Suggest installation for the detected platform
- If uv/uvx is missing: Recommend installing uv (provides both `uv` and `uvx`)
- If Python duckdb is missing but uv is available: `uvx --with duckdb python -c "import duckdb; print(duckdb.__version__)"`
- If Python duckdb version differs from CLI version: Warn about potential compatibility issues
- If DuckDB version < 1.5.0: Warn that this skill targets v1.5+ and some features may not work
