+++
title = "Schema Design - Part 3: NoSQL"
slug = "schema-design-nosql"
date = "2020-01-02T00:00:00-00:00"
tags = ["schema-design", "nosql"]
showpagemeta = true
+++

TODO

## Manhunt

At Mitel, I authored **Reflex**, a product that triggered and managed *incidents* from external events. An incident opened a common line of communication (chat room, conference call, shared documents, etc) for the parties involved to communicate and troubleshoot an active incident. Incidents can be defined in stages, and if a condition is met (or not met) within a certain time period, the incident escalates to the next stage. Generally, these conditions would revolve around the acknowledgement of a user tied to an incident.

The service that dealt with contacting users and dealing with their responses was called **Manhunt** internally. Behaviorally, this service is similar to [PagerDuty](https://www.pagerduty.com/). The service defines users along with their preferred contact methods (automated phone call, text message, email, webhook, etc) and their relative order. A user may wish to be contacted via email and text with phone number A, and then a call to phone number B if there is no response within ten minutes. The service also manages and performs user *searches*. A search is opened with metadata used to template the contact attempts. A search ends once the user has responded to some method (via a [DTMF](https://en.wikipedia.org/wiki/Dual-tone_multi-frequency_signaling) response to a phone call, a text response, following a link in an email, etc).

This application was written to be hosted on AWS, so we chose [DynamoDB](https://aws.amazon.com/dynamodb/). We chose to go with the NoSQL approach due to the data we needed to track being minimally relational, and in large part due to the availability of [DynamoDB Streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html), which allowed us to attach event listeners to updates to the database. The remainder of this article outlines the design of the database schema for this service, and how the schema provides us a source of events to drive user searches.

### Doing It Wrong

DynamoDB is Amazon's key-value store offering based on the [whitepaper](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) from 2007. Apache [Cassandra](http://cassandra.apache.org/) is the open-source database that revolves around these same ideas.

At Mitel, we stored most of our data in PostgreSQL, but our deployment did not yet support [multi-master replication](https://en.wikipedia.org/wiki/Multi-master_replication#PostgreSQL) and was only writeable from our Chicago data center. We used Cassandra to store some class critical data which it could be written from our Kansas City data center in the event of a DC failover or network partition. This allowed us to continue processing calls, albeit in a degraded level of service.

As I was brushing up on the literature for DynamoDB in order to design this new application, I discovered that we were using Cassandra in a **very** wrong way. Despite the consulting from Datastax, we were still using Cassandra like a dumb key-value store. We were doing *some* things correctly (and were well aware to avoid some common issues), but we tended to design our schemas from a mostly-relational perspective: create a table for each entity type, and choose a primary key based on some data we always knew about (a tenant ID in our case) and whatever other values we were likely to search by. This didn't allow us to fetch related entities without subsequent queries, so our code likely suffered from a hand-rolled version of the [n+1 query problem](https://www.sitepoint.com/silver-bullet-n1-problem/).

The eye-opening resource was [this video](https://youtu.be/HaEPXoXVf2k?t=2962) from AWS re:Invent 2018 on advanced design patterns for DynamoDB (see also, [the slides](https://www.slideshare.net/AmazonWebServices/amazon-dynamodb-deep-dive-advanced-design-patterns-for-dynamodb-dat401-aws-reinvent-2018pdf)). In this video, Rick Houlihan suggest that [a single table](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html#bp-general-nosql-design-concepts) should be enough for the vast majority of applications.

*I instinctively called bullshit.* This chief technologist **clearly** doesn't know what he's talking about. It turns out that statement is correct, despite how freakishly un-intuitive it seems at first glance. It took me about a half-dozen re-watches of the video before it started to click. The magic concept that broke my relational design bias was [index overloading](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-gsi-overloading.html). This concept can be followed tersely by simply **not caring what your table column names are**. Once you accept this possibility into your heart, you really can fit all the data into a single table, and you really can design a schema for which *join-like* queries are freakishly efficient.

### The Database Schema

There is only one concept you really need to know about DynamoDB in order to understand the following schema: when querying for rows you **must** supply a [partition key](https://aws.amazon.com/blogs/database/choosing-the-right-dynamodb-partition-key/) value (for an equivalence comparison), and **can** supply a [sort key](https://aws.amazon.com/blogs/database/using-sort-keys-to-organize-data-in-amazon-dynamodb/) value (for a equivalence, numeric, range, or prefix comparison). That's really the only way you can fetch data (without getting into [post-fetch filtering](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html#Query.FilterExpression)).

Each table in DynamoDB has exactly one partition key and up to one sort key that constitutes its *primary key*. A table can be configured with a handful of [Global Secondary Indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html), which essentially creates additional primary keys on the table, which can be queried in the same manner. Behind the scenes, a write to a table with a GSI will transactionally write a projection of the same data to a different set of replicas, which geometrically increases the cost of writes to the table.

**Let's get into it.**

The following is a small set of sample data of the Manhunt DynamoDB table. It defines a partition key, a sort key, and two GSIs. The remaining attributes are un-indexed (they can't be used to query a row, but will be returned with the row and can also be used to filter data) and be thought of as unstructured JSON data.

In each row of this visualization there is an emphasized **field name** along with the `value`. The field name is how the value is interpreted once it comes back from the database, despite being stored by the generic keys `PK`, `SK`, `GSI1PK`, etc. Notice that the meanings of these values are overloaded for the same column in different rows: the partition key value for row 1 is a search identifier, but in row 2 it is a contact identifier instead. Assigning application-specific meaning to these columns on a row-by-row basis is the trick for fitting your application data into a single table.

{{< lightbox src="/images/manhunt-schema.png" anchor="manhunt-schema" >}}

This table shows four kinds of entities: *contact* (rows 5 and 6), *contactMethod* (rows 2, 3, and 7), *search* (rows 9 and 10), and *searchAttempt* (rows 1, 4, and 8). Additional fields for each entity are not shown for brevity. A contact method row has additional un-indexed fields to denote the contact method type, the destination, the number of seconds to wait for attempting to use this method, and a enabled/disabled flag. A search row has additional un-indexed fields for the search metadata and data about the search's resolution or cancellation. A search attempt row has additional un-indexed fields for the denormalized contact method data used for the attempt, the timestamp of the attempt, and whether/how the user responded.

Additionally, each row has an `entityType` field (omitted here) that holds the name of the entity the row represents. This is used to ensure application consistency on queries so that a 404 can be returned when requesting a search with the id of a contact entity, instead of failing to deserialize the row into an incompatible struct. This is not strictly necessary, but is a low-cost solution to making API endpoints a bit more ergonomic in these edge cases.

{{< lightbox src="/images/manhunt-schema-relations.png" anchor="manhunt-schema-relations" >}}

Each row has a very limited number of *slots* to put values by which the row can be queried. In order to discuss which values were chosen, let's take a deeper look into row 10, along with a few of the rows that share the same field and value pairs. Row 10 represents a search entity for the contact represented by row 5. Rows 1 and 4 represent an attempt of the search.

One schema design trick that I've ended up using frequently is to group rows hierarchically. The value of the partition key is the same for a *parent* entity as it is for its *children* (in this application, searches and search attempts, or contacts and contact methods). This works well for entity relations that would be [one-to-many relationship](https://en.wikipedia.org/wiki/One-to-many_(data_model)) in SQL parlance. The partition key for each of these rows is the unique identifier of the parent entity, and the sort key for each of the rows representing child entities is the unique identifier of the child entity. This leaves us with a choice for the sort key on the parent entity. In this application I chose to use a canned string representing the entity type (with the values `search` or `contact`, which happens to also be the value of the row's `entityType` field).

This schema makes it easy to query a particular top-level entity by its ID, as you also need to know the exact sort key for such queries (query where **PK** = $sid$ and **SK** = `'search'`). This also makes it easy to get a top-level entity along with all of its children (query where **PK** = $sid$). This second type of query takes a small amount of the work on the application side in order to decode each row as either a parent, or one of several children types. In this application, we have a distinct child entity for each parent, but in the Reflex application, we had parent entities with many more children (incident entities owned a set of resources, a set of searches, a set of attached users, and a set of reaction instances). This is also another benefit of tracking an entity type in the row, regardless of the existence of other fields: as this field exists for all rows, it's a safe thing to read before deserializing the remaining fields and tells us into which struct it can be deserialized.

Using this schema, you cannot query for *all* searches from the primary key without a table scan. We can, however, get all searches for a particular contact, given the contact entity's identifier -- this just requires us to query with the first global secondary index instead of the primary key. If there were other entity types which also encoded a contact identifier into the **GSI1PK** field, we could use the same entityType trick for filtering and safe deserialization. Similarly, we can get contacts for a particular domain (which is how the application organizes multi-tenancy) by querying the same global secondary index with a domain identifier.

We maintain a second global secondary index that is similar to the first global secondary index for search rows. The only difference is that the *status* of the search is prepended to the contact identifier. This allows us to query for all *active* searches for a particular contact (or canceled, successful, or failed searches) by querying a concatenation of the target search status and the target contact identifier. These two indexes could be reasonably collapsed into one (saving some space and some insertion time), but it was important for our application needs to be able to have a stable ordering searches for a contact with a particular status and searches for a contact regardless of it status. Using only the first global secondary index for this task would mean we would have to filter the searches by status post-fetch, which is far less efficient when the number of search records for a user are high. Using only the second global secondary index for this task would get us closer, but would require much more logic on the application side, as we would have to perform a [scatter-gather](https://aws.amazon.com/blogs/big-data/scaling-writes-on-amazon-dynamodb-tables-with-global-secondary-indexes/) query and combine the results with the correct sort order. Without much more complicated logic, an additional page of results may seem to go back in time from the user's perspective. This situation occurs with searches $s_1$, $s_2$, and $s_3$ where $s_1$ and $s_2$ are returned on the previous page, $s_2$ and $s_3$ have different statuses, and $s_1 < s_3 < s_2$.

### Possible Queries

Given the schema above, the following queries are possible.

<table>
<thead><tr><th colspan="2">Key Conditions</th><th>Description</th></tr></thead>
<tbody><tr><td>

**PK** = $sid$

</td><td>

**SK** = `'search'`

</td><td>

Get a search by id $sid$.

</td></tr><tr><td>

**PK** = $sid$

</td><td></td><td>

Get a search by id $sid$ along with its related attempts.

</td></tr><tr><td>

**PK** = $cid$

</td><td>

**SK** = `'contact'`

</td><td>

Get a contact by id $cid$.

</td></tr><tr><td>

**PK** = $cid$

</td><td></td><td>

Get a contact by id $cid$ along with its contact methods.

</td></tr><tr><td>

**GSI1PK** = $did$

</td><td></td><td>

Get all contacts belonging to a domain by id $did$. Results are ordered alphabetically by name.

</td></tr><tr><td>

**GSI1PK** = $cid$

</td><td></td><td>

Get all searches for a contact by id $cid$. Results are ordered chronologically.

</td></tr><tr><td>

**GSI1PK** = $cid$

</td><td>

**GSI1SK** < $d$

</td><td>

Get all searches for a contact by id $cid$ before a particular date $d$. Alternatively, get all records after a particular date by changing the sort key comparison operator.

</td></tr><tr><td>

**GSI2PK** = $s$ `#` $cid$

</td><td></td><td>

Get all searches with a particular status $s$ for a contact by id $cid$. Results are ordered chronologically.

</td></tr><tr><td>

**GSI2PK** = $s$ `#` $cid$

</td><td>

**GSI1SK** < $d$

</td><td>

Get all searches with a particular status $s$ for a contact by id $cid$ before a particular date $d$. Alternatively, get all records after a particular date by changing the sort key comparison operator.

</td></tr></tbody></table>

Each of these queries are **extremely** efficient. Because each query requires the partition key in full, and the partition key determines what node data occurs on, each query touches at most one node where the entire result is located. If a sort-key is provided, all matching results can be given in log-linear time as the data on that node is ordered by the sort key. Each query costs at most $\mathcal{O}(log_2(n) + s)$, where $n$ is the number of rows stored on the node and $s$ is the number of matching rows.

If I were to design this same application a year prior, I would have most likely come up with a sub-optimal and multi-table solution where fetching a search with $n$ attempts would have taken one query from the *searches* table and another $n$ queries from the *search_attempts* table.

I'm glad I've improved.

### Event Processing with DynamoDB Streams

TODO
















package handlers

import (
	"fmt"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go/service/sqs/sqsiface"
	"github.com/efritz/nacelle"
	"github.com/mitel-networks/go-aws-lib/golib/handlerutil"
	"github.com/mitel-networks/reflex/internal/manhunt/db"
)

type DynamoDBHandler struct {
	Logger       nacelle.Logger     `service:"logger"`
	DB           db.DatabaseManager `service:"db"`
	SQSAPI       sqsiface.SQSAPI    `service:"sqs"`
	handlerFuncs map[string]handlerutil.DynamoDBHandlerFunc
	queueURL     string
}

func NewDynamoDBHandler() handlerutil.Handler {
	return handlerutil.NewBaseDynamoDBHandler(&DynamoDBHandler{})
}

func (h *DynamoDBHandler) Init(config nacelle.Config) error {
	handlerConfig := &DynamoDBHandlerConfig{}
	if err := config.Load(handlerConfig); err != nil {
		return err
	}

	h.handlerFuncs = map[string]handlerutil.DynamoDBHandlerFunc{
		"search#INSERT": h.handleNewSearch,
	}

	h.queueURL = handlerConfig.ManhuntQueueURL
	return nil
}

func (h *DynamoDBHandler) GetHandlerFuncFor(recordHash string) handlerutil.DynamoDBHandlerFunc {
	if handlerFunc, ok := h.handlerFuncs[recordHash]; ok {
		return handlerFunc
	}

	return nil
}

func (h *DynamoDBHandler) handleNewSearch(record events.DynamoDBEventRecord, logger nacelle.Logger) error {
	logger.Debug("Constructing search from image")

	search, err := db.SearchFromImage(record.Change.NewImage)
	if err != nil {
		return err
	}

	logger.Info("Handling new search %s", search.SearchID)

	contact, err := h.getContact(search.DomainID, search.ContactID, logger)
	if err != nil {
		return err
	}

	return queueNext(
		h.SQSAPI,
		h.queueURL,
		search,
		contact.ContactMethods,
		-1,
		h.Logger,
	)
}

func (h *DynamoDBHandler) getContact(domainID, contactID string, logger nacelle.Logger) (*db.FullContact, error) {
	logger.Debug("Retrieving contact %s", contactID)

	contact, err := h.DB.GetContact(domainID, contactID)
	if err != nil {
		return nil, fmt.Errorf("failed to retreive contact (%s)", err.Error())
	}

	return contact, nil
}
