+++
date = "2016-10-02T22:55:05-04:00"
title = "Resume"
index = true
+++

## Resume

A [printable version]({{% asset "/papers/Fritz - Resume.pdf" %}}) of this resume is also available.

### Work History

{{< content
    title="Mitel"
    meta="2015 to Present"
    >}}

I am a software developer on the Next Generation Architecture team, which is currently focused on building Mitel's Internet of Things Collaboration strategy. This involves building out infrastructure for registering Lora (and future) gateways and devices and reading, storing, and aggregating sensor readings.

We were previously focused on building [Summit](https://www.mitel.com/en-us/products/business-phone-systems/cloud/other/summit-platform) as part of Mitel's Unified Communications Platform as a Service. This allowed customers to build voice and SMS applications as Lua code that would run in a containerized sandbox.

I was the primary author the following infrastructure services written in a mix of Go, Python, and C (in the form of Redis modules).

- **Charon** is an distributed limiting service which grants or denies an internal application permission to use a resource on behalf of a tenant based on current resource usage and the tenant's recent usage history. The service increases infrastructure reliability by ensuring that no resource is overcommitted, and ensures that no single tenant can utilize a disproportionate amount of resources with respect to a tenant's service-level agreement. Technical details are available in the [Whitepaper](/papers#charon).

- **Domo** is an S3-aware HTTP proxy layer in front of Ceph Object Store which allows for automatic, instantaneous failover to a remote data center when the local Ceph cluster is slow or unresponsive. The server synchronizes clusters across data centers on write requests so that a write to any data center will (eventually) become globally consistent.

- **Bigboss** is a Mesos framework and deployment system for frequent-churn containers. Bigboss elastically schedules call processor services so that at any given time between 30-40% of all running processes are available to accept a new call without delay. When new call processor code is deployed, idle call processors are shut down and replaced with a fresh container running the updated version. The following image is a portion of the scheduler metrics dashboard over the course of two weeks (for one datacenter). Peaks indicate heavy call traffic, and the two-day flat line periods are the weekend, where call volume does not generally exceed our elastic scaling threshold.

{{< lightbox src="/images/bigboss-dashboard.png" anchor="bigboss-dashboard" >}}

- **Apollo** is a audio streaming server which mixes hold music and announcements from tenant-configurable playlists. The server self-regulates load by redirecting attached clients to servers which are already serving a particular audio file, minimizing the bytes in-flight from the audio storage system.
{{< /content >}}

{{< content
    title="ESDN, Inc."
    meta="2008 to 2011"
    >}}

Developed an e-commerce and supply chain web application which streamline interactions between jewelry consumers, retailers, and suppliers. Major projects include a consumer-facing jewelry collection showcase and a retail (brick-and-mortar) location management system. Primary technologies include ASP.NET MVC using C# and MSSQL.
{{< /content >}}

### Education

{{< content
    title="PhD Computer Science"
    meta="2014 to 2018"
    >}}

{{% small %}}University of Wisconsin &ndash; Milwaukee{{% /small %}}

My dissertation, [Waddle - Always-Canonical Intermediate Representation](/papers#dissertation), was supervised by [John Boyland](http://www.cs.uwm.edu/faculty/boyland/).
{{< /content >}}

{{< content
    title="MS Computer Science"
    meta="2011 to 2013"
    >}}

{{% small %}}University of Wisconsin &ndash; Milwaukee{{% /small %}}

My thesis, *Optimizing the RedPrairie Distance Cache*, was supervised by [Christine Cheng](http://www.cs.uwm.edu/faculty/ccheng/).

RedPrairie's Transportation Management products are based on a suite of optimizers that approximate solutions for the Vehicle Routing Problem, a well-known NP-hard problem. The optimizers work by heuristically updating portions of route assignments and require many prohibitively expensive queries to a Geographic Information System. The thesis explores several strategies for caching queries in-memory -- specifically, how can hash tables be organized to maximize the entires which can fit in resident memory, and which cache eviction strategies retain the most useful data with respect to the optimizer's access patterns.

RedPrairie was acquired by [JDA Software Group, Inc](https://jda.com) in 2012.

{{< /content >}}

### Teaching History

{{< content
    title="University of Wisconsin -- Milwaukee"
    meta="2011 to 2016"
    >}}

- {{% icon "check-square class-icon" %}} CompSci **658 / 790** -- iOS Programming
- {{% icon "check-square class-icon" %}} CompSci **482**       -- Server-side Internet Programming
- {{% icon "check-square class-icon" %}} CompSci **481**       -- Rich Internet Applications
- {{% icon "square       class-icon" %}} CompSci **655**       -- Compiler Implementation Laboratory
- {{% icon "square       class-icon" %}} CompSci **251**       -- Intermediate Computer Programming
- {{% icon "square-o     class-icon" %}} CompSci **744**       -- Text Retrieval and Its Applications in Biomedicine
- {{% icon "square-o     class-icon" %}} CompSci **395**       -- Social, Professional, Ethical Issues
- {{% icon "square-o     class-icon" %}} CompSci **361**       -- Introduction to Software Engineering
- {{% icon "square-o     class-icon" %}} CompSci **351**       -- Data Structures and Algorithms
- {{% icon "square-o     class-icon" %}} CompSci **315**       -- Assembly Language Programming
- {{% icon "square-o     class-icon" %}} CompSci **201**       -- Introduction to Computer Programming
- {{% icon "square-o     class-icon" %}} CompSci **150**       -- Survey of Computer Science

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
