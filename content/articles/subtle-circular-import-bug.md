+++
title = "Subtle Circular Import Bug"
date = "2019-12-24T00:00:00-00:00"
tags = ["bugs"]
showpagemeta = true
+++

[Sourcegraph](https://github.com/sourcegraph/sourcegraph)'s main source of truth for all code data is *gitserver*, which is a sharded RPC service wrapping git commands. The [LSIF service](https://github.com/sourcegraph/sourcegraph/blob/2f36af2a439722ac43fa05da6972e5ed4cf1fa76/lsif) requires git ancestry data in order to answer queries such as *find the commit closest to $c$ for which we have LSIF data*, or *determine if commit $c$ (for which we have LSIF data) is the closest such commit to the HEAD of master*. Each query to the LSIF server referencing a previously unknown commit forces a query to gitserver for the first $n$ ancestors of the commit. This data is stored into a local database where it can later be used within table expressions and join conditions.

While poking around on the [production instance](https://sourcegraph.com), I noticed that the commits table was not getting new entries, despite making queries for commits that should have triggered this behavior. Apparently, this piece of code was broken for about two weeks, and beacuse it was only responsible for the behavior of the service when data is missing (which it isn't on this production instance), the bug was able to sneak under the radar for quite some time. Production logs showed git commands such as the following being run (and unsurprisingly failing):

`git log --pretty='%H %P' b1da0296b494ae72201a778801c74a842dc776eb -NaN`

It's never a good sign when values like `NaN`, $\infty$ or `[Object object]` make into the shell from your application.

Tracing the relevant application code did not show an obvious answer. The `NaN` value in the command above is produced from a trivial expression: the product of a constant and a numeric literal. My editor was able to jump to each constant definition directly with no problem, and there was no additional arithmetic or logic between the definition of the constants and their uses.

Removing all of the non-relevant code, we have the following content over two files.

The file [xrepo.ts](https://github.com/sourcegraph/sourcegraph/blob/2f36af2a439722ac43fa05da6972e5ed4cf1fa76/lsif/src/xrepo.ts) defines the constant `MAX_TRAVERSAL_LIMIT` and calls a function imported from the other file.

```typescript
import { discoverAndUpdateCommit } from "./commits";
export const MAX_TRAVERSAL_LIMIT = 100;
discoverAndUpdateCommit();
```

And the file [commits.ts](https://github.com/sourcegraph/sourcegraph/blob/2f36af2a439722ac43fa05da6972e5ed4cf1fa76/lsif/src/commits.ts) imports the `MAX_TRAVERSAL_LIMIT` constant from the other file, defines a second constant, and defines some additional functions.

```typescript
import { MAX_TRAVERSAL_LIMIT } from "./xrepo";

const MAX_COMMITS_PER_UPDATE = MAX_TRAVERSAL_LIMIT * 1.5;

export async function discoverAndUpdateCommit(/* omitted */): Promise<void> {
  getCommitsNear(/* omitted */);
}

export async function getCommitsNear(
  gitserverUrl: string,
  repository: string,
  commit: string
): Promise<[string, string][]> {
  return flattenCommitParents(
    await gitserverExecLines(gitserverUrl, repository, [
      "log",
      "--pretty=%H %P",
      commit,
      `-${MAX_COMMITS_PER_UPDATE}`
    ])
  );
}
```

The error may be immediately obvious from reading the reduced code (or the title of this article), but it wasn't at the time. The constant `MAX_TRAVERSAL_LIMIT` is imported into *commits.ts* from *xrepo.ts*, which itself imports from *commits.ts* before defining the imported constant. This causes the value imported into *commits.ts* to be `NaN`, which spreads is non-numberness through all arithmetic operations like a virus.

### Takeaways

The resolution was trivial: define constants in one file that does not depend on import order. For good measure, we added lint rules to prevent us writing code with circular imports (which is a compiler error in [some other languages](https://github.com/golang/go/issues/30247#issuecomment-463940936)).

*Shouldn't this have been caught by unit tests?* **Yes!** And there **was** unit test coverage for the function in question. Unfortunately, the mock for the remote API only ensured the path was correct and did not check the body. These parameters were hand-verified and [not directly tested](https://github.com/sourcegraph/sourcegraph/blob/2f36af2a439722ac43fa05da6972e5ed4cf1fa76/lsif/src/commits.test.ts#L14) before a refactor. After the refactor, the tests still passed and gave a false sense of security.

This highlights the importance of writing the correct assertions in unit tests (regardless of coverage), as well as testing units of behavior at the outer layers (which could have easily detected that this feature was not working): [smoke testing](https://en.wikipedia.org/wiki/Smoke_testing_(software)), [regression testing](https://en.wikipedia.org/wiki/Regression_testing), and [end-to-end testing](https://en.wikipedia.org/wiki/System_testing).
