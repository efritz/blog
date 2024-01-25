+++
title = "Arrow-Structured Concurrency"
slug = "arrow-structured-concurrency"
date = "2018-05-01"
tags = ["theory"]
showpagemeta = true
+++

This article adapts some ideas from [Arrows for JavaScript](https://arrowsjs.io/) for use as concurrency *primitives* for some high-level language as a response to Nathaniel Smith's article [Notes on structured concurrency, or: Go statement considered harmful](https://vorpus.org/blog/notes-on-structured-concurrency-or-go-statement-considered-harmful/) published on April 25, 2018 and Martin Sústrik's response [Structured Concurrency in High-level Languages](http://250bpm.com/blog:124) published on April 28th, 2018.

In the first half of the article I detail some of the more interesting semantics of a ArrowsJS. These ideas serve as a jumping-off point for a design of structured concurrency in a hypothetical language. The second half of the article proposes organizing coroutines into pools via lexical blocks which can also be quoted/delayed for later evaluation.

### ArrowsJS Primer

**Beware**: The JavaScript below was written while developing a typesystem -- that's my excuse and I'm sticking to it.

Although the semantics and implementation of ArrowsJS were designed for an environment driven off of a single-threaded event-loop, many of the basic concepts we've defined to talk about such a system have external applicability. For the purposes of this article, it is enough to consider an arrow as a function which *may* have some form of asynchronous computation. An **async point** is a point within the execution of an arrow which requires an external event (a response form an IO device, communication from another process, a signal, a timer, etc) to continue. In an event-loop architecture, this is the point which another callback or continuation or   thunk would be chosen to begin execution. An arrow **progresses** after resuming execution after blocking at an async point. A progress event is emitted each time an arrow makes progress. Subscribers can listen for such events, and these events may be explicitly expressed (more on this later).

This system is implemented encoding each object as a function with a parameter list containing the values `(x, p, k, h)`. The value `x` is the value passed to the arrow (the function argument tuple), the value `p` is a progress object which is passed through the execution of an arrow, and `k` and `h` are the success and failure continuations, respectively. For example, a *delay* arrow is encoded as follows.

```javascript
class DelayArrow {
    constructor(duration) { this.duration = duration; }

    call(x, p, k, h) {
        const cancel = () => clearTimeout(timer);
        const runner = () => {
            p.advance(cancelerId);
            k(x);
        };

        // Use let for hoisting - this junk is mutually-referential
        let timer = setTimeout(runner, this.duration);
        let cancelerId = p.addCanceler(cancel);
    }
}
```

Once invoked, a callback is registered with the event loop which forms its async point. Once the timer fires, the progress object is told to advance (emit a progress event) and the success continuation is invoked. Any subscriber listening for this arrow progressing will be notified. If this arrow is canceled before timer fires, the timeout is canceled and (this instance of) the arrow never resumes.

There are other arrows which listen for user events, request data from remote servers, and do synchronous computation (any regular function can be lifted into an arrow). These arrows, as seen so far, are basically encoded as promises with a few extra steps.

The novelty of this system comes from how the progress object can be manipulated when two or more arrows are composed. It's of note that the use of progress objects occur only within an arrow's call function, therefore the creation, manipulation, and organization of progress objects are completely encapsulated by combinator definitions. Several core (necessary) combinators exist to control the behavior of arrows executing concurrently. Each of them are distinct in their handling of their progress object.

- The **seq** combinator invokes one after the previous one in the chain completes successfully. If any arrow fails, the combinator fails.
- The **all** combinator invokes several arrows at once and blocks until they all complete successfully. If any arrow fails, the combinator fails.
- The **any** combinator invokes several arrows at once and blocks until *one* makes progress. The outstanding arrows which did not make first progress are canceled.
- The **try** combinator invokes one arrow and, dependent on if a failure occurs, chooses either a success or failure arrow to continue.

The following is the encoding for the *any* combinator.

```javascript
class AnyCombinator {
    constructor(arrows) { this.arrows = arrows; }

    call(x, p, k, h) {
        // Create a fresh progress object for each arrow in the combinator.
        let progress = this.arrows.map(() => new Progress(true));

        // Link the child progress values to the parent. Once the
        // parent progress object is canceled, so are its descendants.
        p.addCanceler(() => progress.forEach(p => p.cancel()));

        this.arrows.forEach((a, i) => {
            // Observe when a sibling makes progress
            progress[i].addObserver(() => {
                // A child progress object advanced, bubble progress
                // event up the tree.
                p.advance();

                // Cancel all sibling arrows.
                progress.forEach((p, j) => {
                    if (j != i) {
                        p.cancel();
                    }
                });
            });

            // Kick off execution of the arrow.
            a.call(x, progress[i], k, h);
        });
    }
}
```

The encoding for the other three combinators aren't particularly surprising -- new progress objects are created for the child arrows, cancellation of the parent applies to the children, and progress events of the children (generally) bubble up to the parent. One way of visualizing this is a [cactus stack](https://en.wikipedia.org/wiki/Parent_pointer_tree), like the one shown below.

{{< lightbox src="/images/arrows/progress-tree.svg" anchor="progress-tree" >}}

This encodes a root progress object, denoted by $\epsilon$, which splits into a pair of progress objects, which both split one more time. Each junction denotes an *all* or *any* combinator. Cancellation of any promise causes all of the event handlers registered at the async point of all promises to the right of it to be unregistered. Progress of arrows will (generally) cause arrows to the left of it to make progress.

The exception, as hinted earlier, is created by the **noemit** combinator, whose encoding is shown below. This combinator takes a single arrow and suppresses all progress events until the end of arrow execution (where one is emitted necessarily). Such a combinator is illustrated above by the dotted box with the *quiet* progress object $Q_3$. In this example, $c$ and $d$ can be cancelled as normal, but no progress events from *within* arrows $c$ or $d$ create an event observable outside of the box.

```javascript
class NoEmitCombinator {
    constructor(arrow) { this.arrow = arrow; }

    call(x, p, k, h) {
        // Allow cancellation, but no emission.
        let quiet = new Progress(false);
        p.addCanceler(() => quiet.cancel());

        this.arrow.call(x, quiet, z => {
            // Emit exactly one event once the arrow is
            // (successfully) completed, regardless of what
            // happened during its execution.
            p.advance();

            // Create a fake async point trampoline
            setTimeout(() => k(z), 0);
        }, h);
    }
}
```
This feature turns out to be incredibly powerful. The *any* combinator tends to be too one sided. It takes action once an arrow resumes from **any** asynchronous operation. The other extreme is implemented by `Promise.race`, which requires one of its promises to resolve to completion. With the *noemit* combinator, we can actually achieve the entire spectrum between the two sets of semantics. In the following example, there are two halves of a game implemented as two arrows, *game1* and *game2*, the first half of which we enforce a time constraint. The progress events of the first half of the game are suppressed so that asynchronous operations do not prematurely cancel the timer created by the delay arrow. If the timer fires, the first half of the game can still be canceled. And, due to the progress event at the end of the *noemit* combinator, progression into the second half of the game cancels the sibling arrow -- the timer.

```javascript
new AnyCombinator([
    new DelayArrow(limit),
    new SeqCombinator(
        new NoEmitCombinator(game1),
        game2,
    ),
]);
```

Now, that's quite enough of that.

### Application as a Language Construct

Let's consider what a language that features these concepts as first-class citizens. For demonstration purposes, the `go` keyword spawns a (typed) coroutine which may eventually return a value -- this is a major divergence from the `go` keyword in Golang.

This proposed construct organizes pools of coroutines with *lexical blocks*. The general method is to tag a block with a name denoting combinator semantics (e.g. any and all). While executing, the block may spawn coroutines which execute concurrently. Once the block has finished executing, the semantics of the particular combinator selects the result to be yielded, depending on the state and values of the spawned coroutines. The value of this block (when used as an expression) is the yielded result.

The following would create an anonymous all combinator to which a series of *fetch* coroutines are attached. The combinator yields a value only after each spawned coroutine completes. This value contains, in order, the result of each call to `fetch` in the order in which it was attach to the combinator.

```go
responses = all {
    for url in urls {
        go fetch(url)
    }
}
```

Using block semantics also lets us do some side-effecting or synchronous work between spawns. For example, the following is a trivial implementation of a [sleep selection algorithm](https://stackoverflow.com/questions/6474318/what-is-the-time-complexity-of-the-sleep-sort?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa).

```go
min = any {
    for x in vals {
        go func() {
            sleep(x)
            return x
        }
    }
}
```

Lexical blocks controlling concurrency would also be easy to nest. The following example creates an *all* block which contains an *any* block for each group of URLs. The result is an array that contains the fastest fetch from each group.

```go
first_from_each_group = all {
    for urls in groups {
        go func() {
            return any {
                for url in urls {
                    go fetch(url)
                }
            }
        }
    }
}
```

Notice that if we are directly transplanting the semantics described above, then the 'winner' of an *any* block would be the dictated by the first coroutine to unblock from an async point, regardless how long it takes the remainder of the coroutine to complete. This means that we can introduce *noemit* blocks to enable the same spectrum of behaviors. The next example shows such a use. Notice that if we do not have the *noemit* block here, then the group chosen by the outer *any* block is the pool of coroutines which gets a response from a remote server first, which is not likely the semantics we are after. If we wrap the inner *all* blocks with a *noemit* block, then the children of the *any* blocks will only emit a progress event once the entire group is completed.

```go
first_group_to_complete = any {
    for urls in groups {
        go func() {
            return noemit {
                all {
                    for url in urls {
                        go fetch(url)
                    }
                }
            }
        }
    }
}
```

Another major divergence from Golang-like semantics is that all of the asynchronous operations must be cancellable or deregisterable. This is not true in non- preemptive Golang -- exceptions cannot be injected into a running goroutine and goroutines only yield control on communication (reading/writing from a channel or IO). If such a concurrency construct were implemented in a language with channel-rich communication, deadlocks would superabound. However, such structured concurrency may be useful as a replacement for the common uses of channels.

Nathan Smith quoted ([Knuth, 1974](https://scholar.google.com/scholar?cluster=17147143327681396418&hl=en&as_sdt=0,5), p.275) when he proposes moving away from the `go` keyword, which he argues creates goto-like spaghetti flow, in favor of structured concurrency.

<blockquote>
Probably the worst mistake any one can make with respect to the subject of go to statements is to assume that "structured programming" is achieved by writing programs as we always have and then eliminating the go to's. Most go to's shouldn't be there in the first place! What we really want is to conceive of our program in such a way that we rarely even think about go to statements, because the real need for them hardly ever arises. The language in which we express our ideas has a strong influence on our thought processes. Therefore, Dijkstra asks for more new language features – structures which encourage clear thinking – in order to avoid the go to's temptations towards complications.
</blockquote>

Possibly, the same argument could be applied to explicit communication **in the majority of cases** -- perhaps if we structure concurrency **enough** and provide the correct primitives, such the necessity for such explicit communication can be done away with. I'm extremely hesitant to make blanket statements for two reasons. First, I'm still smitten with channel communication. I **will** admit that manual communication does create opportunities for an entire class of errors that should otherwise be impossible in a high-level language -- specifically, deadlocks and leaks.  Second, I love escape hatches. There are still times where the use of *goto* is acceptable and even the correct choice. It's just so extremely, extremely rare.

Martin Sústrik used a [running example](http://250bpm.com/blog:124#toc7) of a basic server which handles clients in a separate thread after connection. Once a shutdown is requested, the server stops accepting new clients and waits for coroutines handling the current active clients finish with some grace period before forcefully shutting down. Let's see how that would look in this system.

Unfortunately, this becomes pretty difficult to structure *lexically*. If we go all the way with this idea that blocks are first-class constructs, then we may be able to [quote](https://en.wikipedia.org/wiki/Lisp_(programming_language)#Self-evaluating_forms_and_quoting) an asynchronous block. Here, I chose `&` for the quoting operator. This allows us to run all of the synchronous code in the block, but does not wait for the spawned coroutines to finish once execution hits the end of the block.

```go
listener = ...

accept_block = &all {
    while true {
        client = listener.accept()
        go run(handle, client)

        if shutdown_requested() {
            break
        }
    }
}

any {
    go sleep(10)
    go accept_block  # resume block quoted above
}
```

Here, we create a quoted *all* block, assigned to a named value, to which all coroutines handling active clients at the time of server shutdown are attached. Then, we create an additional *any* block where we race the continuation of the quoted block and a 10-second timer. If the timer fires, then the running coroutines attached to the quoted block are preempted, their events are deregistered, and their resources are collected.

Quoted blocks as first class citizens seems like a powerful idea and lets us do some pretty expressive stuff. For example, if we need to retrieve a *tree* of results rather than a list, we could do something like the following. Here, we use the syntax `go(b) f()` to mean spawning the coroutine `f()` within the context of a concurrent block *b*.

```go
func fetch_all(url, pool) {
    payload = http.request(url)

    for child_url in payload['children'] {
        go(pool) fetch_all(child_url, pool)
    }

    return payload['data']
}

pool = &all {}                # create pool
go(pool) fetch_all(url, pool) # queue initial task
all_results = go pool         # resolve block
```

### Considerations

The semantics of ArrowsJS relies on a delineation between *composition time* and *evaluation time*. Arrows can only be run after their composition is complete. This makes it impossible for an arrow combinator to have an arity which depends on a value produced earlier by the arrow, and ensures that an *any* arrow begins execution of every child arrow at once. With asynchronous blocks, the spawned coroutines may begin executing at different points and it is possible for a coroutine to be spawned after the value of the block has already been determined. What is the least surprising behavior for the system to do at this point? Should it simply no-op the spawn? Should it wait until the coroutine reaches a certain point in evaluation before preempting and shutting it down?

The method with which coroutines may communicate is also a major design consideration. Such a feature is necessarily and intimately intertwined with the evaluation, scheduling, and cancelling semantics discussed here.

As Martin said, the design of these ideas are not trivial and hard design questions do arise.

### Note on ArrowsJS Source Code

Please note that the ArrowsJS source code is considered *research-quality* -- it's possible to do interesting-enough things to cite in a workshop or journal paper, but I wouldn't suggest anyone to trust it for a production environment. This is, however, being addressed very slowly and somewhat privately.
