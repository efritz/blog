+++
title = "Multi-version upgrades"
slug = "multi-version-upgrades"
date = "2022-10-25"
showpagemeta = true
external = "https://about.sourcegraph.com/blog/multi-version-upgrades"
icon = "sourcegraph"
tags = ["sourcegraph"]

[hero]
image = "/images/external/mvu/hero.png"
caption = "Sourcegraph administration just got an order-of-magnitude quality-of-life improvement. Using a Sourcegraph 4.0 (or later) migrator utility, you can upgrade your on-prem installation of Sourcegraph from 3.20 directly to Sourcegraph 4.0 and beyond."
+++

It's finally happened.

The most obnoxious restriction (by a very wide margin) related to administration of a Sourcegraph instance no longer applies. Sourcegraph instances (v3.20 or newer) are now able to upgrade directly to a future release, without the requirement to hit every minor release along the way.

A recent peek at our customer instance distribution showed that 70% of our self-hosted customers are on a "historic" release of Sourcegraph (older than two months). Larger customer instances also tend to approach upgrades a bit more cautiously, adding significant weight to the use of older releases. Note that [Sourcegraph v3.20](https://about.sourcegraph.com/blog/release/3.20) was released fairly _early_ in the most recent pandemic era, and we've spent the last two years of that era shipping improvements and building new features and workflows for an on-prem audience that was largely unable to benefit from the effort.

[Multi-version upgrades](https://sourcegraph.com/docs/admin/updates), in contrast to the "standard upgrade" approach, use the [`migrator` tool](/articles/fixing-broken-migrations) to perform the sequence of schema and in-place data migrations that _would happen_ if the user were to perform a chain of upgrades that hit every minor release on the way to their target. This tool makes upgrading directly to our [4.0 release](https://about.sourcegraph.com/blog/release/4.0) a technical feasibility for the vast majority of our customers.

At first glance, it may seem that multi-version upgrades are simply "standard upgrades in a `for` loop." While that _is_ the basic idea, there's also a world of nuance surrounding it. Let's dive in.

### The migration journey

At the start of this journey, we used [golang-migrate](https://github.com/golang-migrate/migrate) to handle the details of our migrations. This tool would detect the current "schema state" of the database (stored in a forcibly created table with at most one row) and apply any migrations that were defined strictly after the currently reported state. This process would happen on application startup, generally no-oping after the first run that actually applied any missing migrations.

Each migration exists on disk as a pair of SQL files: one for the upgrade direction, and one for the downgrade direction. Each migration is defined in the same directory and ordered absolutely by a sequential numeric prefix. Unit tests ensure that the sequence has no gaps and that no migrations define the same prefix. The order of migration application is thereby determined by lexicographical ordering of the migration filenames.

{{< lightbox
    src="/images/external/mvu/treeview.png"
    alt="List of the (old) migrations directory."
    anchor="treeview-before" >}}

This process didn't cause any clearly attributable problems for years. Around the time we started a serious hunt-to-kill effort for flaky tests in our CI pipelines, we started also seeing initialization timeouts we could attribute to reading and applying every single migration we've ever defined back to back:

{{< lightbox
    src="/images/external/mvu/issue-extract.png"
    alt="Extract from a GitHub issue attributing the majority of time in initialization to running migrations"
    anchor="issue-extract" >}}

Because this problem would only get worse with time, we began to squash migration definitions by replacing the set of definitions at the head of the sequence with a single (yet equivalent) migration file. For Sourcegraph v3.9.0, we [squashed definitions](https://github.com/efritz/sourcegraph/commit/661c38c1f676cd0f642e0c7ba13ab4645c5861c4) that were also defined in Sourcegraph v3.7.0 into a single file. This cut startup time with an empty database from 20s to 5s and also reduced the chance of hitting the startup timeout in our testing environment.

{{< lightbox
    src="/images/external/mvu/simple-squash.png"
    alt="How old migration files are squashed."
    anchor="squash" >}}

Note that we are unable to squash migration definitions that are undefined in the source version of an upgrade. Doing so would make it impossible for the previous release to determine _which_ migration definitions to apply. Squashing in the manner described above guarantees that none of the migration definitions in the upgrade path from the previous minor version would be altered.

Unfortunately, this absolutely throws a wrench in the works for multi-version upgrades. But let's deal with that later. For now, we'll discuss the remaining evolutions of the migration definition files and let the wrenches form a huge pile we can take care of all at once.

In what turns out to be prerequisite work for making multi-version upgrades a possibility, we engineered what was basically a [drop-in replacement](/articles/fixing-broken-migrations) for golang-migrate. While the original goal was to separate application _deployment_ and _startup_ into individual (but related) concepts, it also allowed us maximum flexibility in how we defined and organized migrations on disk.

Because golang-migrate supported so many database systems, its design catered to the common features. As it happens, transactions were not one of the common features. Our replacement was designed _only_ to support Postgres, which allowed us to introduce [implicit transactions](https://github.com/efritz/sourcegraph/commit/4e2a91c8d54d41e0f3963ef18ebabdf3feb189e5) so that explicit `BEGIN;` and `COMMIT;` were not necessary in the migration definitions themselves.

In a related change, we [explicitly marked migration definitions](https://github.com/efritz/sourcegraph/commit/d8f9875a57e7c81c2b6939b93d8499efe870856b) that contain [indexes that are created concurrently](https://www.postgresql.org/docs/12/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY). As we've recently learned, concurrent index creation interacts with long-running transactions in ways that can appear unintuitive at the application level. Most notably, an index cannot be created concurrently within a transaction, and the concurrent index creation will block as long as there is a transaction that outlives the index creation. Marking these migrations statically allows us to apply these migrations in a distinct manner so that these properties do not end up deadlocking the migration flow.

In an unrelated change, we [explicitly marked privileged migrations](https://github.com/efritz/sourcegraph/commit/4d73c91ac253a3c176cba5a761db5428c852d670). Privileged migrations contain certain operations that require elevated or superuser privileges, such as enabling a Postgres extension. Marking these migrations statically allows us to present reduced-privileged users with the required manual steps to perform during the migration process.

In order to keep track of the various migration metadata, we [reorganized migration definitions into directories](https://github.com/efritz/sourcegraph/commit/fa4168548df6754ecd8b2c7ee2f956428df7b69d), each with three files: `up.sql`, `down.sql`, and `metadata.yaml`, as shown in the following image. Also of particular interest is the introduction of two entirely new and distinct database schemas controlled by the same migration infrastructure ([codeintel](https://github.com/efritz/sourcegraph/commit/07444839f7d0386faadd4dd19f3c2554295ea00a) and [codeinsights](https://github.com/efritz/sourcegraph/commit/e00458fc898550c2ff18abd07741b30329360783)).

{{< lightbox
    src="/images/external/mvu/tree.png"
    alt="File tree view of the (updated) migrations directory."
    anchor="treeview-after" >}}

In what is likely the largest departure from golang-migrate, we allowed migrations to [define multiple parents](https://github.com/efritz/sourcegraph/commit/473b6a9c1cc7e3d9bafa29bbb0c0abe905dcdf12). This allows our migration definitions to form a [directed acyclic graph](https://en.wikipedia.org/wiki/Directed_acyclic_graph) (instead of an absolutely ordered list). Note that in the image above our migrations no longer form a gapless sequence, and a [topological sort](https://en.wikipedia.org/wiki/Topological_sorting) over the migration graph is done to determine an application order.

Well that seemed like a bunch of work for no payoff. **Why do that at all?** Short answer: engineering ergonomics. When we had a gapless sequence we would _frequently_ run into merge conflicts when two engineers added migrations around the same time. Since each branch did not contain the other's migration, they would both choose the same sequence number. Because of limitations in our CI (no build queues and no non-stale base branch merge requirement), this conflict would, the majority of the time, be caught only after both branches had been merged and validation errors turned the `main` branch to go red.

The following image shows a reduced (but fairly accurate) migration graph over several minor releases. When a new migration is created, it chooses its own parents: the set of migration definitions that do not yet have any children. In this formulation, if two engineers add migrations around the same time, they may share a parent, but they also have distinct identifiers (with very high probability). They don't conflict, and should be able to be run in either order relative to one another as they were both developed in independent branches. Setting parents in this manner allows us to track explicit dependencies: the set of migrations that were already defined _at the time the new migration was created_.

{{< lightbox
    src="/images/external/mvu/graph-structures.png"
    alt="How migration graph structures change release after release."
    anchor="releases" >}}

### The pile of wrenches

The evolution of our migration definitions over time has created a number of issues to overcome for multi-version upgrades. The biggest issue comes from periodically squashing migration definitions, which erases information necessary to the upgrade process. In the image above, there's no valid way to upgrade from 3.36 to 3.39 in one step. The squashed migration contains _both_ the SQL that's already been run by the 3.36 installation, as well as the SQL defined in 3.37 that has yet to be applied. As we cannot partially apply a single migration, we cannot support this upgrade path.

To get around this, we need to undo the squash operation over time to get a single, consistent "stitched" migration graph.

{{< lightbox
    src="/images/external/mvu/timeline.png"
    alt="timeline"
    anchor="stitched" >}}

But doing so is basically time travel. For every Sourcegraph release in the upgrade support range, we take a snapshot of the migration definitions and overlay them on one another. Squashed migrations, identified by a specific naming convention, are handled distinctly in this process and provide hints on how to concatenate the migration graphs together. The result is a single unified migration graph that allows us to pinpoint any two versions and extract the sequence of SQL commands that need to be performed.

At least that was the [proposed solution](https://docs.google.com/document/d/1L9-0uCYMqf7Vc6XvkLZu2MQdd-gCBcPpP2IioUgb6xc/edit?usp=sharing). The reality of this process was much more involved than the high-level overview would make it seem, as squashed migrations were only one wrench in the pile. We still had to address the others.

We threw the **Wrench of Directory Restructuring** onto the pile when we moved our list of flat files into a hierarchy on disk. The snapshots we take of migration definitions at a particular release are done via `git` operations. When we detect a flat file, we will on-the-fly rewrite it to look like the new hierarchical version, with inferred contents for the metadata. Similarly, the **Wrench of Adding Additional Databases** was thrown onto the pile with the introduction of distinct codeintel and codeinsights schemas. We need to take special care in the early versions we support when one or more of these schemas are not yet defined, as well as the case where _only_ the frontend schema is defined in a different location (`migrations/` vs `migrations/frontend` once its siblings have arrived).

We threw the **Wrench of Privileged Migrations** onto the pile when we started marking certain SQL commands as requiring elevated permissions. Migration definitions that contain such a SQL command and don't mark it (or mark it but do not contain such a SQL command) fail static validation. Migration definitions squashed away before the introduction of this change fail these validation checks when added to the unified migration graph. In order to bring these definitions in line with our current assumptions, we will spot rewrite the metadata of such migration definitions as we stitch the graph together. We do this for several `frontend` ([1528395717](https://github.com/efritz/sourcegraph/commit/8afed374faadf57739d74d4b5decd011bf15f1e5), [1528395764](https://github.com/efritz/sourcegraph/commit/479d3b1aaf2bf3de60dff16d7c4a6b0b68831465), and [1528395953](https://github.com/efritz/sourcegraph/commit/ed345ab2790b7835f9de519c091730203edc0c28)), `codeintel` ([1000000003](https://github.com/efritz/sourcegraph/commit/479d3b1aaf2bf3de60dff16d7c4a6b0b68831465) and [1000000020](https://github.com/efritz/sourcegraph/commit/571b842012aeccfec7643ac85c3857d5db1490a6)), and `codeinsights` ([1000000001](https://github.com/efritz/sourcegraph/commit/ab5184f428ae2a42c70b19af6db25f18f63439ad) and [1000000027](https://github.com/efritz/sourcegraph/commit/ae44cde64da1bf79cf155172fd84ba8c81755a92)) migration definitions.

We deal with the **Wrench of Concurrent Indexes** in a similar way. Migration definitions squashed away before the introduction of our special-casing of concurrent index creation will miss the markers in their metadata. In this case we only have to spot rewrite migrations for the `frontend` schema, but there were a significant number of them ([1528395696](https://github.com/efritz/sourcegraph/commit/5f278c6ce9901f460a766cef7fa9d57aabbad10a), [1528395707](https://github.com/efritz/sourcegraph/commit/7d940c91ccfe5c9b023bea9c3c2749bcddc4ad92), [1528395708](https://github.com/efritz/sourcegraph/commit/7d940c91ccfe5c9b023bea9c3c2749bcddc4ad92), [1528395736](https://github.com/efritz/sourcegraph/commit/427b7962177629598c7bb93e891ebe78582ddcba), [1528395797](https://github.com/efritz/sourcegraph/commit/10136d0e55f8b732bdd397f7dbf567c6f80947ec), [1528395877](https://github.com/efritz/sourcegraph/commit/62b0320a436dc36abb01e2ff82223bb82fec211f), [1528395878](https://github.com/efritz/sourcegraph/commit/62b0320a436dc36abb01e2ff82223bb82fec211f), [1528395886](https://github.com/efritz/sourcegraph/commit/b23e687cb2189b1a5e5bc38b1c12fbc9c017fa01), [1528395887](https://github.com/efritz/sourcegraph/commit/b23e687cb2189b1a5e5bc38b1c12fbc9c017fa01), [1528395888](https://github.com/efritz/sourcegraph/commit/b23e687cb2189b1a5e5bc38b1c12fbc9c017fa01), [1528395893](https://github.com/efritz/sourcegraph/commit/2f9a01eb21aa4696154fc5ebd8b0674a5050bcf2), [1528395894](https://github.com/efritz/sourcegraph/commit/6d2d8175c53a9d6d97e060858d78c649a2367b35), [1528395896](https://github.com/efritz/sourcegraph/commit/24b34be1729e788a33c763ceb1e36a86695c0594), [1528395897](https://github.com/efritz/sourcegraph/commit/2266648474e1e738d301584234a79d6ad66fa0b4), [1528395899](https://github.com/efritz/sourcegraph/commit/d3a2474fa4887ba6b40920116a48cc8f2431e199), [1528395900](https://github.com/efritz/sourcegraph/commit/d3a2474fa4887ba6b40920116a48cc8f2431e199), [1528395935](https://github.com/efritz/sourcegraph/commit/5c54597ea600e3f368f5edffdc5617a0f061a72d), [1528395936](https://github.com/efritz/sourcegraph/commit/5c54597ea600e3f368f5edffdc5617a0f061a72d), and [1528395954](https://github.com/efritz/sourcegraph/commit/ed345ab2790b7835f9de519c091730203edc0c28)).

During this change we also started validating that any down-direction migrations do not create indexes concurrently. Concurrent index creation is meant to be something to aid in zero-downtime rolling upgrades where a full table lock would be difficult to acquire (or significantly disrupt production traffic). As downgrades are never meant to be an online operation, creation of _older_ indexes can always be done synchronously. Again, there were several violations in the `frontend` schema that needed spot rewrites ([1528395895](https://github.com/efritz/sourcegraph/commit/24b34be1729e788a33c763ceb1e36a86695c0594), [1528395901](https://github.com/efritz/sourcegraph/commit/d3a2474fa4887ba6b40920116a48cc8f2431e199), [1528395902](https://github.com/efritz/sourcegraph/commit/efb21c8799a921ba6a41d9702e5e085a36fe31ab), [1528395903](https://github.com/efritz/sourcegraph/commit/efb21c8799a921ba6a41d9702e5e085a36fe31ab), [1528395904](https://github.com/efritz/sourcegraph/commit/efb21c8799a921ba6a41d9702e5e085a36fe31ab), [1528395905](https://github.com/efritz/sourcegraph/commit/efb21c8799a921ba6a41d9702e5e085a36fe31ab), and [1528395906](https://github.com/efritz/sourcegraph/commit/efb21c8799a921ba6a41d9702e5e085a36fe31ab)).

The act of stitching the migration graph itself also uncovered an additional hurdle that wasn't entirely expected. One assumption is that, with the exception of squashed migration definitions, migrations are not modified after the release in which they were introduced. Turns out there were some valid (and a few less valid) reasons for modifying these files. Some migration files were written to be idempotent (adding `IF NOT EXISTS` to missing clauses) so that they can be run twice with no ill effects (a great property to strive for here). Some migration files had errors that were discovered only after the branch cut of that release (dropping the wrong index on the down direction, as the presence of the `IF NOT EXISTS` clause silenced the error). For each of these cases, we confirmed that the _newer_ version should be used in place of the older one, and specifically allow rewrites for several migration definitions: `frontend` ([1528395798](https://github.com/efritz/sourcegraph/commit/a83cb7f9696f82ebf678fe44c52c0c5f53b1821e), [1528395836](https://github.com/efritz/sourcegraph/commit/a83cb7f9696f82ebf678fe44c52c0c5f53b1821e), [1528395851](https://github.com/efritz/sourcegraph/commit/1c37bc4c3e52746e2d14982ea822c8ca8c1706db), [1528395840](https://github.com/efritz/sourcegraph/commit/3fc88c8f86c23aefcb0e3832f11464c32dcdd646), [1528395841](https://github.com/efritz/sourcegraph/commit/3fc88c8f86c23aefcb0e3832f11464c32dcdd646), [1528395963](https://github.com/efritz/sourcegraph/commit/276bd3513b286c29d127fbd11ede8735e5c3ab00), [1528395869](https://github.com/efritz/sourcegraph/commit/d46123c6cc198f7d08dc58d3b08c2490ffc68cfc), [1528395880](https://github.com/efritz/sourcegraph/commit/6f91f6e85639781c7195649b0e1efaa316ff1699), [1528395955](https://github.com/efritz/sourcegraph/commit/7a431e7624ee4f4254b2ca1fa51552fc4a5b37fb), [1528395959](https://github.com/efritz/sourcegraph/commit/7a431e7624ee4f4254b2ca1fa51552fc4a5b37fb), [1528395965](https://github.com/efritz/sourcegraph/commit/7a431e7624ee4f4254b2ca1fa51552fc4a5b37fb), [1528395970](https://github.com/efritz/sourcegraph/commit/7a431e7624ee4f4254b2ca1fa51552fc4a5b37fb), [1528395971](https://github.com/efritz/sourcegraph/commit/7a431e7624ee4f4254b2ca1fa51552fc4a5b37fb), [1644515056](https://github.com/efritz/sourcegraph/commit/7a431e7624ee4f4254b2ca1fa51552fc4a5b37fb), [1645554732](https://github.com/efritz/sourcegraph/commit/7a431e7624ee4f4254b2ca1fa51552fc4a5b37fb), [1655481894](https://github.com/efritz/sourcegraph/commit/bdf335ad3ff908f6654ce007af4fc52b507ec00e), [1528395786](https://github.com/efritz/sourcegraph/commit/cc29f310cb5db23e401625cc332782ef4fc4659d), [1528395701](https://github.com/efritz/sourcegraph/commit/9feaf6c228cc003a224cd3dc9144c477ac5f1e58), and [1528395730](https://github.com/efritz/sourcegraph/commit/96c2fa6ffab867560cc5141ed392d12c957506f9)), `codeintel` ([1000000020](https://github.com/efritz/sourcegraph/commit/6f91f6e85639781c7195649b0e1efaa316ff1699)), and `codeinsights` ([1000000002](https://github.com/efritz/sourcegraph/commit/58402b60b1e023cdeebe51f34592643d4c206830), [1000000001](https://github.com/efritz/sourcegraph/commit/ae44cde64da1bf79cf155172fd84ba8c81755a92), [1000000004](https://github.com/efritz/sourcegraph/commit/ae44cde64da1bf79cf155172fd84ba8c81755a92), and [1000000010](https://github.com/efritz/sourcegraph/commit/ae44cde64da1bf79cf155172fd84ba8c81755a92)).

There were also a number of odd-duck cases to tackle, which had existed until their squashing without being detected as buggy. To handle these cases, we had to [rewrite a migration that uses `COMMIT;` to checkpoint work](https://github.com/efritz/sourcegraph/commit/c7fdc454254253e323d9e427935d46be5a5f9319), [rearrange `DROP` commands to respect dependency order](https://github.com/efritz/sourcegraph/commit/246c9c6581f55851fd08bd7ab62e8698d2780871), [add a missing `DROP TYPE ...` command](https://github.com/efritz/sourcegraph/commit/dbc99016c52f07ff11c74016e861584c9464fcbf), and [fix migration renaming that happened when cherry-picking into patch release v3.34.2](https://github.com/efritz/sourcegraph/commit/276bd3513b286c29d127fbd11ede8735e5c3ab00).

After cleaning up this pile of wrenches, we have a unified migration graph that **passes our validation**, and can upgrade the _schema_ of a database from any version to any other version (within v3.20 and 4.0+). Unfortunately, schema migrations are only half of the upgrade process.

### Handling out-of-band migrations

Early in 2021, we [proposed](https://docs.google.com/document/d/1xA7M77OyU5l7a1wZLJAAyKHzgcXKHrlzOcnMtxVa44c/edit#heading=h.trqab8y0kufp) and implemented out-of-band migration machinery to perform large-scale data (non-schema) migrations in the background of the application. We needed a way to run large-scale rewrites over data on our `codeintel` database, which at the time held a 2TB data set. As these rewrites were pure SQL, it was tempting to put them into our existing migration infrastructure. As this was prior to our decoupling of migrations from application startup, we needed to ensure that all migrations finished within our Kubernetes health check. Failing to do so required manual engineer intervention to run the failed migration.

This happened quite frequently.

Each out-of-band migration is defined with specific bounds within which it is expected to run: an _introduced version_ matching the Sourcegraph release in which it first starts running in the background, and an (eventually set) _deprecated version_ matching the first Sourcegraph release in which it no longer runs. When running a Sourcegraph release at which point an out-of-band migration is deprecated, the application startup sequence validates that the migration has completed. If the migration is incomplete, then there may be data that is no longer readable by the new version, and the adminstrator is instructed to roll back to the previous version and wait for it to complete.

Multi-version upgrades become problematic when we cross a Sourcegraph release in which an out-of-band migration has been deprecated. We can run the schema migrations, but the application will still refuse to start when it sees the incomplete migration. Even worse, we can construct upgrade paths that are impossible to perform because they skip over **both** the introduced and deprecated version of an out-of-band migration.

To solve this, we also run the out-of-band migrations in the migrator, interleaved with the schema migrations.

{{< lightbox
    src="/images/external/mvu/oobmigrations.png"
    alt="How out-of-band migrations complicate multi-version upgrades."
    anchor="oobmigrations" >}}

In the example above, upgrading from v3.37 to v3.40 would require the completion of out-of-band migrations #1-#3. To make things a bit more difficult, the out-of-band migration code is only guaranteed to run against the database schema that existed within its lifetime. We cannot invoke out-of-band migration #3 with the v3.37.0 database schema, for example. This becomes a scheduling problem in which we upgrade the schema to a certain version, run out-of-band migrations to completion at that point, and continue the process.

### Conclusion

We've continued to iterate on our schema and data migration infrastructure to remove entire classes of pain from our customers, and we are taking significant strides to decrease maintenance burden. Keep your eyes peeled for future improvements in this area.

If your next upgrade goes well, let me know at [@ericfritz](https://twitter.com/ericfritz).
