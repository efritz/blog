+++
title = "How to Stop Autovacuum from Sucking up Your Performance"
date = "2022-05-18"
external = "https://thenewstack.io/how-to-stop-autovacuum-from-sucking-up-your-performance/"
+++

{{< hero
    src="/images/external/autovacuum/mvu-hero.png"
    headline="We’ve formulated some tips and tricks to minimize the amount of work the database has to do to keep up with the write scale."
>}}

Modern databases are magic, but that doesn’t mean they’re impossible to understand. The core concepts on which relational database systems are built have remained largely unchanged since their introduction in the 1970s.

We do, on the other hand, have over 50 years of compounding implementation tricks and performance improvements that make the usage of these systems more expressive and more performant at an ever-increasing scale.

Relational databases are a ubiquitous dependency in a large proportion of modern application code, so not all usage patterns can be optimized.

This creates scenarios where performance cliffs appear seemingly out of nowhere. But by pulling back the covers just a little bit, we can dispel some of this performance magic and lend concrete advice.

# When Databases Deal with Concurrent Users, They Bloat

Many relational database systems today use a mechanism called MVCC (Multiversion Concurrency Control) to achieve transactional consistency. Under this system, each row in the database is tagged with temporal bounds indicating the set of transactions that can see a particular row of data. This tagging allows transactions to read their own modifications before being committed but, more importantly, hides the modifications of transactions that are not yet committed to external observers. And it does so in a way that reads do not block writes and vice versa.

As a consequence of this system, deleted rows cannot be removed while they are still visible to an existing transaction. Updates, similarly, are generally implemented as a delete and insert pair, except for a handful of performance-optimized cases. This ensures that the world view of any single transaction does not change within its lifetime. In effect, each transaction operates over a unique and stable snapshot of the database, appearing as if it has mutually exclusive access for updates.

There are, however, downsides to this system. Outdated or deleted rows will remain on disk until they are explicitly pruned via a vacuum operation. We refer to such invisible rows as bloat, and bloat can negatively affect the performance of table and index access due to the increase of irrelevant data. This type of [fragmentation](https://en.wikipedia.org/wiki/Fragmentation_(computing)?utm_source=thenewstack&utm_medium=website&utm_content=inline-mention&utm_campaign=platform) is especially problematic on update-heavy workflows.

# Some Workloads Create as Much Bloat as Possible

In Postgres, vacuum operations are periodically performed in the background by the autovacuum daemon under normal operation. If there are no long-running transactions keeping old data visible and the autovacuum daemon is tuned correctly, table and index bloat should stay minimal without consuming too many resources sweeping up the crumbs of data from the floor.

Unfortunately, not all workloads are created equal, and some of them seem even uniquely suited to create as much bloat as possible. At Sourcegraph, we’ve experienced such a workload (and have written about it <!-- TODO: relative -->[here](https://about.sourcegraph.com/blog/optimizing-a-code-intel-commit-graph?utm_source=thenewstack&utm_medium=website&utm_content=inline-mention&utm_campaign=platform) and <!-- TODO: relative -->[here](https://about.sourcegraph.com/blog/optimizing-a-code-intel-commit-graph-part-2?utm_source=thenewstack&utm_medium=website&utm_content=inline-mention&utm_campaign=platform)) and developed some general bulk update idioms to help us play nicely with the hardworking (and unthanked) autovacuum daemon.

This particular workload would cause impressively rapid increases in disk usage while the number of observed rows stayed within the same order of magnitude. Vacuum processes simply could not keep up, and eventually the database would lock up once its disk quota was reached. As a secondary but much less critical effect, both read and write performance tanked globally within our application.

{{< lightbox src="https://cdn.thenewstack.io/media/2022/05/ec900170-image1-1024x384.png" absolute="true" >}}

# A Vacuum-Friendly Solution for Reducing Bloat and Improving Performance

We can generalize this workload down to a few common characteristics, which are shared by other use cases in the domains of [ETL pipelines](https://en.wikipedia.org/wiki/Extract,_transform,_load?utm_source=thenewstack&utm_medium=website&utm_content=inline-mention&utm_campaign=platform) and highly denormalized data schemas, or just by storing the result of a batch computation in the [database you already have](https://brandur.org/fragments/single-dependency-stacks?utm_source=thenewstack&utm_medium=website&utm_content=inline-mention&utm_campaign=platform).

1. Updates to the table are done in bulk. Either the entire table is rewritten on updates or all rows keyed by the same identity value are rewritten at once on updates.
1. The new data and existing data have some sort of incremental relationship such that a significant number of rows between the two datasets are unchanged.
1. Batch operations run either frequently or unpredictably enough that issuing a VACUUM FULL every night at midnight is not an effective solution.

The simplest implementation for this type of workflow is to issue a statement to delete the existing data and then issue another statement that re-inserts the new data. When performed within a transaction, this gives us the behavior we are after, but it also creates an incredible amount of garbage.

A vacuum-friendly solution that we’ve adopted in a few performance-critical update paths takes a slightly different approach.

First, all of the new data is inserted into a temporary table. Since the entire table is visible only to the owning transaction and is dropped once the transaction is committed or rolled back, there is no reason for Postgres to bother vacuuming it. This gives us something analogous to a [memory arena](https://en.wikipedia.org/wiki/Region-based_memory_management?utm_source=thenewstack&utm_medium=website&utm_content=inline-mention&utm_campaign=platform) in garbage-collected programming languages. By definition, insertions into this table are bloatless.

Next, we perform a series of comparisons and corrections between the temporary and target table. Rows that exist in the target table but not the temporary table are deleted. Rows that exist in the temporary table but not the target table are inserted. Rows that have been altered according to an application-defined identity are updated.

Also important, is the fact that rows that did not require an update were not removed and re-inserted into the table. This has a direct impact on the performance gain of this trick. If a dataset is highly incremental and a small fraction of the entire dataset being updated has actually changed, then the reduction in dead tuples will be significant. However, if a data set is barely incremental, then the relative performance gain will be low or even negative due to the extra overhead. This is basically the naive DELETE + INSERT implementation with a lot of extra baggage.

# Conclusion

This trick reduces the number of affected tuples to such a degree that the bloat of this target table drops effectively to zero. We’ve adopted this trick as [general advice](https://docs.sourcegraph.com/dev/background-information/sql/batch_operations?utm_source=thenewstack&utm_medium=website&utm_content=inline-mention&utm_campaign=platform#updates) when doing large bulk update operations at Sourcegraph.
