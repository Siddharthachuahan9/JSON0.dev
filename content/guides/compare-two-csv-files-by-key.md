---
title: How to compare two CSV files by a key column
headline: Compare two CSV files by a key column
description: A line diff of two exports is useless once rows are re-sorted. Match rows on an id column instead and list the rows added, removed and the exact cells that changed. In the browser, with csv-diff or daff, or in a spreadsheet.
date: 2026-10-25
kind: guide
tool: csv-diff
---

**Short answer:** pick a column that uniquely identifies a row (`customer_id`, `sku`, `email`), match the rows of both files on it, and compare the other columns cell by cell. json0's [CSV diff](/csv-diff) does this in the browser and picks the key for you. On the command line, `csv-diff old.csv new.csv --key=id` does the same.

## Why `diff` is not enough

Export a table on the first of the month and again on the 24th, and run `diff`:

- if the export order changed, almost every line is reported as removed and added again;
- if one cell changed, you see the whole line twice and have to spot the difference yourself;
- if a column was added, every line differs.

What you actually want to know is: which customers are new, which are gone, and for the rest, which fields changed from what to what.

## Comparing by key

1. **Choose the key.** It must be unique in both files. An id is ideal. An email works if it never repeats. A name rarely does.
2. **Match rows.** A key only in the old file is a removed row. A key only in the new file is an added row.
3. **Compare matched rows cell by cell,** on the columns both files share, and report each change as *column: old → new*.

On json0's sample, two exports of a customer table, the result is **6 differences keyed on `customer_id`**: 2 rows added, 1 removed, and 3 cells changed in 2 rows. The other 5 rows are unchanged and hidden unless you ask for all rows.

## In the browser

Paste or open both files in [CSV diff](/csv-diff). json0 parses them (quoted fields, commas and line breaks inside quotes included), then:

- **picks the key** as the first shared column whose values are unique in both files. You can change it in the *Key column* menu.
- **refuses a key that is not unique** and names the duplicate values, instead of guessing which row to match.
- **ignores spaces around values** if you leave that switch on, so `"DE "` and `"DE"` do not count as a change.
- **copies a report** of the differences as text you can paste into a ticket.

The files stay in your browser.

## With csv-diff (Python)

Simon Willison's `csv-diff` does key-based comparison on the command line:

```bash
pip install csv-diff
csv-diff customers-2026-10-01.csv customers-2026-10-24.csv --key=customer_id
```

It prints the rows added and removed and the changed fields, and `--json` gives you the same as JSON for scripts.

## With daff

`daff` produces a "highlighter diff": a table in the same shape as your data, with a marker column showing added, removed and changed rows, and changed cells written as `old->new`. It can also emit HTML and apply a diff as a patch, which makes it useful for data that lives in git.

## In a spreadsheet

For a one-off in Excel or Google Sheets, put the new export in one sheet and the old in another, then look up each key:

```text
=XLOOKUP(A2, Old!A:A, Old!D:D, "missing")
```

and compare the result with the current row's value. It works, but every column needs its own formula, and removed rows need a second lookup in the other direction.

## Things that cause false differences

- **Number formatting.** `29.90` and `29.9` are different strings. Normalise in the export, or compare in a tool that types numbers.
- **Dates.** `2026-10-01` and `01/10/2026` are the same day. Export dates in ISO 8601.
- **Whitespace and case.** Trailing spaces and `de` vs `DE` show up as changes. Trim on export, or use the ignore-spaces option.
- **Encoding and line endings.** A UTF-8 byte order mark at the start of a file can turn the first header from `customer_id` into something that only looks like it. If the key column is not found, this is the first thing to check.

## Frequently asked

**What if no single column is unique?** Combine columns into one key in the export (for example `order_id-line_no`), or add a row id before exporting.

**Can I compare JSON exports the same way?** Yes. Convert each array of records to a map keyed by id and use a structural JSON diff; the [guide on comparing JSON with unordered arrays](/guides/compare-json-ignore-array-order) shows how.
