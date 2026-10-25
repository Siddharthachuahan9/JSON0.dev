---
title: JSONPath cheat sheet with worked examples (and the jq equivalents)
headline: JSONPath cheat sheet
description: The JSONPath syntax you will actually use, tried on one real API response, with each result shown, the standard RFC 9535 filter syntax, and the jq command that does the same thing.
date: 2026-10-25
kind: guide
tool: jsonpath
---

**Short answer:** `$` is the document, `.key` or `['key']` steps into an object, `[0]` and `[-1]` pick array elements, `[*]` or `.*` takes every child, and `..key` finds a key at any depth. Filters such as `$.items[?@.price < 10]` are part of the standard (RFC 9535) but not every tool supports them yet. You can try every expression below in json0's [Query](/jsonpath).

## The document

All examples run against this subscription object, which is json0's sample:

```json
{
  "id": "sub_8Kq2LmV41",
  "object": "subscription",
  "status": "active",
  "customer": { "id": "cus_R2d9", "email": "ops@northwind-labs.io", "country": "DE" },
  "plan": { "id": "team", "interval": "month", "amount": 2900, "currency": "eur", "seats": 5 },
  "features": ["api", "webhooks", "sso", "audit_log"],
  "current_period_end": "2026-11-01T00:00:00Z",
  "metadata": { "source": "checkout", "upgraded_from": "starter" }
}
```

## The cheat sheet

| JSONPath | Result | jq |
| --- | --- | --- |
| `$` | the whole document | `.` |
| `$.plan.amount` | `2900` | `.plan.amount` |
| `$['customer']['email']` | `"ops@northwind-labs.io"` | `.customer.email` |
| `$.features[0]` | `"api"` | `.features[0]` |
| `$.features[-1]` | `"audit_log"` | `.features[-1]` |
| `$.features[*]` | `"api"`, `"webhooks"`, `"sso"`, `"audit_log"` | `.features[]` |
| `$.plan.*` | `"team"`, `"month"`, `2900`, `"eur"`, `5` | `.plan[]` |
| `$..id` | `"sub_8Kq2LmV41"`, `"cus_R2d9"`, `"team"` | `.. \| objects \| select(has("id")) \| .id` |
| `$..*` | every value at every depth | `[..] \| .[1:]` (jq's `..` also yields the document itself) |

Some notes on the table:

- **Dot or bracket.** `$.plan.amount` and `$['plan']['amount']` are the same. Use brackets when a key has a space, a dash at the start, or other characters a dot cannot carry: `$['content-type']`.
- **Negative indexes** count from the end. `[-1]` is the last element.
- **`..` is recursive descent.** `$..id` finds every `id` key at any depth, in document order. It is the quickest way to answer "where does this field appear?" in a large payload.
- **A path returns a list.** Even `$.plan.amount` returns a list with one value. When nothing matches, you get an empty list, not an error.

## Filters, slices and unions

These are in the standard, RFC 9535, published in February 2024:

```text
$.items[?@.price < 10]          items whose price is below 10
$.items[?@.tags]                items that have a tags member
$.items[?@.status == 'paid']    items with a given status
$.items[0:2]                    the first two items (end is exclusive)
$.items[0, 2]                   items 0 and 2
$.items[?length(@.tags) > 1]    using a function
```

Before the RFC, JSONPath was defined by Stefan Goessner's 2007 article, and libraries filled the gaps in different ways. Older tools often want parentheses around filters, `[?(@.price < 10)]`, and may evaluate the expression as JavaScript. If an expression works in one tool and not another, this is usually why.

**In json0:** Query supports `$`, `.key`, `['key']`, `[n]` including negative indexes, `[*]`, `.*`, `..key` and `..*`. Filters, slices and unions are not supported yet, and the page says so if you try one. For filtering, json0's MongoDB [query tester](/mongo-query) runs real filters over an array of documents, and jq is the tool for anything more involved.

## Filters in jq

The jq versions of the filters above:

```bash
jq '.items[] | select(.price < 10)'
jq '.items[] | select(has("tags"))'
jq '.items[] | select(.status == "paid")'
jq '.items[0:2]'
jq '[.items[0], .items[2]]'
jq '.items[] | select((.tags | length) > 1)'
```

## Where you meet JSONPath

- **Kubernetes:** `kubectl get pods -o jsonpath='{.items[*].metadata.name}'`. kubectl uses its own template flavour, with `{}` around expressions and no leading `$`.
- **API testing tools** use JSONPath to pull a value out of one response and feed it into the next request.
- **AWS Step Functions** select and pass data between states with JSONPath (`$.detail.orderId`).
- **Databases:** PostgreSQL has its own SQL/JSON path language (`jsonb_path_query`), which looks similar but uses `$.items[*] ? (@.price < 10)` for filters.

## Frequently asked

**Is JSONPath the same as jq?** No. JSONPath only selects values; jq is a full language that can also transform, compute and build new JSON. JSONPath is easier to embed in other tools, which is why so many use it.

**Is JSONPath the same as JSON Pointer?** No. JSON Pointer (RFC 6901) points at exactly one location, like `/plan/amount`, and has no wildcards. It is what JSON Patch uses.
