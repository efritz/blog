+++
title = "Sourcegraph went dark"
slug = "sourcegraph-went-dark"
date = "2024-08-19T00:00:00-00:00"
tags = ["sourcegraph", "open-source"]
showpagemeta = true
+++

Towards the end of my mid-2019 job search, I was down to joining the Google Go team or Sourcegraph. Sourcegraph ultimately won due to cultural factors - the most important of which was the ability to **build 100% in the open**. All documents were public by default. Technical and product RFCs (and later PR/FAQs) were drafted, reviewed, and catalogued in a public Google Drive folder. All product implementation was done in public GitHub repositories.

Today, the `sourcegraph/sourcegraph` repository went private. This is the final cleaving blow, following many other smaller chops, on the culture that made Sourcegraph an attractive place to work. It's a decision for a business from which I resigned, and therefore have no voice. But I still lament the rocky accessability of artifacts showing four years of genuine effort into a product that I loved (and miss the use of daily in my current role). [^1]

[^1]: The original repository seems to have been frozen into `sourcegraph/legacy-sourcegraph`, but I'm opting to bite the bullet now and move references to something completely under my control rather than kick then can down the road by referencing another repository that could suddenly disappear at any time.

On the bright side, I've cemented my place on the insights leaderboard for the remainder of time.

{{< lightbox
    src="/images/sg-went-dark/leaderboard.png"
    alt="Contributor leaderboard"
    anchor="insights" >}}

## Keeping references alive

Over my tenure at Sourcegraph I've done [a fair bit of writing](/tags/sourcegraph/) for the engineering blog, which I've inlined into this website for stable reference. It's interesting to see what people are trying to build and, for an engineer, how they're trying to build it. Much of my writing used links into relevant public code as a reference.

All of these links are now broken.

There's a common saying that [cool URIs don't change](https://www.w3.org/Provider/Style/URI). In a related sense, I have the hot take that _cool articles don't suddenly start rotting links_. I'm going to break at least **one** of these best practices, and I can't do anything about the first one. So I'll attempt to preserve as much information in this writing as possible by moving these links into a repository under my influence.

I had a feeling this would be a risk a while ago, so I had forked `sourcegraph/sourcegraph` into [`efritz/sourcegraph`](https://github.com/efritz/sourcegraph) in preparation. Given the fork, it should be easy enough job to do a global find-and-replace of one repository name with another at this point and mission accomplished, right?

Unfortunately, no. I had links to code on the `main` branch, but also links to pull requests and commits within pull requests. Forks don't inherit pull requests (problem #1). And commits not directly referenced by a branch of your fork are visible as only as long as they're part of the repository network (problem #2).

{{< lightbox
    src="/images/sg-went-dark/warning.png"
    alt="Non-local commit warning"
    anchor="warning" >}}

I had wondered [what happens to forks when a repository is deleted or changes visibility](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/what-happens-to-forks-when-a-repository-is-deleted-or-changes-visibility) and found some calming information in the official GitHub documentation:

> In other words, a public repository's forks will remain public in their own separate repository network even after the upstream repository is made private. This allows the fork owners to continue to work and collaborate without interruption. [...] If a public repository is made private and then deleted, its public forks will continue to exist in a separate network.

_My fork will continue to exist_ (yay), but the source repository becoming inaccessible might take commits outside of the `main` branch with it. I need to ensure that these commits are part of the new repository network.

## Scraping for relevant commits

Step one is to find all the commits I care about. I ran the following Go program to iterate through all of _my_ pull requests on the source repository and write their payloads to disk for further processing.

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/go-github/v63/github"
)

const (
	owner      = "sourcegraph"
	repo       = "sourcegraph"
	targetUser = "efritz"
	token      = "ghp_pls_dont_hax_me"
)

func main() {
	ctx := context.Background()

	if err := scrapePRs(ctx); err != nil {
		log.Fatalf("Error: %v", err)
	}
}

func scrapePRs(ctx context.Context) error {
	client := github.NewClient(nil).WithAuthToken(token)

	page := 0
	for {
		fmt.Printf("Requesting page #%d...\n", page)

		prs, resp, err := client.PullRequests.List(
			ctx, 
			owner, 
			repo, 
			&github.PullRequestListOptions{
				State: "all",
				ListOptions: github.ListOptions{
					Page:    page,
					PerPage: 100,
				},
			},
		)
		if err != nil {
			if !resp.Rate.Reset.Time.IsZero() {
				duration := time.Until(resp.Rate.Reset.Time)
				time.Sleep(duration)
				continue
			}

			return err
		}
		if len(prs) == 0 {
			break
		}

		for _, pr := range prs {
			if *pr.User.Login != targetUser {
				continue
			}

			fmt.Printf("Saving %d: %s\n", *pr.ID, *pr.Title)
			serialized, err := json.Marshal(pr)
			if err != nil {
				return err
			}
			filename := fmt.Sprintf("prs/%d.json", *pr.ID)
			if err := os.WriteFile(filename, serialized, 0777); err != nil {
				return err
			}
		}

		page++
	}

	return nil
}
```

This program yielded 2,645 files with pull request metadata. I then used `jq` to read these JSON payloads and extract data for subsequent steps.

```bash
for file in prs/*.json; do
	number=$(jq -r '.number' "$file")
	merge_commit_sha=$(jq -r '.merge_commit_sha // ""' "$file")

	echo "$number" >> pr_ids.txt
 	echo "$merge_commit_sha" >> commits.txt
	echo "$number $merge_commit_sha" >> replace_pairs.txt
done
```

This script creates three files:

- `pr_ids.txt` is a flat list of GitHub identifiers, which are used in URLs. Since the list endpoint returns only enough data to render a pull request _list_, we'll need to fetch additional information (intermediate commits) for each pull request by its ID.
- `commits.txt` is a flat list of git SHAs that were a result of merging a PR into the target branch (not always `main`). These commits may or may not be in the forked repository network, depending on the merge target. These should be synced over.
- `replace_pairs.txt` contains pairs of of pull request identifier and its merge commit. This will later be used to mass replace `/pull/{id}` with `/commit/{sha}`. Since pull requests can't be linked directly anymore, I can at least link to the full pull request _contents_.

Next, I ran a second program (with the same preamble as the program above) to list all the _non-merge commits_ of each pull request. Based on the [pants-on-head way I work](/articles/i-am-abusive-to-git/), these will mostly be `WIP.` commits, but _sometimes_ I did a better job and (possibly) linked directly to these.

```go
func extractCommits(ctx context.Context) error {
	contents, err := os.ReadFile("pr_ids.txt")
	if err != nil {
		return err
	}

	var ids []int
	for _, line := range strings.Split(string(contents), "\n") {
		if line == "" {
			continue
		}

		var id int
		_, _ = fmt.Sscanf(line, "%d", &id)
		ids = append(ids, id)
	}

	client := github.NewClient(nil).WithAuthToken(token)

	for _, id := range ids {
		for {
			commits, resp, err := client.PullRequests.ListCommits(
				ctx, 
				owner, 
				repo, 
				id, 
				&github.ListOptions{},
			)
			if err != nil {
				if !resp.Rate.Reset.Time.IsZero() {
					duration := time.Until(resp.Rate.Reset.Time)
					time.Sleep(duration)
					continue
				}

				return err
			}

			for _, commit := range commits {
				fmt.Println(*commit.SHA)
			}

			break
		}
	}

	return nil
}
```

Running `go run . >> commits.txt` dumped these commits onto the end of the file and completes the set of Git SHAs that need to be brought into the repository network for stable reference.

## Bringing commits into the new repository network

Given the warning above (_"does not belong to any branch on this repository"_), it should be sufficient to ensure that my fork has a branch containing each relevant SHA I'd like to retain access to.

Bash here does a good enough job since all we're doing is a bunch of git operations in sequence.

```bash
#!/bin/bash

for SHA in $(cat commits.txt); do
    git fetch upstream $SHA             # Pull SHA from sg/sg
    git checkout -b "mirror/$SHA" $SHA  # Create reference in fork
    git push origin "mirror/$SHA"       # Push branch to efritz/sg
    git checkout main                   # Reset
    git branch -D "mirror/$SHA"         # Cleanup
done
```

## Rewriting references

At this point I should be safe and have _some target_ to link to in my fork for each reference to a pull request or commit in the source repository. Now I just have to figure out how to automate that process (there are at least 275 code references over 15 files and I'm not doing that by hand).

Ironically, I used [my own thing](https://github.com/efritz/aidev) instead of Cody to figure out how to use `xargs` correctly for this task.

```bash
#!/bin/bash

sg_prefix='https://github.com/sourcegraph/sourcegraph'
fork_prefix='https://github.com/efritz/sourcegraph'

# Rewrite direct references to commits to the fork
grep -rl "${sg_prefix}/commit/" . | \
xargs -I {} perl -i -pe "s|${sg_prefix}/commit/|${fork_prefix}/commit/|g" {}

# Rewrite references to pull request to their merge commit in the fork
while IFS=' ' read -r id sha; do
    grep -rl "${sg_prefix}/pull/${id}" . | \
    xargs -I {} perl -i -pe "s|${sg_prefix}/pull/${id}|${fork_prefix}/commit/${sha}|g" {}
done < replace_pairs.txt
```

**Now** I think we can say mission accomplished and I hope my dead links detector stops throwing a fit after [all these changes](https://github.com/efritz/blog/pull/48).
