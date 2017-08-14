+++
date = "2017-08-12T00:00:00-00:00"
title = "An Adventure in Unstable APIs"
showpagemeta = "true"
tags = ["charon", "whoops"]
+++

Antirez [announced](http://antirez.com/news/106) the Redis module system in May 2016. At this point in time, [Charon](/papers#charon)'s Redis interface was a set of Lua scripts which was the best available solution for atomicity and bandwidth at the time. Because scripts simply invoke other Redis commands, the data model had to be designed carefully to fit into Redis's supported datatypes. As a result, each script modified up to a few dozen keys and made debugging (which usually required inspection of values in the database) difficult.

When things were slow, I began to port the logic of the Lua scripts into C and wrote a simple module wrapper so that it could be called from the limiting server. This allowed the data model to be designed around the query API. The core logic became much clearer as a result. The only change to the server was the invocation of commands. With scripts, the invocation was simply a call to `EVAL`, `redis.Do("EVAL", rateCommandHash, args...)`. With modules, this became `redis.Do("charon.rate", args...)`. Barely a difference. The transition away from Lua scripts showed an increase in clarity and speed, despite the new solution depending on an unstable API.

The development container build configuration looked something similar to the following. Because the API changed surprisingly little[^1] during active development and testing, I neglected to add a working hash check to the downloaded tar file (although I did apparently consider it at the time, as implied by a helpful `TODO` comment in the Dockerfile). This was still pre-production software, and I figured by the time it makes it into production we could lock it to a particular commit or host a stable version on a machine we controlled.

    FROM shoretel-alpine:master-latest

    RUN set -ex && \
        apk add --no-cache \
            gcc linux-headers make musl-dev git

    EXPOSE 6379
    CMD ["redis-server", "/app/redis.conf"]

    ENV REDIS_DOWNLOAD_URL https://github.com/antirez/redis/archive/unstable.tar.gz

    RUN wget -O redis.tar.gz "$REDIS_DOWNLOAD_URL" && \
        mkdir /redis && \
        tar -xzf redis.tar.gz -C /redis --strip-components=1 && \
        rm redis.tar.gz && \
        make -C /redis/src && \
        make -C /redis/src install && \
        rm -r /redis

    COPY redis.conf /app/redis.conf # Points Redis to module.so
    COPY module.so  /app/module.so  # Build artifact

Unfortunately, after a few weeks of inactivity on the project, integration tests failed with the following when run on a freshly built container (boring details omitted).

    31037:M 08 Aug 09:04:04.384 # Redis 999.999.999 crashed by signal: 11
    31037:M 08 Aug 09:04:04.384 # Crashed running the instuction at: 0x43a9ec
    31037:M 08 Aug 09:04:04.384 # Accessing address: (nil)
    31037:M 08 Aug 09:04:04.384 # Failed assertion: <no assertion failed> (<no file>:0)

    ------ STACK TRACE ------
    EIP:
    ./redis-server *:6379(freeModuleObject+0xc)[0x43a9ec]

The module source was untouched since the last successful build. I consider Redis to be very high-quality software, so I naturally and immediately placed the blame squarely on myself. I discovered that I could reliably reproduce the error by deleting a key containing one of my module's objects. From this, I assumed there was an issue with a module object's free function. Maybe I was registering objects incorrectly with Redis and the old version just worked by happenstance. Maybe I was never freeing objects correctly before and I was just *unobservably* corrupting memory before the layout changed. Maybe I just thought I knew how manual memory management worked - God knows I've been spoiled by garbage collectors over the years.

After a few days of worry, I found the culprit. [Commit 71e8d15](https://github.com/antirez/redis/commit/71e8d15e493217df16e82a81fa2c587b64a74ef9) introduced a change to the method that registered a custom type to the module. The previous signature accepted a list of methods in a particular order (one of which was never called as it was, at the time, unimplemented).

    RedisModuleType *REDISMODULE_API_FUNC(RedisModule_CreateDataType)(
        RedisModuleCtx *ctx, 
        const char *name, 
        int encver, 
        RedisModuleTypeLoadFunc rdb_load, 
        RedisModuleTypeSaveFunc rdb_save, 
        RedisModuleTypeRewriteFunc aof_rewrite, 
        RedisModuleTypeDigestFunc digest, 
        edisModuleTypeFreeFunc free
    );

The signature was changed to accept a table of function pointers instead of a list (which I consider to be a very good, incremental change to the API).

    typedef struct RedisModuleTypeMethods {
        uint64_t version;
        RedisModuleTypeLoadFunc rdb_load;
        RedisModuleTypeSaveFunc rdb_save;
        RedisModuleTypeRewriteFunc aof_rewrite;
        RedisModuleTypeMemUsageFunc mem_usage;
        RedisModuleTypeRewriteFunc digest;
        RedisModuleTypeFreeFunc free;
    } RedisModuleTypeMethods;

    RedisModuleType *REDISMODULE_API_FUNC(RedisModule_CreateDataType)(
        RedisModuleCtx *ctx, 
        const char *name, 
        int encver, 
        RedisModuleTypeMethods *typemethods,
    );

Shockingly, the linker had no problem with the module using the former version and the server accepting the later version (perhaps a less incremental change would have made the issue less subtle). The null pointer access occurred when trying to lookup the location of the free function in the method table... which happened to be a load function and not a table at all! In all honestly, I'm really surprised it blew up as little as it did. I've seen more catastrophic errors from lesser mistakes.

After the eureka moment, I promptly updated the data type registration and changed the Dockerfile to lock the Redis dependency to a stable revision - at this point the module system was still a feature only in the unstable branch so it was not yet possible to use a tagged release.

    ENV REDIS_CLONE_URL https://github.com/antirez/redis
    ENV REDIS_COMMIT_HASH 6eb0c52d4c9f56561eec76db64190f720661efe6

    RUN git clone "$REDIS_CLONE_URL" && \
        git --git-dir redis/.git checkout "$REDIS_COMMIT_HASH" && \
        make -C redis/src && \
        make -C redis/src install && \
        rm -r redis

[^1]: He really nailed it on the first try.

### Takeaways

Container builds should be, as far as possible, *reproducible forever*. Re-building a container without a change to source should build the **exact** same container. Production image builds are not a place to fetch the latest for any external dependency - this has been [especially](https://glide.sh/) [problematic](https://github.com/golang/dep) [in Go](https://docs.google.com/document/d/1Bz5-UB7g2uPBdOx-rw5t9MxJwkfpx90cqG9AFL0JAYo/edit).

Protect yourself from your API dependencies - even if it's for proof of concept. If you rely on your foundation being stable, make sure that you're not straddling the bleeding edge. Lock to stable versions (or ranges, if supported) and vet updates. Be aware of what's changing.

### Epilogue

Once the module system was promoted into a stable release, the Dockerfile could use a tagged release as follows.

    ENV REDIS_VERSION 4.0.1
    ENV REDIS_DOWNLOAD_URL http://download.redis.io/releases/redis-$REDIS_VERSION.tar.gz

    RUN wget "$REDIS_DOWNLOAD_URL" && \
        tar xzf redis-$REDIS_VERSION.tar.gz && \
        make -C redis-$REDIS_VERSION/src && \
        make -C redis-$REDIS_VERSION/src install && \
        rm -r redis-$REDIS_VERSION redis-$REDIS_VERSION.tar.gz
