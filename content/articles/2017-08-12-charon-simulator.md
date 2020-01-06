+++
title = "Charon Simulator"
slug = "charon-simulator"
date = "2017-08-12T00:00:00-00:00"
tags = []
showpagemeta = true
+++

{{% small %}}To skip the fluff and get to the good stuff, see one of the sample configuration links in the [TL;DR](#sample-configurations).{{% /small %}}

Charon, as described in the [whitepaper](/papers#charon), is a cooperative system to enforce limits on behalf of users. For example, an HTTP API request can immediately return an [HTTP 429](https://httpstatuses.com/429) if the limiting system has a large number of recent requests from that user in its history. Although the request has already made it to the system, it can save an expensive database operation which is most certainly a more precious resource than front-end server cycles.

Charon is a service designed to *grant* or *reject* either an individual or a group of requests for a resource on behalf of a *domain*, which is just an opaque string. Generally a domain is a "user", but could also be a group of users, a system, or an abstract entity such as a conference or an event. Of course, [similar](https://github.com/lyft/ratelimit) [solutions](https://github.com/youtube/doorman) [exist](https://redis.io/commands/incr).

Charon's method of rate limiting, especially its configuration definition, stand out as unique and tremendously flexible. The original proof-of-concept implementation was a simple [sliding window counter](https://engineering.classdojo.com/blog/2015/02/06/rolling-rate-limiter/). Unfortunately, this solution only performs well when requests are fairly evenly distributed. If the access pattern of resources is *bursty* (which you better believe it will be in production), then many clients may hit limits spuriously.

The solution we settled on was to extend the sliding windows into layers called *tiers*. If a user hits a limit in one tier, it can burst up into the next one. Each tier can be configured independently by the following five parameters.

- Window size: the memory limit of the tier. Requests older than the window size are forgotten and do not influence a future rate limiting decision.
- Window limit: the maximum number of requests which can be granted inside the window. Once this number is hit, all requests are rejected until a previous grant falls off of the left side of the window.
- Active period: once entered, a tier is *active* for this long. After a tier's active period expires, it begins its *cooldown* period.
- Cooldown period: how long a tier remains in *cooldown* after it becomes inactive. A tier cannot be entered until its cooldown period elapses.
- Skippability: whether or not this tier can be completely *passed through* when in cooldown by a burst.

At any given time, a domain belongs in the *highest* tier that is in its active period. Inactive domains begin in the lowest tier and can work their way up via excessive use.

I've heard that a picture is worth a thousand words.

{{< lightbox src="/images/burst-tiers.png" anchor="burst-tiers" >}}

I've also heard that a simulator is worth a thousand pictures[^1], so I brought one of those along too.

[^1]: This particular simulator currently works only in Chrome, so maybe more like 900 pictures.

### Sample Configurations

After launching a simulator, request to use a resource by pressing (or spamming) the spacebar. White dots represent a granted request and red X's represent a rejected request. The tier configuration is completely configurable, so feel free to experiment. The configuration is very flexible, but several patterns present themselves immediately. They are described in turn below.

#### Simple

<a href="javascript:void(0);" target="popup" onclick="window.open('/charon-simulator.html?tiers=5,1,30,0', 'Tier Configuration - Penalties', 'width=900,height=500')">Run the Simulator</a>

This simple configuration contains only a single tier. A domain is allowed five requests per second. Unlike [token bucket](https://en.wikipedia.org/wiki/Leaky_bucket) schemes, a domain's past inactivity does not influence current or future limiting decisions: five requests is all you will ever get in that second.

#### Penalties

<a href="javascript:void(0);" target="popup" onclick="window.open('/charon-simulator.html?tiers=5,1,1,0,50,5,5,15', 'Tier Configuration - Penalties', 'width=900,height=500')">Run the Simulator</a>

In order to correct the deficiency of the scheme above, we apply a second tier with a much larger limit. Domains that experience a burst of requests will not be denied unfairly. However, we must protect the system as a whole and cannot allow a domain to burst into a higher rate tier *without consequence*. In exchange for a higher rate limit *now*, the domain gives up the ability to have a higher rate limit in the future (for a period of time).

In this configuration, a user in the second tier can maintain its high-frequency of requests for five seconds, but is stuck at the normal limit for the next fifteen seconds.

#### Punishment

<a href="javascript:void(0);" target="popup" onclick="window.open('/charon-simulator.html?tiers=5,1,1,0,1,15,15,0', 'Tier Configuration - Punishment', 'width=900,height=500')">Run the Simulator</a>

Perhaps *bursty* request behavior is detrimental to your system and frequent requests signify a client of malintent. In this scenario, you would want to deny such clients future access to critical resources. This can be done by making a *prison tier*. Such a tier, once entered, has a very long active period and a very low limit. Once a user bursts into this tier, they are trapped without the ability to make a grantable request for as long as the tier is active.

#### Batch Processing

<a href="javascript:void(0);" target="popup" onclick="window.open('/charon-simulator.html?tiers=50,60,60,3540', 'Tier Configuration - Batch Processing', 'width=900,height=500')">Run the Simulator</a>

Lastly, many systems run periodically but spend the vast majority of their time idle. Take a reporting system, for example, that is meant to run once every day at the same time and will typically only make requests to an API for a ten-minute span. A tier can be configured to have a fairly generous limit within that window, and the cooldown can last for the remainder of the twenty-four hours.

In the simulator, the first request will trigger the start of a one-minute window. Up to fifty requests can be made within this time, after which no additional requests can be made for the rest of the hour.