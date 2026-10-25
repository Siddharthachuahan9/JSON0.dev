---
title: JSON diff tools compared: json0, JSONDiff, JSON Crack, Diffchecker, VS Code and jq
headline: JSON diff tools compared
description: Five ways to compare two JSON documents, tested on the same pair of API responses. What each one shows, how it treats key and array order, and where your data goes.
date: 2026-10-25
kind: comparison
tool: json-diff
---

**Short answer:** if you want to see which *values* changed between two JSON documents, use a structural diff (json0, JSONDiff.com). If you want a line-by-line review of a file you are about to commit, a text diff (VS Code, Diffchecker, `git diff`) is the right tool, but normalise the JSON first with `jq -S`. JSON Crack is a viewer, not a diff tool.

I compared the same two documents in each tool: a subscription object from a billing API before and after a customer moved from the Starter plan to the Team plan. Seven things changed: the plan id, amount and seat count, a coupon that was removed, two new entries in a `features` array, and a new `metadata.upgraded_from` key.

## What "diff" means for JSON

There are two different questions people ask a JSON diff tool:

1. **Which values changed?** `plan.amount` went from `900` to `2900`. This is a structural diff. It parses both documents and walks them key by key, so whitespace, indentation and the order of keys in an object do not matter.
2. **Which lines changed?** Line 13 used to say `"amount": 900,` and now says `"amount": 2900,`. This is a text diff. It is what code review uses, and it is sensitive to formatting and key order.

Both are useful. The trouble starts when you use a text diff to answer the first question: reformat a file or let a serialiser reorder keys, and every line shows up as changed.

## The tools

| Tool | Kind of diff | Key order ignored | Array order option | Where it runs | Share a comparison |
| --- | --- | --- | --- | --- | --- |
| json0 | Structural, by path | Yes | Yes ("Ignore array order") | In your browser | Link with the data in the URL hash |
| JSONDiff.com | Structural | Yes | Not documented | In your browser (per its README) | Load two public URLs by query parameter |
| JSON Crack | No diff; visualises one document | n/a | n/a | In your browser | Paid features at ToDiagram |
| Diffchecker | Text, line by line | No | No | Compare in browser; saving creates a link; desktop app offline | Save to get a link |
| VS Code | Text, line by line | No | No | Local | No |
| `jq -S` + `diff` | Text, after normalising | Yes (keys sorted) | No | Local | No |

### json0 JSON Diff

json0 parses both documents, walks them together and lists every change by its path: `plan.amount` changed, `coupon` removed, `features[2]` added. Each change links back to its line in both documents, and a band between the two panes connects the Before lines to the After lines so you can see where a block moved.

On the subscription sample it reports **7 changes in 19 values**: 3 changed, 1 removed, 3 added.

Things worth knowing:

- **Array order.** By default arrays are compared position by position, which is right for ordered lists. Turn on *Ignore array order* and json0 pairs up equal elements wherever they are, so `["api", "sso"]` and `["sso", "api"]` count as equal. An element that changed shows as one removal and one addition, since there is no longer a position to tie the two together.
- **Privacy.** Parsing and comparison run in the page. The share link puts both documents in the URL fragment (the part after `#`), which browsers do not send to the server.
- **Redaction.** A switch hides the values of keys such as `email`, `token`, `password` or `card`, and anything shaped like an email address, in the change list. Useful when you screenshot a diff for a ticket.

[Open JSON Diff](/json-diff)

### JSONDiff.com

JSONDiff by Zack Grossbart is one of the oldest structural JSON diff sites. Its README says it "does all of the comparing and rendering right in your browser" and "never sends any of your JSON data anywhere". It is open source under Apache-2.0, so you can host your own copy.

It can load both documents from public URLs with `left` and `right` query parameters, which is handy for comparing two endpoints. The site shows ads and uses Google Analytics, according to the same README. I could not find documentation on how it treats arrays whose order changed, so test that with your own data if it matters.

### JSON Crack

JSON Crack turns one JSON, YAML, CSV or XML document into an interactive graph. It is very good for understanding the shape of an unfamiliar payload, and its site says "Everything happens on your device." It does not compare two documents. If you need both, look at the shape in JSON Crack and use a diff tool for the changes.

### Diffchecker

Diffchecker compares text, images, PDFs and spreadsheets, and it treats JSON as text. Its site says the online comparison runs in your browser, and that saving a comparison gives you a link you can send (so a saved diff lives on their side). There is a desktop app that compares files offline.

Because it compares lines, a reordered or reformatted document produces a noisy result. Format both sides the same way before you paste them in, or sort keys with `jq -S` first.

### VS Code

Select two files in the Explorer and choose *Compare Selected*, or run `code --diff before.json after.json`. You get the same side-by-side diff you use for code, with inline edits and no upload. Like any text diff it reports formatting and key order changes, so it works best on files that are always written by the same serialiser.

### jq and diff

If you live in a terminal, this one-liner turns a text diff into something close to a structural one:

```bash
diff <(jq -S . before.json) <(jq -S . after.json)
```

`jq -S` sorts object keys and re-indents, so only real value changes remain. It does not help with arrays whose order changed, and the output is still lines, not paths.

## Which one to use

- **Debugging an API change or a config drift:** a structural diff. You want the list of paths that changed, not the lines.
- **Reviewing a JSON file in a pull request:** the text diff your review tool already shows, with the file kept sorted and formatted by your tooling.
- **Comparing payloads that contain customer data or credentials:** a tool that runs locally. json0, JSONDiff.com, VS Code and jq all keep the data on your machine; read the privacy notes of anything else before pasting.
- **Understanding one large unfamiliar document:** JSON Crack for the picture, then a diff tool once you have two versions.

## Frequently asked

**Does key order matter in JSON?** No. RFC 8259 says an object is an unordered collection of name/value pairs, so `{"a":1,"b":2}` and `{"b":2,"a":1}` are the same object. Arrays are ordered.

**Can I diff very large files in the browser?** json0 opens files up to 10 MB. Beyond that, a command-line tool such as `jq` is the safer choice.

**Is a share link private?** In json0 the documents travel in the URL fragment, which is not sent to any server, but anyone you give the link to can read them. Treat it like the data itself.
