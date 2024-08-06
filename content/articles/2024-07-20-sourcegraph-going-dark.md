+++
title = "Sourcegraph is going dark"
slug = "sourcegraph-is-going-dark"
date = "2024-07-18T00:00:00-00:00" # TODO
tags = ["open-source"]
showpagemeta = true
+++

:(





> In other words, a public repository's forks will remain public in their own separate repository network even after the upstream repository is made private. This allows the fork owners to continue to work and collaborate without interruption.

> If a public repository is made private and then deleted, its public forks will continue to exist in a separate network.

[What happens to forks when a repository is deleted or changes visibility?](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/what-happens-to-forks-when-a-repository-is-deleted-or-changes-visibility)







TODO

```go
package main

import (
	"context"
	"fmt"
	"os"
	"sort"
	"strings"
)

func main() {
	if err := mainErr(context.Background()); err != nil {
		panic(err)
	}
}

func mainErr(ctx context.Context) error {
	// client := github.NewClient(nil).WithAuthToken("ghp_yeah_right_dont_hack_me")

	entries, err := os.ReadDir("prs/shas")
	if err != nil {
		return err
	}

	shaMap := map[string]struct{}{}
	for _, entry := range entries {
		if !strings.HasSuffix(entry.Name(), "-shas.json") {
			continue
		}

		content, err := os.ReadFile("prs/shas/" + entry.Name())
		if err != nil {
			return err
		}

		for _, sha := range strings.Split(strings.TrimSpace(string(content)), "\n") {
			shaMap[sha] = struct{}{}
		}
	}

	var shas []string
	for sha := range shaMap {
		shas = append(shas, sha)
	}
	sort.Strings(shas)
	for _, sha := range shas {
		fmt.Printf("%s\n", sha)
	}

	// var ids []int
	// for _, entry := range entries {
	// 	content, err := os.ReadFile("prs/" + entry.Name())
	// 	if err != nil {
	// 		return err
	// 	}

	// 	var pr github.PullRequest
	// 	if err := json.Unmarshal(content, &pr); err != nil {
	// 		return err
	// 	}

	// 	ids = append(ids, *pr.Number)
	// }

	// for _, id := range ids {
	// 	commits, _, err := client.PullRequests.ListCommits(ctx, "sourcegraph", "sourcegraph", id, &github.ListOptions{})
	// 	if err != nil {
	// 		return err
	// 	}

	// 	var shas []string
	// 	for _, commit := range commits {
	// 		shas = append(shas, *commit.SHA)
	// 	}

	// 	if err := os.WriteFile(fmt.Sprintf("prs/%d-shas.json", id), []byte(strings.Join(shas, "\n")), 0777); err != nil {
	// 		return err
	// 	}
	// }

	// page := 0
	// for {
	// 	fmt.Printf("Requesting page #%d...\n", page)

	// 	prs, resp, err := client.PullRequests.List(ctx, "sourcegraph", "sourcegraph", &github.PullRequestListOptions{
	// 		State: "all",
	// 		ListOptions: github.ListOptions{
	// 			Page:    page,
	// 			PerPage: 100,
	// 		},
	// 	})
	// 	if err != nil {
	// 		if resp.StatusCode == 409 {
	// 			duration := time.Until(resp.Rate.Reset.Time)
	// 			fmt.Printf("Sleeping for %s...\n", duration)
	// 			time.Sleep(duration)
	// 			continue
	// 		}

	// 		return err
	// 	}
	// 	if len(prs) == 0 {
	// 		break
	// 	}

	// 	for _, pr := range prs {
	// 		if *pr.User.Login != "efritz" {
	// 			continue
	// 		}

	// 		fmt.Printf("Saving %d: %s\n", *pr.ID, *pr.Title)
	// 		serialized, err := json.Marshal(pr)
	// 		if err != nil {
	// 			return err
	// 		}
	// 		if err := os.WriteFile(fmt.Sprintf("prs/%d.json", *pr.ID), serialized, 0777); err != nil {
	// 			return err
	// 		}
	// 	}

	// 	page++
	// }

	return nil
}
```

TODO

```
$ /Users/efritz/Desktop/scraped_sg/scrape/prs-by-number contains a directory of JSON blobs for each pull request. Each file has the name {pull request id}.json and contains a field "merge_commit_sha". Add these merge commit shas to the file so that each line is {id} {merge sha}.
```

TODO

```bash
#!/bin/bash

input_file="pull_request_ids.txt"
json_dir="/Users/efritz/Desktop/scraped_sg/scrape/prs-by-number"
output_file="pr_id_and_merge_sha.txt"

while IFS= read -r pr_id
do
  json_file="$json_dir/${pr_id}.json"
  if [ -f "$json_file" ]; then
    merge_sha=$(jq -r '.merge_commit_sha // ""' "$json_file")
  else
    merge_sha=""
  fi
  echo "$pr_id $merge_sha"
done < "$input_file" > "$output_file"

echo "Processing complete. Results saved in $output_file"
```

TDOO

```
$ take this file as input where each line is {pr id} {sha} and create a sed script to replace occurrences of "https://github.com/sourcegraph/sourcegraph/pull/{pr id}" with "https://github.com/efritz/sourcegraph/commit/{sha}" in this directory
```

TODO

```bash
#!/bin/bash

while IFS=' ' read -r id sha; do
    LC_ALL=C grep -rl "https://github.com/sourcegraph/sourcegraph/pull/${id}" . | \
    xargs -I {} perl -i -pe "s|https://github.com/sourcegraph/sourcegraph/pull/${id}|https://github.com/efritz/sourcegraph/commit/${sha}|g" {}
done < pr_id_and_merge_sha.txt
```
