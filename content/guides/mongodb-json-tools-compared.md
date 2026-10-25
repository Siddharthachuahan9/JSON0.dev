---
title: Working with MongoDB JSON without a database: Compass, mongosh and json0 compared
headline: MongoDB JSON without a database
description: Extended JSON, ObjectId timestamps, testing a find filter and checking a collection's schema. Which jobs need Compass or mongosh, and which you can do on pasted documents in the browser.
date: 2026-10-25
kind: comparison
tool: mongo-ejson
---

**Short answer:** Compass and mongosh are the right tools when you are connected to the database. When all you have is a pasted document, an export file or an ObjectId from a log line, you do not need a connection: json0's MongoDB tools convert Extended JSON, read ObjectIds, run a find filter and analyse a schema in the browser.

Most of my MongoDB debugging does not start in the database. It starts with a document someone pasted in Slack, an `_id` in an error log, or an export a customer sent. Opening Compass and connecting to the right cluster for those is slow, and sometimes you are not allowed to connect at all.

## The jobs

| Job | MongoDB Compass | mongosh | json0 |
| --- | --- | --- | --- |
| Needs a connection | Yes | Yes, for queries | No |
| Convert shell syntax (`ObjectId(...)`, `ISODate(...)`) to JSON | Export a query result | `EJSON.stringify(doc)` | Paste, choose canonical, relaxed, shell or plain JSON |
| Read the time inside an ObjectId | Shown in the document view | `ObjectId("…").getTimestamp()` | Paste one or many; see time, random value and counter |
| Build an `_id` range for a time window | By hand | By hand | Generated from two dates |
| Test a find filter | Query bar on a collection | `db.coll.find(filter)` | On pasted documents, with projection, sort and limit |
| Field types and presence across documents | Schema tab, on a sample | Write an aggregation | On pasted or exported documents |
| Aggregation, indexes, explain plans | Yes | Yes | No |

## Extended JSON

MongoDB stores BSON, which has types JSON lacks: ObjectId, 64-bit integers, Decimal128, dates, binary. Extended JSON v2 spells those types out so they survive a trip through plain JSON. It has two modes:

- **Canonical** keeps every type: `{"$numberLong": "50"}`, `{"$date": {"$numberLong": "1565546054692"}}`.
- **Relaxed** is easier to read and drops what it can: `50`, `{"$date": "2019-08-11T17:54:14.692Z"}`. Converting relaxed back to BSON can lose types, because `50` could be an Int32, an Int64 or a double.

`$oid` and `$numberDecimal` look the same in both modes.

**In mongosh**, `EJSON.stringify(doc)` and `EJSON.serialize(doc)` go from shell types to Extended JSON, and `EJSON.parse` and `EJSON.deserialize` go back. **On the command line**, `mongoexport --jsonFormat=canonical` writes canonical Extended JSON; the default is relaxed.

**In json0**, paste a document in any of the three syntaxes, including what mongosh prints with `ObjectId('…')`, `ISODate('…')` and `NumberLong(…)`, and pick the output: canonical, relaxed, mongosh shell or plain JSON. The panel below lists every typed value by its path, so you can see which value is a Decimal128 or a Long before you convert to plain JSON and lose that.

[Open Extended JSON](/mongo-ejson)

## ObjectIds

An ObjectId is 12 bytes: a 4-byte timestamp in seconds, a 5-byte random value chosen once per process, and a 3-byte counter. The timestamp is the useful part: every `_id` tells you when the document was created, to the second.

mongosh gives you `ObjectId("507f1f77bcf86cd799439011").getTimestamp()`, one id at a time. json0 decodes a whole list at once, from hex, `ObjectId("…")` or `{"$oid": "…"}`. It also groups ids by their random value, which tells you how many processes created them, and it builds the filter that finds documents created between two dates:

```js
{ _id: { $gte: ObjectId("…"), $lt: ObjectId("…") } }
```

That query uses the `_id` index, which a filter on a separate `created_at` field may not have.

[Decode ObjectIds](/objectid) · [How ObjectId timestamps work](/guides/mongodb-objectid-timestamp)

## Testing a find filter

In Compass you type a filter into the query bar of a collection; in mongosh you run `find()`. Both need the data to be in a database you can reach.

json0's query tester runs the filter on documents you paste. It supports the common operators: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$exists`, `$type`, `$regex`, `$size`, `$all`, `$elemMatch`, `$not`, `$and`, `$or` and `$nor`, plus projection, sort and limit. It follows MongoDB's rule that a condition on an array field matches when any element matches, which is the source of many "why does this match?" questions.

It is not a database. There are no indexes, no collation, no `$expr`, `$where`, text or geospatial queries, and no aggregation. Use it to get the filter right, then run it for real.

[Open the query tester](/mongo-query)

## Schema analysis

Compass's Schema tab analyses a *sample* of a collection and shows each field's types with their share, how often the field is missing, and charts of the values. It is excellent when you can connect.

json0's schema analyzer does the same reading on documents you paste or export: every field path, its types with their share, and how often it is present. It flags fields with mixed types, such as `seats` stored as an Int32 in nine documents and as a String in one. Those mixed fields are the ones that break a typed client or a `$sum`.

[Open the schema analyzer](/mongo-schema)

## Where your data goes

Compass and mongosh talk to your database and nowhere else. json0's MongoDB tools run in the page: nothing you paste is uploaded, which is the point when the document is a customer's record.

## When to use which

- **Connected and exploring a collection:** Compass.
- **Scripts, migrations, aggregation, explain plans:** mongosh.
- **A pasted document, an export file or an id from a log, and no connection:** json0.
