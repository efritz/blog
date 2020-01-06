+++
title = "Testing Patterns in Go"
slug = "testing-patterns-in-go"
date = "2018-07-20T00:00:00-00:00"
tags = ["go", "testing"]
showpagemeta = true
+++

This article outlines some patterns of unit testing in Golang that I have found, over time, to work extremely well. he testing code here assumes the use of the [gomega](https://onsi.github.io/gomega) assertion library and the [sweet](https://github.com/aphistic/sweet) test-suite runner library.

### Mocking Interfaces

Consider the following definition of the function `WithCache` that memoizes the result of a function using a cache instance that conforms to the (simple) interface defined in [gache](https://github.com/efritz/gache). The implementation should be non-surprising: the cache fetch always happens, the target function is only invoked when a cache miss occurs, and whenever the target function is invoked is value is written back into the cache. Any error that occurs for the function invocation or while communicating with the cache is returned.

```go
package cacheutil

import "github.com/efritz/gache"

const CacheKey = "f.cache"

func WithCache(f func() (string, error), cache gache.Cache) (string, error) {
	if val, err := cache.GetValue(CacheKey); err != nil || val != "" {
		return val, err
	}

	val, err := f()
	if err == nil {
		err = cache.SetValue(CacheKey, val)
	}

	return val, err
}
```

This method implementation has a dependency on a cache instance which is created in a disjoint part of the code. In order to test this function, we need to supply it some legal value (as passing nil would cause it to panic on dereference). However, the behavior of the cache only needs to conform to the defined interface -- of course, this assumes that the use of the cache value is well-defined and does not rely on out-of-band implementation behavior (e.g. requires a particular type assertion to succeed). This is a perfect opportunity to use a mock object or, more generally, a test double (as discussed [here](http://engineering.pivotal.io/post/the-test-double-rule-of-thumb/#what-s-a-test-double) and [here](https://adamcod.es/2014/05/15/test-doubles-mock-vs-stub.html)).

I had previously fallen into a rather strict pattern of defining mocks in the following way to maximize reusability. Instead of creating a distinct mock cache struct for each test in which behavior must differ (i.e. returning a canned value, returning an error, stashing parameters, counting number of calls), I define only one struct in which all method behaviors are *pluggable* (and, even more expressively, mutable during the execution of a single test).

```go
type MockCache struct {
	GetValueFunc func(key string) (string, error)
	SetValueFunc func(key, value string, tags ...string) error
}

func NewMockCache() *MockCache {
	return &MockCache{
		GetValueFunc: func(string) (string, error) { return "", nil },
		SetValueFunc: func(string, string, ...string) error { return nil },
	}
}

func (c *MockCache) GetValue(key string) (string, error) {
	return c.GetValueFunc(key)
}

func (c *MockCache) SetValue(key, value string, tags ...string) error {
	return c.SetValueFunc(key, value, tags...)
}
```

An instance of a struct conforming to the target interface is created with a no-argument constructor method. This struct already has a default implementation for each interface method that ignores all parameters and returns only zero values. The function to which an interface method is delegated can be changed by simply assigning to a field of the mock cache struct.

You can get a **ton** of mileage out of this pattern. For a concrete example, you can pre-prepare values to be returned by a sequence of calls to a target function.

```go
// Prep return values
values := make(chan string, 3)
values <- "foo"
values <- "bar"
values <- "baz"

// Create a cache that returns values in sequence
cache := NewMockCache()
cache.GetValueFunc = func(key string) (string,error) {
	return <-values, nil
}

// ...
```

This solution is nice as it doesn't use anything other than the base language. Everything is extremely explicit within your test (as tests **should** be). It does not require heavy use of reflection or metaprogramming which can make things fuzzy. This fuzziness can be a problem in in tools such as [Python unittest](https://docs.python.org/3/library/unittest.mock.html#module-unittest.mock)'s `MagicMock` object and `patch` method. In the former, you may not mock enough of the target object and not realize it at test time -- you are more likely to get strange, subtle results from the misuse of a mock than an error because it is so, so effective at being magic. The use of the latter (when a mock object cannot be easily used instead) is a pretty good sign that your unit under test does not correctly draw a boundary between its own behavior and the behavior of its dependencies. Patch tends to make tests brittle as they rely on internal knowledge of the implementation (not only what function or object must be patched but often times *how the implementation imports that dependency*).

Creating these mock structures by hand, however, can be extremely tedious. For example, the official Go DynaSomoDB client defines 111 methods in its [mock interface](https://docs.aws.amazon.com/sdk-for-go/api/service/dynamodb/dynamodbiface/). Try implementing a mock for that sonuvabitch. Additionally, hand-crafted mocks can easily fall-out-of-sync with the interface. This requires an update to the test, even in the cases which do not affect this test -- where a method is added, or a method unused by the unit under test is deleted or modified.

<center>**Useful + Tedious = Good Opportunity for Automation**</center>

So let's automate! The tool [go-mockgen](https://github.com/efritz/go-mockgen) generates mock structs similar to the hand-written one earlier (with some additional niceties). To use it, simply add a *go generate* directive in the package that requires a generated mock (or run the command by hand).

```go
//go:generate go-mockgen github.com/efritz/gache -i Cache -o mock_cache_test.go -f
```

We can then use the generated mock in tests, changing the behavior of individual methods as needed -- usually, a low number of methods need an implementation in tests, but in order to activate certain control flow paths, non-zero-valued data must sometimes be returned from other methods of the mock. This can occur when an interface is used as a data provider (for example, get a user then get all the user's posts) or when the contract of an interface forbids a zero return value (for example, always yielding a non-nil result from a constructor or a factory).

```go
func (s *CacheSuite) TestValueFetched(t sweet.T) {
	cache := NewMockCache()
	cache.GetValueFunc = func(key string) (string, error) {
		return "foo", nil
	}

	val, err := WithCache(cache, func() (string, error) {
		return "", fmt.Errorf("should not be called")
	})

	Expect(err).To(BeNil())
	Expect(val).To(Equal("foo"))
}
```

Additionally, each generated mock also contains methods to retrive a call count and each method's invocation arguments. This reduces cases when methods must be supplied explicitly just to ensure it was invoked (setting a captured boolean flag) or to ensure that it was invoked with expected values (appending argument values to a captured list or writing argument values to a captured channel).

The field `Arg0` and `Arg1` in the following have are fields with the same type as the zeroth and first parameters of the `SetValue` function -- there's no magic here. This implementation decision allows you to compare values more easily and does not require type assertions after fetching the correct value by traversing lists-of-lists (suffering accidental out-of-bounds or mistyping errors).

```go
func (s *CacheSuite) TestValueCached(t sweet.T) {
	cache := NewMockCache()

	val, err := WithCache(cache, func() (string, error) {
		return "foo", nil
	})

	Expect(err).To(BeNil())
	Expect(val).To(Equal("foo"))
	Expect(cache.SetValueFuncCallCount()).To(Equal(1))
	Expect(cache.SetValueFuncCallParams()[0].Arg0).To(Equal(CacheKey))
	Expect(cache.SetValueFuncCallParams()[0].Arg1).To(Equal("foo"))
}
```

This technique works assuming that you correctly abstract your external requirements to be interfaces rather than pointers to or values of concrete structs. Unfortunately, there's a big offender in the standard library.

### Mocking Time

The [time](https://golang.org/pkg/time/) package is horribly leaky and unmockable by default. Any test that relies on a call to a sleep function is **broken**. Fortunately, this interface is duplicated by [glock](https://github.com/efritz/glock) and provides both a 'real' interface (that simply delegates all methods to the relevant methods in the time package) and a mock interface (in which the user can suspend and control the flow of time). In addition to methods such as `Now`, `After`, and `NewTicker`, the mock clock additionally provides `Advance` and `BlockingAdvance` methods. The former method sets the current time and will consider sending a value to all blocked consumers of channels returned by invocations of the after and ticker functions. The latter method works similarly, but ensure that there is at least one consumer blocked on such a method.

Consider the following definition of the function `OnTick` that calls a function until it returns an error, waiting one second before each invocation, and returns and total number of invocations the error that broke the loop. This implementation never invokes a non-deterministic time function directly. Instead, the function is defined with an explicit dependency on a clock interface.

```go
func OnTick(clock glock.Clock, f func() error) (n int, err error) {
	for err == nil {
		<-clock.After(time.Second)
		err = f()
		n++
	}

	return
}
```

This allows us to test our implementation orthogonally to wall time. The following test runs without blocking (or, at least faster than one second as the call to `Eventually` will cause the test to fail after being blocked for that long). Without mocking the clock, the test would need to actually block in one-second intervals and, in order to ensure correctness, the total runtime of the function would need to be fuzzily compared with the expected wait-time. In more complex implementations involving time, the number of synchronization issues increase rapidly.

```go
func (s *TickerSuite) TestOnTick(t sweet.T) {
	// Test behavior
	count := 5
	sync := make(chan struct{})

	// Actual Values
	var aN int
	var aErr error

	// Mock clock
	clock := glock.NewMockClock()

	go func() {
		// signal OnTick return
		defer close(sync)

		aN, aErr = OnTick(clock, func() error {
			count--
			if count <= 0 {
				return fmt.Errorf("utoh")
			}

			return nil
		})
	}()

	for i := 0; i < 5; i++ {
		// Time travel!
		clock.BlockingAdvance(time.Second)
	}

	// Ensure goroutine yields
	Eventually(sync).Should(BeClosed())

	// Test return values
	Expect(count).To(Equal(0))
	Expect(aErr).To(MatchError("utoh"))
	Expect(aN).To(Equal(5))
```

In order to show a more fine-grained view of the mock clock, we can replace the blocking-advance loop in the test above with the following code. This snippet defines a function `test` which ensure that the value `count` is the value `n` for at least one second. Because we are testing in multiple goroutines, we allow the initial value to be different as long as it quickly transitions ot the expected value.

```go
test := func(n int) {
	// count value should become (and remain) n
	Eventually(func() int { return count }).Should(Equal(n))
	Consistently(func() int { return count }).Should(Equal(n))
}

advanceAndTest := func(d time.Duration, n int) {
	clock.BlockingAdvance(d)
	test(n)
}

// No initial change
test(5)

// Advance causes f() to fire
advanceAndTest(time.Second, 4)

// Advance, but not enough
advanceAndTest(time.Millisecond * 500, 4)
advanceAndTest(time.Millisecond * 200, 4)
advanceAndTest(time.Millisecond * 200, 4)

// 1.025s elapsed, causes f() to fire
advanceAndTest(time.Millisecond * 125, 3)

// ...and the rest
advanceAndTest(time.Second, 2)
advanceAndTest(time.Second, 1)
advanceAndTest(time.Second, 0)
```

This snippet shows that advancing the clock does not trigger blocked consumers arbitrarily. The correct amount of time must elapse before consumers are unblocked.
