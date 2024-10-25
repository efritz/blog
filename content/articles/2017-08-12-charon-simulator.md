+++
title = "Charon Simulator"
slug = "charon-simulator"
date = "2017-08-12"
tags = []
showpagemeta = true
+++

### Configuring rate limits

Charon, as described in the [whitepaper](/papers#charon), is a cooperative system used to enforce limited access to resources on behalf of users. For example, an HTTP API server can choose to immediately return an [HTTP 429](https://httpstatuses.com/429) response if the limited resource has had a large number of requests from that user in its recent history. This can help save, for example, expensive database operations which are a much more precious resource than server cycles handling request (and rate limit) middleware.

Charon is a service designed to *grant* or *reject* either an individual or a group of requests for a **resource** on behalf of a **domain**. Domains and resources are identified in Charon by opaque strings. Resources can be anything that need to be protected - database calls, compute resources, external API calls, etc. A domain is generally backed by a user or tenant, but could also be a group of users, a system, or an ephemeral or abstract entity such as a request or an event.

Of course, this system is not entirely unique and [similar](https://github.com/lyft/ratelimit) [solutions](https://github.com/youtube/doorman) [exist](https://redis.io/commands/incr).

Charon's method of rate limiting, especially its configuration definition, stand out as unique and tremendously flexible. The original proof-of-concept implementation was based on a simple [sliding window counter](https://engineering.classdojo.com/blog/2015/02/06/rolling-rate-limiter/), where each domain and resource pair receive their own window configuration and history. Unfortunately, this solution only performs well when requests are fairly evenly distributed. If the access pattern of resources is *bursty* (which you better believe it will be in production), then many clients may hit limits spuriously.

The solution we settled on was to extend the sliding windows into layers called **tiers**. If a user hits a limit in one tier, it has the opportunity to **burst** up into the next tier, where it will operate for a period of time with a different limit. Each tier can be configured independently with the following parameters:

- **Window size**, denoted $T^w$, defines the period of time that granted requests for a domain and resource pair are recorded. The current sliding window covers the last $T^w$ seconds and ends at the current time. Any requests made more than $T^w$ seconds ago do not influence limiting behavior and do not need to be tracked. These requests have "fallen out of the window".
- **Window limit** defines the maximum number of requests that can be granted within a single window. All requests are rejected while the current window is at max capacity. The next request to be granted in the current tier may only happen once the earliest request falls out of the window, reducing the window count and adding additional capacity for a new request to be granted.
- **Active period** defines the length of time a tier will be active. A sliding window can only exist in an active tier. Once a tier's active time has elapsed, it will enter its cooldown period.
- **Cooldown period** defines the length of time a tier cannot be burst into after its active period ends. This parameter allows burst tiers to accommodate non-uniform request patterns without allowing users to continuously burst into a higher rate limit.

### Burst tiers in action

To better illustrate, I'll save a thousand words of description and show a few pictures instead.

Here, we see a request in the sliding window of a lower tier being rejected. This rejection burst up to a higher tier where it can be granted. This begins the active period of the higher tier, and any future requests will be made according to the configured parameters of the higher tier. The lower tier, still in its active period, becomes temporarily shadowed.

{{< lightbox src="/images/charon/burst-tiers-successful.png" anchor="burst-tiers-successful" >}}

Once the higher tier's active period elapses, it enters its cooldown period, marked in red. Once this cooldown period begins, the lower tier (still in its active period) becomes un-shadowed. The user may be granted additional requests in the lower tier at the original rate. However, if the user hits the lower tier's limit a second time, they won't be able to re-burst back into the higher tier until its cooldown period elapses. The user will then have to wait for a period of time before their request capacity replenishes.

{{< lightbox src="/images/charon/burst-tiers-cooldown.png" anchor="burst-tiers-cooldown" >}}

### Burst tiers in (inter)action

To *even better* illustrate the different ways burst tiers can be configured, I'll save a thousand more images covering all configurations and edge cases and give you an interactive [simulator instead](/charon-simulator). In the simulator, you can arbitrarily configure the number and parameters of burst tiers, and make requests at your own rate.

We've identified several useful patterns of burst tier configuration, which we'll explain below. But the simulator is very flexible, so we encourage you to explore!

#### <a href="/charon-simulator?tiers=5,1,1,0&name=Simple" target="_blank_">Simple burst tiers</a>

In this configuration, a user can be granted five requests per second.

#### <a href="/charon-simulator?tiers=5,1,1,0,50,5,5,15&name=Penalties" target="_blank_">Penalty burst tiers</a>

In order to correct the deficiency of the scheme above, we apply a second tier with a much larger limit. Domains that experience a burst of requests will not be denied unfairly. However, we must protect the system as a whole and cannot allow a domain to burst into a higher rate tier *without consequence*. In exchange for a higher rate limit *now*, the domain gives up the ability to have a consistently higher rate limit in the near future.

In this configuration, a user can burst into a tier with a higher limit for five seconds, but can only burst once every fifteen seconds.

#### <a href="/charon-simulator?tiers=5,1,1,0,1,15,15,0&name=Punishment" target="_blank_">Punishment burst tiers</a>

Perhaps your system has components that are very sensitive to bursty requests, and an increase of requests signifies client malintent. In this scenario, you would want to deny greedy clients future access to critical resources. This can be done by making a *prison tier*. Such a tier, once entered, has a very long active period and a very low limit. Once a user bursts into this tier, they are trapped without the ability to make a grantable request for as long as the tier is active.

In this configuration, once a client bursts into a higher tier they are effectively banned from the system for fifteen seconds.

#### <a href="/charon-simulator?tiers=50,15,15,30&name=Batch%20Processing" target="_blank_">Limits for batch processing</a>

Many systems run periodically and spend the vast majority of their time idle. For example, a nightly reporting system will typically make requests to an API for a ten-minute span once a day. A tier can be configured to have a fairly generous limit for the window the job is expected to run, and then enter cooldown for the remainder of the twenty-four hour period to prevent additional requests until the next job runs.

In this configuration, the first request will trigger the start of a fifteen second window. Fifty requests can be made in this time, after which no additional requests can be made for another thirty seconds. In a production environment, Charon would handle window sizes and active/cooldown periods much longer than this. For the simulation we crank down the maximum bounds on these parameters because, well, who the heck is gonna be watching this thing for multiple hours?
