---
description: Detect DuckDB CLI, uv/uvx, and Python duckdb availability in the current environment
---

# Environment Detection

Check the current environment for DuckDB-related tools. Run the following detection commands. Each is independent — run them **in parallel** and handle failures gracefully (use `|| echo "NOT_FOUND"`).

**Detection commands** (work on macOS, Linux, AND Windows Git Bash):

1. `duckdb --version 2>/dev/null || echo "NOT_FOUND"` — DuckDB CLI on PATH
2. `uv --version 2>/dev/null || echo "NOT_FOUND"` — uv package manager
3. `uvx --version 2>/dev/null || echo "NOT_FOUND"` — uvx runner
4. `python3 -c "import duckdb; print('Python duckdb:', duckdb.__version__)" 2>/dev/null || python -c "import duckdb; print('Python duckdb:', duckdb.__version__)" 2>/dev/null || echo "NOT_FOUND"` — Python duckdb package

**Report a summary table** with status, version, and install command for each tool.

**Platform-specific install commands** (detect via the OS field in the environment info, or `uname -s 2>/dev/null`):

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
- If DuckDB is found locally (e.g., `./duckdb`) but not on PATH: Note it and suggest adding to PATH
