+++
title = "Works On My Machine"
date = "2019-12-28T00:00:00-00:00"
tags = ["bugs"]
showpagemeta = true
+++

As described in a [previous article](http://eric-fritz.com/articles/subtle-circular-import-bug/), [Sourcegraph](https://github.com/sourcegraph/sourcegraph)'s main source of truth for all code data is *gitserver*, which is a sharded RPC service wrapping git commands. Requests to this service specify a repository name, which indicates the directory to perform the git command in, as well as the arguments that should be passed to the command. The [LSIF service](https://github.com/sourcegraph/sourcegraph/blob/2f36af2a439722ac43fa05da6972e5ed4cf1fa76/lsif) needs to fetch commit ancestry data from gitserver, which it gets through a formatting the output of *git log*. The request payload looks like the following.

```json
{
  "repo": "github.com/sourcegraph/sourcegraph",
  "args": [
    "git",
    "log",
    "--pretty=%H %P",
    "4a7d469702c5f71bff6baa150b982e77517a5aa0",
    "-5000"
  ]
}
```

As described by [this issue](https://github.com/sourcegraph/sourcegraph/issues/5940), this code path reproducibly returns a subprocess error in the [HTTP response trailers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Trailer) on another developer's machine.

```json
{
  "x-exec-error": "exit status 1",
  "x-exec-exit-status": "1",
  "x-exec-stderr": "git: 'git' is not a git command. See 'git --help'.  The most similar command is \tinit"
}
```

This isn't the first time I've encountered another developer's setup that broke assumptions I've made in code. Postgres environment variables and the existence of additional tables have bitten me in the past. Passwords with special characters in it have bitten me in the past. Installing different version of [protobufs](https://developers.google.com/protocol-buffers) have bitten me in the past. The list goes on.

Ensuring that we were running the same version of the code, I checked that it still worked for me locally. And it did...

```json
{
    "x-exec-error": "",
    "x-exec-exit-status": "0",
    "x-exec-stderr": ""
}
```

...and it also did on a *second* machine of mine.

Looking closer at the error, it appears that git is trying to invoke the *git* command, **which it doesn't have**, and tries to suggest the *init* command, which has the lowest [edit distance](https://en.wikipedia.org/wiki/Edit_distance). This is really strange, because this command *totally* works on my machines:

```bash
$ git git log --pretty='%H %P' -5
812a1fe4bed477198f36f5790a58324cc023fcc6 46c533534fc343ef99ea9f0dc2db93c20d741d0f
46c533534fc343ef99ea9f0dc2db93c20d741d0f 7bfaf0e64f2b1fbedffafc26e79c41b37f701791
7bfaf0e64f2b1fbedffafc26e79c41b37f701791 7495b894827fdc41cc457a25d10e30b7598fd3e6
7495b894827fdc41cc457a25d10e30b7598fd3e6 acdcb1f0c37ab494176d834177b235b1a81c53bf
acdcb1f0c37ab494176d834177b235b1a81c53bf 0659088b7b1b103f03d498f0a14ad1e57d95f80d
```

In fact, any number of leading *git*s work on my machine!

```bash
$ git git git git git git log --pretty='%H %P' -5
812a1fe4bed477198f36f5790a58324cc023fcc6 46c533534fc343ef99ea9f0dc2db93c20d741d0f
46c533534fc343ef99ea9f0dc2db93c20d741d0f 7bfaf0e64f2b1fbedffafc26e79c41b37f701791
7bfaf0e64f2b1fbedffafc26e79c41b37f701791 7495b894827fdc41cc457a25d10e30b7598fd3e6
7495b894827fdc41cc457a25d10e30b7598fd3e6 acdcb1f0c37ab494176d834177b235b1a81c53bf
acdcb1f0c37ab494176d834177b235b1a81c53bf 0659088b7b1b103f03d498f0a14ad1e57d95f80d
```

**Oh, dang**.

I remembered my old habit of beginning a git command, spacing out, and then resuming my train of thought from the beginning. I fixed this via a [gitconfig alias](https://github.com/efritz/dotfiles/blob/370c182d553071579f727353c533ce1a13ea00e9/git/gitconfig#L47) (which is not original, see the [prior art](https://github.com/denysdovhan/dotfiles/blob/47f10069cce6448b175921c7deeb0db1ed7e5a11/home/.gitconfig#L30)). This alias collapses multiple leading *gits* into a single *git*. This alias did not exist on other developer machines (or in production).

Turns out that the `args` field of the gitserver request was named `args` and not `command` for a reason. The issue was trivially fixed [here](https://github.com/sourcegraph/sourcegraph/pull/5941) and [here](https://github.com/sourcegraph/sourcegraph/pull/6548), and later ensured that I can't ever [add it back](https://github.com/sourcegraph/sourcegraph/pull/6549).
