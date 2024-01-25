package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	stdurl "net/url"
	"os"
	"sort"
	"strings"
	"sync"

	"golang.org/x/net/html"
)

const (
	baseURL     = "https://eric-fritz.com"
	rootURL     = baseURL + "/articles"
	concurrency = 16
)

func main() {
	if err := mainErr(context.Background()); err != nil {
		fmt.Printf("error: %s\n", err)
		os.Exit(1)
	}
}

func mainErr(ctx context.Context) error {
	externalURLs, err := collectExternalURLs(ctx, rootURL)
	if err != nil {
		return err
	}

	errors := collectDeadExternalURLs(ctx, externalURLs)

	if len(errors) > 0 {
		var messages []string
		for _, err := range errors {
			messages = append(messages, "\t- "+err.Error())
		}
		sort.Strings(messages)

		return fmt.Errorf("%d dead links detected:\n%s", len(errors), strings.Join(messages, "\n"))
	}

	return nil
}

func collectExternalURLs(ctx context.Context, rootURL string) ([]string, error) {
	visited := map[string]struct{}{}
	var frontier []string
	frontier = append(frontier, rootURL)

	externalURLs := map[string]struct{}{}

	for len(frontier) > 0 {
		url := canonicalizeHref(frontier[0])
		frontier = frontier[1:]

		if _, ok := visited[url]; url == "" || ok {
			continue
		}
		visited[url] = struct{}{}

		if isExternal := !strings.HasPrefix(url, baseURL); isExternal {
			externalURLs[url] = struct{}{}
			continue
		}

		hrefs, err := visitURLAndExtractHrefs(ctx, url)
		if err != nil {
			return nil, fmt.Errorf("broken internal link: %s", err)
		}
		frontier = append(frontier, hrefs...)
	}

	var urls []string
	for url := range externalURLs {
		urls = append(urls, url)
	}
	sort.Strings(urls)

	return urls, nil
}

func collectDeadExternalURLs(ctx context.Context, externalURLs []string) []error {
	urlCh := make(chan string, len(externalURLs))
	for _, url := range externalURLs {
		urlCh <- url
	}
	close(urlCh)

	errCh := make(chan error, len(externalURLs))
	var wg sync.WaitGroup
	wg.Add(concurrency)

	for i := 0; i < concurrency; i++ {
		go func() {
			defer wg.Done()

			for url := range urlCh {
				if err := visitURL(ctx, url, func(r io.Reader) error { return nil }); err != nil {
					errCh <- err
				}
			}
		}()
	}

	wg.Wait()
	close(errCh)

	var errors []error
	for err := range errCh {
		errors = append(errors, err)
	}

	return errors
}

func visitURLAndExtractHrefs(ctx context.Context, url string) (hrefs []string, _ error) {
	err := visitURL(ctx, url, func(r io.Reader) (err error) {
		hrefs, err = extractHrefs(r)
		return err
	})

	return hrefs, err
}

func visitURL(ctx context.Context, url string, f func(io.Reader) error) error {
	fmt.Printf("Reading %q...\n", url)

	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("failed to get %q: %s", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code for %q: %d", url, resp.StatusCode)
	}

	return f(resp.Body)
}

func extractHrefs(r io.Reader) (hrefs []string, _ error) {
	doc, err := html.Parse(r)
	if err != nil {
		return nil, err
	}

	var visit func(*html.Node)
	visit = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "a" {
			for _, attr := range n.Attr {
				if attr.Key == "href" {
					hrefs = append(hrefs, attr.Val)
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			visit(c)
		}
	}
	visit(doc)

	return hrefs, nil
}

func canonicalizeHref(href string) string {
	parsedURL, _ := stdurl.Parse(href)
	if parsedURL.Scheme == "" {
		parsedURL, _ = stdurl.Parse(baseURL + href)
	}

	if parsedURL.Scheme != "https" {
		return ""
	}

	parsedURL.Fragment = ""
	parsedURL.RawQuery = ""
	parsedURL.Path = strings.TrimSuffix(parsedURL.Path, "/")

	return parsedURL.String()
}
