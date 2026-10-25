---
title: Generate a JSON Schema, TypeScript types and a Zod schema from a JSON sample
headline: Types and schemas from a JSON sample
description: Infer types from real API responses instead of writing them by hand. What a generator can and cannot know from a sample, how to feed it several samples, and how to check the result.
date: 2026-10-25
kind: guide
tool: json-schema
---

**Short answer:** paste several real responses as one JSON array into json0's [Schema and types](/json-schema). It merges them and gives you a JSON Schema (draft 2020-12), TypeScript interfaces and a Zod schema. Fields missing from some samples come out optional, small sets of strings become enums, and dates, emails and URLs get formats. Then review it, because a sample only shows what happened, not what is allowed.

## Why infer instead of writing by hand

When you integrate with an API that has no OpenAPI document, or a webhook whose docs are a single example, you end up writing the types from a payload anyway. A generator does the typing for you and catches the fields you would have missed, such as the `discount` object that only appears on one invoice in ten.

## What a generator can know from a sample

From one document a generator sees one value per field. From many it sees patterns:

| Signal | What it becomes |
| --- | --- |
| A field appears in every sample | `required` in the schema, a plain property in TypeScript |
| A field is missing from some samples | optional: `seats?: number`, `.optional()` in Zod |
| A field is sometimes `null` | `["string", "null"]`, `string \| null`, `.nullable()` |
| A string field has a few repeating values | an enum: `"active" \| "past_due" \| "canceled"` |
| Every value looks like an ISO date-time | `format: "date-time"`, `z.string().datetime()` |
| Whole numbers only | `integer` rather than `number` |

json0 makes an enum only when it is fairly safe to: at least three samples, at most five distinct values, more samples than distinct values, and never for fields named `id` or ending in `_id`. Formats are detected for `date-time`, `date`, `email` and `uri`, and only when every value matches.

## What it cannot know

- **Values it never saw.** If the samples only contain `"active"` and `"canceled"`, the enum will reject `"trialing"` the first time it appears. Widen enums by hand when you know the full list.
- **Whether a missing field is optional or just rare.** Ten samples without a `discount` look the same as a field that is never sent.
- **Meaning.** That `amount` is in cents, or that `seats` must be at least 1, is not in the data.

So treat the output as a first draft that is right about structure and needs a human for the rules.

## Feeding it more than one sample

Collect a handful of real responses that differ: a free and a paid customer, an invoice with a discount and one without, an error case. Put them in one array:

```json
[
  { "id": "sub_1", "status": "active", "plan": { "id": "starter", "seats": 1 } },
  { "id": "sub_2", "status": "past_due", "plan": { "id": "team", "seats": 5 }, "discount": { "coupon": "LAUNCH20" } },
  { "id": "sub_3", "status": "canceled", "plan": { "id": "team", "seats": 3 }, "canceled_at": "2026-10-01T09:30:00Z" }
]
```

json0 notices the top-level array and merges the samples into one schema, rather than describing an array of three items. With three samples and three different statuses it will not guess an enum for `status` yet, since every value is unique; add more samples and the repeating values become one. On its own sample of three subscriptions it infers **20 properties, 18 required**, with 6 enums and 3 formats.

## The three outputs

**JSON Schema** is the portable one. Use it for request validation in any language, for documentation, or as the input to other generators.

**TypeScript** gives you interfaces for your client code. Nested objects get their own interface, named after the key.

**Zod** gives you a schema that validates at runtime *and* produces the TypeScript type with `z.infer<typeof Subscription>`. If the data crosses a trust boundary, such as a webhook, a third-party API or a file upload, this is the one to use, because TypeScript types alone disappear at runtime.

## Check it against a document

The fourth tab, *Validate a document*, checks another payload against the inferred schema and lists every error with its path: a missing required field, a value outside an enum, a string where a number was expected. Paste the strangest real response you can find. Every error is either a bug in the data or a rule you should loosen.

[Open Schema and types](/json-schema)

## Other tools

- **quicktype** generates types in many languages (TypeScript, Go, Rust, Swift, Kotlin, C# and more) from JSON samples or a schema, from the command line or its website. If you need Go structs or Swift models, it is the obvious choice.
- **Your API's OpenAPI document**, if it has one, beats any inference, because it states what is allowed, not just what was seen. Generate types from that first.
- **Hand-written Zod**, starting from the inferred version, is where most teams end up for the few payloads that really matter.

## Frequently asked

**Which JSON Schema version does json0 produce?** Draft 2020-12, with `$schema` set accordingly.

**Does it handle arrays of mixed objects?** Yes: all elements of an array are merged into one item schema, so properties that appear in only some elements come out optional.

**Is my payload uploaded?** No. Inference and validation run in the browser.
