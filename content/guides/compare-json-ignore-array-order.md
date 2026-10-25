---
title: How to compare two JSON documents and ignore array order
headline: Compare JSON, ignoring array order
description: When ["a","b"] and ["b","a"] should count as equal, and when they should not. Three ways to diff JSON with unordered arrays, and the edge cases that trip each one up.
date: 2026-10-25
kind: guide
tool: json-diff
---

**Short answer:** in json0's JSON Diff, turn on *Ignore array order*. On the command line, sort every array before you diff: `jq -S 'walk(if type == "array" then sort else . end)'`. For arrays of objects with an id, compare them as a map keyed by that id instead.

## Should array order matter?

In JSON, object keys have no order but arrays do. `[1, 2]` and `[2, 1]` are different values, and a diff that says so is correct.

Whether that difference *matters* depends on what the array means:

- **Order is data:** steps in a pipeline, line items on an invoice, a ranked list of search results. Reordering is a real change.
- **Order is noise:** tags, feature flags, permissions, the set of email addresses on an account. The array is really a set, and the order comes from whatever produced it, often a database query without an `ORDER BY` or a hash map.

APIs that return sets as arrays are everywhere, so "same data, different order" is one of the most common false alarms when you compare two responses.

## In json0

Paste the two documents into [JSON Diff](/json-diff) and switch on **Ignore array order**. json0 then pairs each element in the Before array with an equal element anywhere in the After array:

```json
{ "features": ["api", "webhooks", "sso"] }
{ "features": ["sso", "api", "webhooks"] }
```

With the switch off, that is three changes. With it on, there are none, and the summary says the documents are equal when array order is ignored.

When an element really changed, there is no longer a position to tie the old and new values together, so json0 reports one removal and one addition:

```json
{ "features": ["api", "webhooks"] }
{ "features": ["webhooks", "api-v2"] }
```

Here `"api"` is removed and `"api-v2"` is added. That is the honest answer for a set: the set lost one member and gained another.

## With jq

Sort every array, sort every object's keys, then use a normal diff:

```bash
norm='walk(if type == "array" then sort else . end)'
diff <(jq -S "$norm" before.json) <(jq -S "$norm" after.json)
```

jq sorts arrays of objects too, by comparing their keys and then their values, so the result is deterministic. Two caveats:

- **Arrays whose order is data get sorted as well.** If a document mixes ordered and unordered arrays, restrict the sort to the paths you know are sets, for example `.features |= sort`.
- **The output is lines.** You see that a line moved inside a sorted array, not which object changed.

## Arrays of objects: compare by key, not by position

The hardest case is an array of records:

```json
[ { "id": "cus_1", "plan": "starter" }, { "id": "cus_2", "plan": "team" } ]
[ { "id": "cus_2", "plan": "enterprise" }, { "id": "cus_1", "plan": "starter" } ]
```

Ignoring order treats each object as a whole, so `cus_2` shows up as one removed object and one added object, even though only its plan changed. What you want is "`cus_2`.plan changed from team to enterprise". For that, turn the array into an object keyed by `id` before comparing:

```bash
jq 'map({(.id): .}) | add' customers.json
```

Then any structural diff, including json0, reports the change at `cus_2.plan`. If the data is tabular, the [CSV diff](/csv-diff) tool does this directly: it matches rows on a key column and lists the cells that changed.

## Edge cases

- **Duplicates.** `["a", "a", "b"]` and `["a", "b", "b"]` contain the same distinct values but different counts. json0 matches elements one to one, so it reports one `"a"` removed and one `"b"` added. Turning each array into a set first would hide that.
- **Nested arrays.** Arrays inside objects follow the same setting. To pair up the elements of an array, though, json0 needs them to be exactly equal, including the order of any arrays inside them. A record whose inner `tags` were reordered shows as one removed and one added record; key the array by id, as above, to see the change at its path.
- **Numbers that look equal.** `1` and `1.0` are the same JSON number when parsed, but a text diff will flag them. A structural diff compares parsed values.

## Frequently asked

**Does the JSON spec say anything about array order?** Yes: RFC 8259 defines an array as an ordered sequence of values, and an object as an unordered collection. Ignoring order is a choice you make about your data, not something the format allows by default.

**Can I share a diff with array order ignored?** Yes. json0's share link records the setting along with both documents, in the part of the URL after `#`, which is never sent to a server.
