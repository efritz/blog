+++
title = "Linear MTF Hash Table"
slug = "linear-mtf-hash-table"
date = "2017-08-30T00:00:00-00:00"
tags = ["theory"]
showpagemeta = true
+++

Vehicular routing is a very interesting real-world problem that contains two distinct but interacting combinatorial optimization problems: the [travelling salesman problem (TSP)](https://en.wikipedia.org/wiki/Travelling_salesman_problem) and the [0-1 knapsack problem (KP)](https://en.wikipedia.org/wiki/Knapsack_problem). This unison of problems, unfortunately, creates a lot of opportunity for local maxima. Finding a better route for a particular truck may decrease the optimality of the contents fo the truck, and vice versa.

[RedPrairie](https://jda.com/)'s approach to this problem was to approximate *some* solution, then iteratively and stochastically apply small transformations to the solution. This may be switching the order of two stops on a route, or moving a stop from one route to another. If this invalidates the solution or leads to a higher-cost route, the transformation is thrown out. This tends to create a solution which cannot easily be tweaked by a human to create something obviously better, but was almost certainly suboptimal - this is simply a curse of the solution space space.

In order to find the *cost* of a particular route, the distance between two stops had to be known. Queries to a [GIS](https://en.wikipedia.org/wiki/Geographic_information_system) gave the necessary data, but such queries were often slow. Fortunately, the set of queries to the GIS was highly local[^1] and the addition of a local (dumb) cache was an attractive solution to speeding up this part of the approximator. That's where I came in.

[^1]: If a query is made now, it is likely that the same query will be made again in the near future.

### Lightning Review of Hash Tables

Hash tables fall come in two varieties. A hash table that uses *separate chaining* stores a reference to a linked list in each slot. Lookup, insertion and deletion from the hash table is done by searching, inserting, and removing a node from the list in the correct slot. The cost of a lookup in such a table is linear to the size of the linked list. These lists are fairly short in practice, assuming an evenly-distributed hash function. Java Collection's [HashMap](http://www.docjar.com/html/api/java/util/HashMap.java.html) is an example of this technique.

{{< img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/Hash_table_5_0_1_1_1_1_1_LL.svg" absolute="true" >}}

A hash table that uses *open addressing*, on the other hand, stores key/value pairs directly in the table instead of in an auxiliary data structure. However, this makes *hash collisions* a bit more interesting. Suppose two keys $k_1$ and $k_2$ hash to the same slot $i$ (extremely likely without [perfect hashing](https://en.wikipedia.org/wiki/Perfect_hash_function), which has its own troubles). Obviously, both keys cannot occupy the same slot simultaneously. If $k_1$ occupies slot $i$, $k_2$ may attempt to occupy slot $i + 1$, then $i + 2$ and so on until a free slot is found. Lookup happens symmetrically, where the search begins at slot $i$ and proceeds along the sequence $i + 1$, $i + 2$, $\dots$, until we encounter one of the following conditions.

- the target key is found
- we arrive back at index $i$
- we see a slot containing `null`

If we arrive back at index $i$ without seeing the target key, then the table is full (and every slot is occupied). If we encounter a slot containing `null`, then the key does not exist in the table - if it was present it would have been inserted here or earlier in the search sequence. In order to guarantee that this holds on deletion, entries which are removed are replaced by a special `DELETED` *tombstone* instead of being set back to `null`.

{{< img src="https://upload.wikimedia.org/wikipedia/commons/b/bf/Hash_table_5_0_1_1_1_1_0_SP.svg" absolute="true" >}}

The cost of a lookup in such a table is less direct. Several slots in the same neighborhood may try to write to the same set of slots, leading to [primary clustering](https://en.wikipedia.org/wiki/Primary_clustering). If key $k$ hashes to slot $i$, it is not guaranteed that the key residing in slot $i$ is equal to $k$ - it may have just have been written there because it was the first open slot in its probe sequence.

### Memory Usage

Open addressing should not be dismissed, *especially for a cache* - tables using separate chaining may lead to faster lookups, but the lower memory overhead of tables using open addressing may allow **more** cache entries to sit in memory before eviction. It may be worth the trade-off if the slower table can reduce the number of external lookups, which may cost orders of magnitude more time.

Let $n$ be the number of entries in the table and let $m$ be the *capacity* of the table. Note for separate chaining it is possible for $n > m$ with increasingly degraded performance.

The following is a description of a singly-linked list node used for separate chaining. This class occupies 8 bytes for each of the `key`, `value`, `next`, and `hashCode` fields. Additionally, each JVM object reserves 16 bytes for an object header storing class, garbage collection, and lock metadata. Using this object layout, separate chaining hash table occupies $8m+48n$ bytes.

```java
class HashEntry<K, V> implements Map.Entry<K, V> {
                           //   16-byte object header
    K key;                 //  + 8-byte ref field
    V value;               //  + 8-byte ref field
    HashEntry<K, V> next;  //  + 8-byte ref field
    int hashCode;          //  + 8-byte int field
                           // = 48 - no padding necessary
}
```

We could possibly get away without the `hashCode` field if we were willing to trade the extra $8n$ bytes of space for several hash recalculations on each hash lookup (keep in mind that may be very expensive for large structures and long strings).

With open addressing, a key and value pair hashed to slot $i$ can be stored in index $2i$ and $2i+1$ without needing to allocate additional storage to link the key and the value together. Such a hash table occupies $16m$ bytes (two indices per slot and 8-byte references per index) and its memory cost is independent of the number of entries in the table.

Because we're designing a cache, we want the table with the lowest memory footprint: this will allow us to fit more in memory before needing to evict older (or less frequently accessed) entries from the table. Given the same values for $n$ and $m$, a table using open addressing is the cheaper option when $\frac{m}{6} \le n$, or when the table is more than 16.6% full. For any useful cache, this will **always** be the case.

### Self-Organizing Tables

We're not done yet! We can still do little heuristic tricks to decrease the cost of lookups in practice. Because keys are constantly being swapped in and out of the table, it's not possible to determine an insertion order of keys which will yield a smaller lookup cost in practice (and if we had such foresight to know exactly what our cache keys are in advance, we might as well hard-code the distance values in the solver). What we *can* do is intermittently reorganize the table so that the keys which are *more likely* to be accessed in the near future can be done so quickly. Several other data structures display similar properties. A [splay tree](https://en.wikipedia.org/wiki/Splay_tree), a type of heuristic self-balancing binary search tree, rearranges the tree so that the most recently accessed key is the root and guarantees constant-time access if it's immediately queried again (and slightly larger constant-time access for keys in the same neighborhood).

We can try to apply a [move to front heuristic](https://en.wikipedia.org/wiki/Self-organizing_list#Move_to_Front_Method_.28MTF.29) so that when a key is accessed it will be inserted as the *first* value in its slot. [Zobel, Heins, and Williams](http://www.mathcs.emory.edu/~whalen/Hash/Hash_Articles/In-memory hash tables for accumulating text vocabularies.pdf) have shown this heuristic perform very in practice when the set of values which are referenced are done so around the same time.

This is downright trivial to apply to a hash table using separate chaining: on each successful search, unlink the node from the list and add it to the head of the list. For open addressing, it's just a bit more difficult (but only in the details).

Our goal is to design a method to *rotate* a cluster (starting at slot $i$) so that our target key (which currently resides in slot $j$) is placed at the head of the cluster and the remaining keys maintain relative order.

Previously I mentioned that we need to store keys and values without allocating a structure to store them in. This means that when we refer to slot $i$, we actually refer to key index $2i$ and value index $2i + 1$. Let's suppose we have a function

```java
void swap(int i, int j);
```

which will swap the values of indices $2i$ and $2j$ as well as $2i+1$ and $2j+1$. Then, we can write an initial draft of our function. We could probably better using `System.arraycopy`, but I prefer it this way for clarity (at least on a blog).

```java
void promoteSlot(int i, int j) {
    if (i < j) {
        // The cluster goes from left to right and we don't
        // have to worry about falling off the table.

        for (int k = j - 2; k >= i; k -= 2) {
            swap(k, k + 2);
        }

        return;
    }

    // In this case, our cluster is split by the right edge of
    // the table. We need to rotate in two parts (start to the
    // right edge, left edge to the end).

    for (int k = j - 2; k >= 0; k -= 2) {
        swap(k, k + 2);
    }

    swap(0, table.length - 2);

    for (int k = table.length - 4; k >= i; k -= 2) {
        swap(k, k + 2);
    }
}
```

What this ends up doing is rotating our target key/value pair *backwards* through the probe sequence, as illustrated here ($i = 1$ and $v = 4$).

{{< img src="/images/table-rotation.svg" >}}

We also need to be concerned that we didn't just bork our table and make keys *unreachable*. Notice that every key we moved *except* for our target key was moved exactly one slot to the right. Also notice that because our target key was found sitting at slot $j$, there must not be any empty slots in the probe sequence from $i$ to $j$. Our target key is reachable by a subsequent query, as such a query would start at slot $i$. Any moved key would be reachable by a subsequent query, albeit one that has to look at exactly one additional key (our target key).

Note that while this proof is trivial for linear probing, a separate strategy would need to be constructed specifically to support other probe sequences such as [quadratic probing](https://en.wikipedia.org/wiki/Quadratic_probing) or [double hashing](https://en.wikipedia.org/wiki/Double_hashing).

The function above is rather stupid and just rotates a bunch of array keys without thinking too hard about it. Let's make our function slightly more intelligent (read: efficient).

```java
void promoteSlot(int i, int j) {
    // Save target pair
    K k1 = getKeyAtSlot(j);
    V v1 = getValAtSlot(j);

    // Remove target pair from table
    setPairAtSlot(DELETED, null);

    while (k1 != DELETED) {
        // Get copy of current slot before we replace it
        K k2 = getKeyAtSlot(i);
        V v2 = getValAtSlot(i);

        // Move the previous slot one jump to the right
        setPairAtSlot(k1, v1);

        // Our new temp values are the pair we just clobbered
        k1 = k2;
        v1 = v2;

        i = (i + 1) % capacity();
    }

    // We stop once we write into a DELETED slot
}
```

We've made a few changes. First, instead of scanning the array from right-to-left (which is elegant as it does not require any temporary storage), we scan from left-to-right. This necessitates the variables `k1` and `k2` which hold the values in the slot that was just usurped from them by their left neighbor. Second, we stop early once we encounter a `DELETED` tombstone - the benefits of doing so are illustrated below.

First, we stash our target pair and immediately put a `DELETED` tombstone in slot $j$. This ensures our loop condition will eventually be met if we don't happen to see any other tombstones in our probe sequence. Next, we insert our stashed pair into slot $i$ and stash the previous contents of slot $i$. This repeats with slot $i + 1$, slot $i + 2$, and so on until we write to a slot that didn't have anything useful in it.

{{< img src="/images/table-rotation-smart.svg" >}}

In addition to rotating only part of the cluster, this version also has the effect of pushing `DELETED` elements further down the cluster so that the elements that are actually returned during a search are compacted closer to their target slot.

Now, benchmarking this on the JVM is an entirely different story.
