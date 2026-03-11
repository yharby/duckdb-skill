# Autocomplete Extension

SQL auto-completion for the DuckDB CLI and programmatic use.

## Setup

Ships pre-installed with the DuckDB CLI client — no installation needed.

```sql
-- If using programmatically (not CLI):
INSTALL autocomplete;
LOAD autocomplete;
```

## Function

### sql_auto_complete()

```sql
SELECT * FROM sql_auto_complete('partial_sql_query');
```

Returns a table with:

| Column | Type | Description |
|--------|------|-------------|
| `suggestion` | VARCHAR | Completion text |
| `suggestion_start` | INTEGER | Character position where suggestion begins |

## Examples

```sql
-- Keyword completion
SELECT * FROM sql_auto_complete('SEL');
-- Returns: SELECT, DELETE, INSERT, CREATE, ALTER, ...

-- Table name completion
SELECT * FROM sql_auto_complete('SELECT * FROM my_');
-- Returns matching table names

-- Column completion
SELECT * FROM sql_auto_complete('SELECT col FROM my_table WHERE ');
-- Returns column names and keywords
```

## Notes

- In the CLI, auto-completion is triggered with TAB key
- The function is useful for building custom SQL editors or IDE integrations
- Suggestions include SQL keywords, table names, column names, and functions
- With v1.5 PEG parser (`CALL enable_peg_parser();`), TAB-completion is enhanced
