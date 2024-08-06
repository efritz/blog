+++
title = "Resume"
index = true
+++

## Resume

A [printable version](/assets/papers/Fritz%20-%20Resume.pdf) of this resume is also available.

### Work History

{{< content
    title="![render](/assets/images/logos/render.png) Render"
    meta="From 2023"
    >}}

The Datastores team enables managed Postgres and Redis databases balancing power, flexibility, and ease of use for end users. Currently, my efforts are focused on reducing compute and storage costs for hosting as well as increasing intelligent observability of database usage and performance to aid developers in self-serving optimization of their own applications.

{{< /content >}}

{{< content
    title="![sourcegraph](/assets/images/logos/sourcegraph.svg) Sourcegraph"
    meta="2019 to 2023"
    >}}

I was a staff-level software engineer leading the Language Platform Tea (a subteam of Code Intelligence). Our team worked to provide fast and precise code intelligence to power code navigation operations such as cross-repository go-to-definition and global find-references. Most recently, we were expanding our scope to usefully provide precise code intelligence data to other product teams at Sourcegraph.

My goals for the platform revolved around increasing adoption of precise code intelligence by supporting an increasing number of languages, build systems, and project configurations in our [auto-indexing infrastructure](https://sourcegraph.com/docs/code_navigation/explanations/auto_indexing); and pivoting the current persistence and API structure from [LSIF](https://lsif.dev/) to [SCIP](https://scip.dev/), a code intelligence index format that we developed in early 2022 that unlocks the next generation of code intelligence features.

I have on occasion ventured from my home team to solve impactful or urgent problems.

- **Executors** are an instance-external component which are tasked with running user-supplied (and possibly arbitrary) code safely in a sandbox. Executors were designed with a strong emphasis on security for both multi-tenant our SaaS offering as well as our single-tenant self-hosted offering, and achieves multi-tenant isolation via [Fircracker MicroVMs](https://firecracker-microvm.github.io/). Executors now power auto-indexing as well as our server-side code modification offering, both of which rely on the ability to execute user-supplied and possibly untrusted code.

- **Database migrations** were a mess! Developers adding new migrations would frequently conflict with concurrent activity (often subsequently breaking the `main` branch). Upgrades and rolling restarts would frequently require manual intervention from the instance's site-administrator, burdening end-users in our self-hosted environments and burdening on-call engineers with trivial issues for oru SaaS offering. To solve this, I designed a **migrator** component that would validate and apply database migrations prior to application startup (opposed to during). This separation allowed us to more easily extend and harden application of schema migrations. See the introductory [blog post](/articles/fixing-broken-migrations) for further technical details. In a similar spirit, I designed a system to apply [**out-of-band migrations**](https://sourcegraph.com/docs/admin/migration#mout-of-band-migrations), which run in the background of the instance over time. This is useful when migrating large amounts of data, or requiring Postgres-external behaviors as part of the migration process (e.g., encryption routines).

- **Multi-version upgrades** were unsupported until September 2022. Historically, Sourcegraph instances can only be upgrade a single minor version. As upgrades are a fairly hands-on process, the majority of our self-hosted instances were two or more versions behind our latest release (some instances running versions as old as two years). I continued my work on database migrations to extend the **migrator** utility so that it could skip forwards and backwards to any tagged release, allowing both upgrades through multiple versions, as well as downgrades. See the [blog post](/articles/multi-version-upgrades) for additional design details as well as a multitude of hurdles I encountered while fleshing out the nitty-gritty.

- **PageRank**, the algorithm behind determining relevance of Google's search results, was utilized to inform our own search results ordering. I implemented a proof-of-concept data pipeline that exports a large graph encoding a global set of source code text documents (over all repositories for which we have precise indexes) and symbol relationships between them (e.g., file A refers to a symbol in file B). This graph is ready by Spark executors in our cloud environment, outputting global PageRank scores for each document, which can subsequently be used to inform the order which we pack our trigram index shards. This allows our search backend to return highly relevant results first, without requiring a subsequent sorting step once relevant documents have been fetched. Sourcegraph's Head of Engineering, Steve Yegge, [blogged](https://about.sourcegraph.com/blog/new-search-ranking) about the future this indicates for the product. See the technical deep-dive [blog post](/articles/ranking-in-a-week) for specifics on this data pipeline and how we chose to construct such a document graph.

{{< /content >}}

{{< content
    title="Mitel"
    meta="2015 to 2019"
    >}}

I was a senior software engineer on the Labs team focused on building proof of concept solutions for new investment areas. Most recently, I was focused on building _Nighthawk_, an IFTTT-like engine to orchestrate communication of relevant parties during incident responses. Users could define their own workflows and integrate with a ecosystem that hosts third-party behavioral extensions. Before that, I was focused on Mitel's Internet of Things Collaboration strategy, _Kestrel_, which involved building out infrastructure for registering LoRa gateways and devices and reading, storing, and aggregating sensor readings.

Prior to the formation of the Labs team, I was on the team platform building [Summit](https://www.mitel.com/en-us/products/business-phone-systems/cloud/other/summit-platform) as part of Mitel's Unified Communications Platform as a Service offering. This allowed customers to build voice and SMS applications as Lua code that would run in a containerized sandbox.

I was the primary author the following infrastructure and developer experience projects, primarily written in Go and Python with a bit of C (via Redis modules).

- **Apollo** is an audio streaming server which mixes hold music and announcements from tenant-configurable playlists. The server self-regulates load by redirecting attached clients to servers which are already serving a particular audio file, minimizing the bytes in-flight from the audio storage system.

- **Bigboss** is a Mesos framework and deployment system for frequent-churn containers. Bigboss elastically schedules call processor services so that at any given time between 30-40% of all running processes are available to accept a new call without delay. When new call processor code is deployed, idle call processors are shut down and replaced with a fresh container running the updated version. The following image is a portion of the scheduler metrics dashboard over the course of two weeks (for one datacenter). Peaks indicate heavy call traffic, and the two-day flat line periods are the weekend, where call volume does not generally exceed our elastic scaling threshold.

{{< lightbox src="/images/resume/bigboss-dashboard.png" anchor="bigboss-dashboard" >}}

- **Charon** is a distributed limiting service which grants or denies an internal application permission to use a resource on behalf of a tenant based on current resource usage and the tenant's recent usage history. The service increases infrastructure reliability by ensuring that no resource is overcommitted, and ensures that no single tenant can utilize a disproportionate amount of resources with respect to a tenant's service-level agreement. Technical details are available in the [Whitepaper](/papers#charon), and an interactive example is available in the [request simulator](/articles/charon-simulator).

- **Deposition** is an internal tool used to track software lifecycle metadata such as builds, dependencies (including vulnerabilities), and deployments of our internal infrastructure. See the [blog post](http://localhost:1313/articles/deposition/) for the original motivation and additional product and implementation details.

{{< lightbox src="/images/resume/deposition-products.png" anchor="deposition" >}}

- **Domo** is an S3-aware HTTP proxy layer in front of Ceph Object Store which allows for automatic, instantaneous failover to a remote data center when the local Ceph cluster is slow or unresponsive. The server synchronizes clusters across data centers on write requests so that a write to any data center will (eventually) become globally consistent.
{{< /content >}}

{{< content
    title="ESDN, Inc."
    meta="2008 to 2011"
    >}}

Developed an e-commerce and supply chain web application which streamline interactions between jewelry consumers, retailers, and suppliers. Major projects include a consumer-facing jewelry collection showcase and a retail (brick-and-mortar) location management system. Primary technologies include ASP.NET MVC using C# and MSSQL.
{{< /content >}}

### Education

{{< content
    title="Ph.D. Computer Science"
    meta="2014 to 2018"
    >}}

{{% small %}}University of Wisconsin &ndash; Milwaukee{{% /small %}}

My dissertation, [Waddle - Always-Canonical Intermediate Representation](/papers#dissertation), was supervised by [John Boyland](https://uwm.edu/engineering/people/boyland-john/).

Abstract: _Program transformations that are able to rely on the presence of canonical properties of the program undergoing optimization can be written to be more robust and efficient than an equivalent but generalized transformation that also handles non-canonical programs. If a canonical property is required but broken earlier in an earlier transformation, it must be rebuilt (often from scratch). This additional work can be a dominating factor in compilation time when many transformations are applied over large programs. This dissertation introduces a methodology for constructing program transformations so that the program remains in an always-canonical form as the program is mutated, making only local changes to restore broken properties._

{{< /content >}}

{{< content
    title="MS Computer Science"
    meta="2011 to 2013"
    >}}

{{% small %}}University of Wisconsin &ndash; Milwaukee{{% /small %}}

My thesis, *Optimizing the RedPrairie Distance Cache*, was supervised by [Christine Cheng](https://uwm.edu/engineering/people/cheng-christine/).

Abstract: _RedPrairie's Transportation Management products are based on a suite of optimizers that approximate solutions for the Vehicle Routing Problem, a well-known NP-hard problem. The optimizers work by heuristically updating portions of route assignments and require many prohibitively expensive queries to a Geographic Information System. The thesis explores several strategies for caching queries in-memory -- specifically, how can hash tables be organized to maximize the entries which can fit in resident memory, and which cache eviction strategies retain the most useful data with respect to the optimizer's access patterns._

RedPrairie was acquired by [JDA Software Group, Inc](https://jda.com) in 2012.

{{< /content >}}

{{< content
    title="BFA Film"
    meta="2007 to 2011"
    >}}

{{% small %}}University of Wisconsin – Milwaukee{{% /small %}}

I received a Bachelor of Fine Arts in undergrad studying film theory and production.

{{< /content >}}

### Teaching History

{{< content
    title="University of Wisconsin -- Milwaukee"
    meta="2011 to 2016"
    >}}

- {{% icon "check-square resume-icon" %}} CompSci **658 / 790** -- iOS Programming
- {{% icon "check-square resume-icon" %}} CompSci **482**       -- Server-side Internet Programming
- {{% icon "check-square resume-icon" %}} CompSci **481**       -- Rich Internet Applications
- {{% icon "square       resume-icon" %}} CompSci **655**       -- Compiler Implementation Laboratory
- {{% icon "square       resume-icon" %}} CompSci **251**       -- Intermediate Computer Programming
- {{% icon "square-o     resume-icon" %}} CompSci **744**       -- Text Retrieval and Its Applications in Biomedicine
- {{% icon "square-o     resume-icon" %}} CompSci **395**       -- Social, Professional, Ethical Issues
- {{% icon "square-o     resume-icon" %}} CompSci **361**       -- Introduction to Software Engineering
- {{% icon "square-o     resume-icon" %}} CompSci **351**       -- Data Structures and Algorithms
- {{% icon "square-o     resume-icon" %}} CompSci **315**       -- Assembly Language Programming
- {{% icon "square-o     resume-icon" %}} CompSci **201**       -- Introduction to Computer Programming
- {{% icon "square-o     resume-icon" %}} CompSci **150**       -- Survey of Computer Science

{{< legend
    icon="check-square"
    content="*created*: designed the syllabus, focus, coursework, and lectures the first semester this course was offered"
    >}}

{{< legend
    icon="square"
    content="*instructed*: re-designed the coursework and lectures of an existing course"
    >}}

{{< legend
    icon="square-o"
    content="*assisted*: instructed labs, graded student work, prepared assignments"
    >}}
{{< /content >}}
