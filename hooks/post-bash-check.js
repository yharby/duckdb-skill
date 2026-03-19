#!/usr/bin/env node
// Post-Bash hook: detect common DuckDB errors and provide actionable suggestions.
// Cross-platform (Node.js is guaranteed by Claude Code).
// Exits immediately for successful commands — minimal overhead.

const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    process.exit(0);
  }

  const exitCode = input?.tool_result?.exit_code ?? 0;
  if (exitCode === 0) process.exit(0);

  const stderr = input?.tool_result?.stderr ?? "";
  const stdout = input?.tool_result?.stdout ?? "";
  const output = `${stderr} ${stdout}`;

  const isWin = process.platform === "win32";
  const isMac = process.platform === "darwin";

  // DuckDB CLI not found
  if (/duckdb.*not (found|recognized)|command not found.*duckdb|not recognized.*duckdb|No such file.*duckdb/i.test(output)) {
    if (isMac) {
      console.log("DuckDB CLI not found. Install with: brew install duckdb");
    } else if (isWin) {
      console.log("DuckDB CLI not found. Install with: winget install -e --id DuckDB.cli -v \"1.5.0\"  OR  scoop install duckdb");
    } else {
      console.log("DuckDB CLI not found. Install from: https://duckdb.org/docs/installation/");
    }
    process.exit(0);
  }

  // Python duckdb module not found
  if (/No module named.*duckdb|ModuleNotFoundError.*duckdb|ImportError.*duckdb/i.test(output)) {
    console.log("Python duckdb not installed. Install with: pip install duckdb  OR  uvx --with duckdb python script.py");
    process.exit(0);
  }

  // Spatial extension not found/loaded
  if (/Catalog Error.*ST_|Function.*ST_.*does not exist|extension.*spatial.*not found/i.test(output)) {
    console.log("Spatial extension not loaded. Run: INSTALL spatial; LOAD spatial;");
    process.exit(0);
  }

  // Extension installation failure
  if (/Failed to download|Could not load extension|Extension.*not found/i.test(output)) {
    console.log("Extension installation failed. Try: FORCE INSTALL extension_name FROM core_nightly;");
    process.exit(0);
  }

  // CRS mismatch error (v1.5)
  if (/CRS mismatch|different coordinate reference/i.test(output)) {
    console.log("CRS mismatch between geometries. Strip CRS with ::GEOMETRY or use ST_Transform to align CRS first.");
    process.exit(0);
  }

  // geometry_always_xy warning
  if (/geometry_always_xy|axis order/i.test(output)) {
    console.log("Set axis order explicitly: SET geometry_always_xy = true;");
    process.exit(0);
  }

  process.exit(0);
});
