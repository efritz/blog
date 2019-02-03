+++
date = "2019-02-03T00:00:00-00:00"
title = "Found a Golang Bug!"
showpagemeta = "true"
tags = ["go", "bugs"]
+++

I have to say, this was a cool milestone in my career.

Before we start this story, I need to point out that if you think that your application is behaving in a strange way due to a compiler bug, a programming language runtime bug, an OS bug, or a hardware bug, you're almost certainly displaying a disproportionate amount of hubris. But *sometimes* you just hit those weird edges.

On January 24th, I was blocked by a Bamboo build that just wouldn't finish. This build was AOT compiling a Typescript library. To be more specific, this build had finished compiling the Typescript library and was stuck on cleaning up some intermediate files created by the compilation process.

The build was described by the following (reduced) YAML file and executed by a Docker-based build tool [ij](https://github.com/efritz/ij). Future articles will describe this tool in more detail. In short, ij creates a local workspace directory, hidden under the `./ij` directory, moves a copy of the files listed under the import section, runs the configured plans with a volume mount to the workspace, and then moves a copy of the files listed under the output section back into the project directory.

```json
import: { files: ['*'] }
export: { files: ['dist'] }

tasks:
  compile:
    image: node:stretch
    script: npm install && node_modules/typescript/bin/tsc

plans:
  build:
    stages:
      - name: AOT compile
        tasks: [compile]
```

This build in particular will copy the current project files, a `package.json` and a handful of `.ts` files, install dependencies, runs `tsc`, and copies the resulting `dist` directory back to the project. This keeps things relatively clean in the project directory: no `node_modules` to clean up and no OS packages to pollute your workstation or build server.

At the end of the build, the workspace directory would be removed from the project. This is where the build was getting stuck -- but only on the Bamboo agent. There was no problem running this build on my workstation. It was late in the day, so I figured I would come back fresh in the morning with some additional debug logs in ij to see if I can see where my own mistake lied.

The same behavior occurred the next day (obviously), but I could at least bound the blocked area of the program to a single line: a call to [os.RemoveAll](https://golang.org/pkg/os/#RemoveAll). The next quarter of the day I played around with the following knobs:

- Leaving the workspace directory after the build,
- Deleting the workspace directory after the build,
- Running the script as root,
- Running the script with the UID/GID of the invoking user, and
- Manually changing the permissions of the files and directories created within the container.

Leaving the workspace directory there wasn't a permanent solution as future builds would have to delete the same files before checking out the repo fresh -- this just moves the problem to the future.

It turns out that the node image [explicitly creates a user](https://github.com/nodejs/docker-node/blob/86b9618674b01fc5549f83696a90d5bc21f38af0/8/stretch/Dockerfile#L3) that happens to share the UID and GID of my user on my workstation. It further turns out that the user on the bamboo agent has different UID and GID, which explains one of the differences in behavior between the two machines.

Frustratingly, running the container with the UID and GID of the current user [works on my machine](https://blog.codinghorror.com/the-works-on-my-machine-certification-program/), but running that way on Bamboo causes npm to fail-fast due to a permissions error to the npm cache directory.

Looking at the behavior of the stuck build process on the build agent via strace gives the following (clipped) output, ad nauseum. The same files would come up again and again, but not in any particular access pattern.

```
unlinkat(AT_FDCWD, "./.ij/66104d/workspace/node_modules/@angular/common/locales/fr-NC.d.ts", 0) = -1 EACCES (Permission denied)
unlinkat(AT_FDCWD, "./.ij/66104d/workspace/node_modules/@angular/common/locales/fr-NC.d.ts", AT_REMOVEDIR) = -1 EACCES (Permission denied)
lstat("./.ij/66104d/workspace/node_modules/@angular/common/locales/fr-NC.d.ts", {st_mode=S_IFREG|0755, st_size=1493, ...}) = 0
unlinkat(AT_FDCWD, "./.ij/66104d/workspace/node_modules/@angular/common/locales/en-AI.d.ts", 0) = -1 EACCES (Permission denied)
unlinkat(AT_FDCWD, "./.ij/66104d/workspace/node_modules/@angular/common/locales/en-AI.d.ts", AT_REMOVEDIR) = -1 EACCES (Permission denied)
lstat("./.ij/66104d/workspace/node_modules/@angular/common/locales/en-AI.d.ts", {st_mode=S_IFREG|0755, st_size=478, ...}) = 0
unlinkat(AT_FDCWD, "./.ij/66104d/workspace/node_modules/@angular/common/locales/en-IL.js", 0) = -1 EACCES (Permission denied)
unlinkat(AT_FDCWD, "./.ij/66104d/workspace/node_modules/@angular/common/locales/en-IL.js", AT_REMOVEDIR) = -1 EACCES (Permission denied)
lstat("./.ij/66104d/workspace/node_modules/@angular/common/locales/en-IL.js", {st_mode=S_IFREG|0755, st_size=7105, ...}) = 0
unlinkat(AT_FDCWD, "./.ij/66104d/workspace/node_modules/@angular/common/locales/en-KI.d.ts", 0) = -1 EACCES (Permission denied)
unlinkat(AT_FDCWD, "./.ij/66104d/workspace/node_modules/@angular/common/locales/en-KI.d.ts", AT_REMOVEDIR) = -1 EACCES (Permission denied)
lstat("./.ij/66104d/workspace/node_modules/@angular/common/locales/en-KI.d.ts", {st_mode=S_IFREG|0755, st_size=478, ...}) = 0
unlinkat(AT_FDCWD, "./.ij/66104d/workspace/node_modules/@angular/common/locales/as.js", 0) = -1 EACCES (Permission denied)
unlinkat(AT_FDCWD, "./.ij/66104d/workspace/node_modules/@angular/common/locales/as.js", AT_REMOVEDIR) = -1 EACCES (Permission denied)
lstat("./.ij/66104d/workspace/node_modules/@angular/common/locales/as.js", {st_mode=S_IFREG|0755, st_size=8711, ...}) = 0
```

For a while I was convinced that either the syscall or part of the remove method was following symlinks in some kind of circular pattern. Digging a bit deeper, I popped open the code to the [function implementation](https://github.com/golang/go/blob/ba1de79a3a542b5bf25c4cc3be1c91d1ede47c55/src/os/removeall_at.go#L15). After reading through it for a while and re-assessing my own assumptions, I found myself staring a rather suspicious [loop](https://github.com/golang/go/blob/ba1de79a3a542b5bf25c4cc3be1c91d1ede47c55/src/os/removeall_at.go#L77). This loop is shown again below with some of the non-essentials omitted.

```go
func removeAllFrom(parent *File, path string) error {
    // prologue omitted

    for {
        const request = 1024

        file, err := openFdAt(parentFd, path)
        if err != nil {
            // error handling omitted
        }

        names, err := file.Readdirnames(request)
        if err != nil && err != io.EOF {
            file.Close()
            // error handling omitted
        }

        for _, name := range names {
            if err := removeAllFrom(file, name); err != nil {
                // error handling omitted
            }
        }

        file.Close()

        if len(names) < request {
            break
        }
    }

    // epilogue omitted
}
```

This loop is responsible for attempting to remove the entries of the directory at `path` before unlinking the directory itself from the filesystem. It does this by reading the entries of the directory in batches of 1024, attempting to delete each returned entry, and repeating the process while the directory contains more than 1024 entries.

So, what are the exit conditions of this loop? The *successful* exit condition, leaving via break statement, occurs when the number of entries of the directory is fewer than 1024. In this case, the names of all entries were returned, so any subsequent read will give a subset of the same names back. There are also additional exits (not shown) when a handle to the directory cannot be opened, but these are not occurring in the case being troubleshot.

Looking back at the file structure that is causing this odd behavior, I found the following.

```bash
./node_modules/@angular/common/locales$ ls | wc -w
1050
```

Nice coincidence. Just a bit over 1024. This behavior now makes sense. On each iteration of the loop, 1024 of the 1050 names are returned. As each one of these files are owned by root, they cannot be deleted by the current user. The recursive call returns an error that is **not** an exit condition of the loop (it simply stashes it for later return). The break statement is skipped as there is a second *page* of names which should have a deletion attempt. So we go back through the loop again, returning 1024 of the 1050 names, failing to delete any of them, and repeating.

The behavior of the remove function is to delete *as much as possible* before returning the first error encountered. In order to retain this behavior but not **block the process forever**, there has to be some point at which this procedure simply gives up. My initial suggestion is to read successively larger batches of names while the number of recursive errors is equal to the batch size. This technique would work well for directories containing a new ten or hundred thousand entries. But, at some point, the procedure will either have to read a practically unbounded number of names ([ZFS supports $2^{48}$ files per directory](https://en.wikipedia.org/wiki/ZFS#Features)) or reach some hard limit at which point they break and return a previous error.

This bug is particularly bad for software that needs to clean up files that are driven by user input (such as ij). Because the standard library gets stuck in an infinite loop, and goroutines are cooperative rather than pre-emptive, this *could* result in some serious avenues for denial of service attacks.

Golang issue [#29921](https://github.com/golang/go/issues/29921) has since been filed, and ij has been [patched](https://github.com/efritz/ij/commit/f53df071d103d68ebe8638826e4e0775be184167) to always include a step to flash the permissions of the workspace contents before exit.
