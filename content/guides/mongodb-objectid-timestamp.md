---
title: What's inside a MongoDB ObjectId, and how to query _id by date
headline: The time inside a MongoDB ObjectId
description: Every ObjectId carries its creation time. How to read it in mongosh, JavaScript and Python, how to build an _id range for a time window, and the caveats that come with using _id as a clock.
date: 2026-10-25
kind: guide
tool: objectid
---

**Short answer:** the first 4 bytes (8 hex characters) of an ObjectId are its creation time in seconds since 1970. `507f1f77bcf86cd799439011` starts with `507f1f77`, which is 1350508407, or 2012-10-17 21:13:27 UTC. To find documents created in a window, query `_id` between two ObjectIds built from those times with the other 16 hex characters set to zero.

## The 12 bytes

```text
507f1f77  bcf86cd799  439011
└──┬───┘  └───┬────┘  └─┬──┘
timestamp  random     counter
4 bytes    5 bytes    3 bytes
```

- **Timestamp:** seconds since the Unix epoch, big-endian. This is the only part that means anything to you.
- **Random value:** 5 bytes chosen once per process. Ids made by the same process share it, so counting distinct random values tells you roughly how many processes or clients created a set of documents.
- **Counter:** 3 bytes, starting at a random value and incremented for each new id, so ids from one process created in the same second stay unique and ordered.

Older drivers put a machine id and a process id where the random value is now. You will still meet those ids in old data; the timestamp works the same way.

## Reading the time

**In json0**, paste one id or a whole list into [ObjectId](/objectid), as hex, `ObjectId("…")` or `{"$oid": "…"}`. Each one is decoded to its UTC time and its age, and selecting a row shows the three byte runs. The summary tells you the time range and how many distinct processes made the ids.

**In mongosh:**

```js
ObjectId("507f1f77bcf86cd799439011").getTimestamp()
// ISODate("2012-10-17T21:13:27.000Z")
```

**In JavaScript, without a driver:**

```js
const id = "507f1f77bcf86cd799439011";
new Date(parseInt(id.slice(0, 8), 16) * 1000).toISOString();
// "2012-10-17T21:13:27.000Z"
```

**In Python with PyMongo:**

```python
from bson import ObjectId
ObjectId("507f1f77bcf86cd799439011").generation_time
# a timezone-aware datetime: 2012-10-17 21:13:27+00:00
```

## Querying _id by date

Because ids sort by their timestamp first, a range on `_id` is a range in time. Build the boundary ids from the two times, with the random value and counter set to zero:

```js
const toId = d => ObjectId(Math.floor(d.getTime() / 1000).toString(16).padStart(8, "0") + "0000000000000000");

db.orders.find({
  _id: {
    $gte: toId(new Date("2026-10-01T00:00:00Z")),
    $lt:  toId(new Date("2026-11-01T00:00:00Z"))
  }
});
```

The lower bound is inclusive and the upper bound exclusive, so every document created in October 2026 matches, whatever its random value and counter. The query uses the `_id` index, which every collection has, so it stays fast even when there is no index on a `created_at` field.

json0 builds this filter for you: set *From* and *To* under **Range filter** and copy it.

## Generating ids for a given time

Tests and backfills sometimes need ids that look like they were created at a particular moment. json0's **Generate** panel makes valid ObjectIds for any date and time, with a random value and a counter, so they sort correctly next to real ones. In code, the BSON libraries have a helper for this (for example `ObjectId.createFromTime` in the JavaScript `bson` package).

## Caveats

- **It is the client's clock.** Drivers usually generate the id, not the server, so a client with a wrong clock writes wrong timestamps. Do not use `_id` as an audit timestamp.
- **One-second resolution.** For anything finer, store a date field.
- **Order is only roughly by time.** Ids from different processes created in the same second sort by their random value, not by which came first.
- **Ids are guessable.** Knowing roughly when a document was made narrows its id down a lot. Never rely on an ObjectId being secret in a URL.
- **The year 2106.** Four bytes of seconds run out in February 2106. You have time.

## Frequently asked

**Can I trust `_id` order for "newest first"?** For most feeds, sorting by `_id` descending is a good, index-backed approximation of newest first. For anything where order must be exact across machines, add a timestamp field and an index.

**Is an ObjectId a UUID?** No. A UUID is 16 bytes and version 4 UUIDs are entirely random; an ObjectId is 12 bytes and starts with a timestamp. json0's [UUID generator](/uuid) makes version 4 UUIDs if you need those.
