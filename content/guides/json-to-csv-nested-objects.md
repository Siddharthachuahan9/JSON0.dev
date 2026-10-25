---
title: Convert a JSON array to CSV or a table, with nested objects flattened
headline: JSON to CSV, with nested objects
description: Turn an API response into a spreadsheet without losing nested fields. How flattening to dot paths works, what to do with arrays, and how to do it in the browser, with jq or with pandas.
date: 2026-10-25
kind: guide
tool: json-table
---

**Short answer:** flatten each nested object into dot-path columns (`customer.id`, `customer.name`, `plan.seats`), keep arrays as JSON text in a single cell, and take the union of keys across all rows so sparse fields still get a column. json0's [Table](/json-table) does that as you paste and copies the result as CSV, TSV or Markdown. In code, `pandas.json_normalize` does the same.

## The problem

Spreadsheets are flat. API responses are not:

```json
[
  {
    "id": "in_7Hc2",
    "status": "paid",
    "customer": { "id": "cus_R2d9", "name": "Northwind Labs GmbH", "country": "DE" },
    "plan": { "id": "team", "seats": 5 },
    "amount_due": 2320,
    "lines": [ { "sku": "team-seat", "quantity": 5 } ]
  }
]
```

A naive converter either drops `customer` and `plan`, or writes `[object Object]` into the cell. Neither is what you want when someone in finance asks for "the invoices as a spreadsheet".

## Flattening, column by column

The usual answer, and the one json0 uses:

1. **Nested objects become dot paths.** `customer.name` becomes its own column. This works to any depth: `customer.address.city`.
2. **Arrays stay in one cell as JSON.** `lines` becomes `[{"sku":"team-seat","quantity":5}]`. Spreading an array across columns (`lines.0.sku`, `lines.1.sku`, …) gives every row a different width, and spreading it across rows multiplies everything else. Keep it as text, or make a separate table for the line items.
3. **Columns are the union of all rows.** If only three of twelve invoices have a `discount.coupon`, the column still exists, and the other nine cells are empty. json0 shows how full each column is, so a sparse column is easy to spot.
4. **Empty and null are both empty cells.** CSV has no null. If the difference matters to you, decide on a convention before you export.

On json0's sample of twelve invoices, that gives **12 rows × 16 columns**, with three nested objects flattened into dot paths. The sparsest column is `discount.coupon`, filled in 3 of 12 rows.

## In the browser

Paste the JSON into [Table](/json-table). It accepts:

- an array of objects,
- an object with one array field (such as `{ "data": [ … ] }`, which is how many APIs wrap a list),
- JSON Lines / NDJSON, one object per line.

You can sort by any column, filter rows, and see each column's type and fill rate under its name. **Copy CSV**, **Copy TSV** and **Copy Markdown** export the rows you see, in the order you sorted them. TSV pastes straight into Google Sheets or Excel with the columns intact; Markdown is for a pull request or a ticket.

Nothing is uploaded; the conversion runs in the page.

## With jq

For flat objects, jq's `@csv` is enough:

```bash
jq -r '(.[0] | keys_unsorted) as $k | $k, (.[] | [.[$k[]]]) | @csv' invoices.json
```

For nested objects, build the dot paths yourself. This version flattens objects *and* arrays (arrays become `lines.0.sku`), and takes the union of keys:

```bash
jq -r '
  [ .[] | [ paths(scalars) as $p
            | { key: ($p | map(tostring) | join(".")), value: getpath($p) } ]
        | from_entries ]
  | (map(keys) | add | unique) as $cols
  | $cols, (.[] | [ .[$cols[]] ]) | @csv
' invoices.json
```

It works, but it is the kind of command you copy from a note every time.

## With Python

pandas has flattening built in:

```python
import json
import pandas as pd

with open("invoices.json") as f:
    data = json.load(f)

pd.json_normalize(data).to_csv("invoices.csv", index=False)
```

`json_normalize` uses dot paths by default and leaves lists in a single cell. To turn an array such as `lines` into its own table, with the invoice id carried along, use `record_path` and `meta`:

```python
pd.json_normalize(data, record_path="lines", meta=["id"])
```

## The other direction

If you have a CSV and need JSON, json0's [CSV viewer](/csv) converts a file to a JSON array or NDJSON, with numbers and booleans typed. It also profiles every column and finds duplicate rows, which is worth doing before you import a spreadsheet anywhere.

## Frequently asked

**Why do my numbers turn into dates in Excel?** Excel guesses types when it opens a CSV. Values like `2026-10` or `1-2` become dates. Paste TSV into an existing sheet with the columns formatted as text, or import with Excel's data import and set the column types.

**What about very large files?** json0 opens files up to 10 MB and draws the first 500 rows on screen (the copy buttons export all of them). For larger exports, the jq or pandas versions above are the better fit.
