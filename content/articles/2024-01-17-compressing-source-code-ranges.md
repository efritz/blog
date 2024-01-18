+++
title = "Pearl: Compressing source code ranges"
slug = "compressing-source-code-ranges"
date = "2024-01-17T00:00:00-00:00"
tags = ["pearl"]
showpagemeta = true
+++

_Since the dawn of time, mankind hath sought to make things smaller._

One of the favorite _little_ pieces of code I wrote during my time at Sourcegraph was an [`EncodeRanges`](https://sourcegraph.com/github.com/sourcegraph/sourcegraph@53a48d9b239b80a6aa7835f5acd487124825e286/-/blob/internal/codeintel/shared/ranges/ranges.go?L21:6&popover=pinned) function that took a series of offsets into a text document and compressed them into a tight, tiny, opaque ball of bits.

At the time, I was designing a new set of Postgres tables and indexes that would store a quick way to go from a globally unique _symbol_ (name of a type, a variable, etc) to all of the source code locations that relate to it. These structures would enable operations such as listing every relevant part of a file that defines an _implementation_ of a given target interface. The table would relate a `symbolName` to components of `repository`, `commit`, `fileName`, and `ranges` for each reference of the symbol. References are grouped together by their _class_, which allows us to select the proper set of references in different operations such as _go to the interface that describes this implementation_, or _find all uses of this type_.

To save space, I did some tricks such as interning `fileName` into a secondary table so that we'd only have to store many copies of a row identifier rather than the same number of copies of the full raw text path, and storing 40-character Git SHAs as 160-bits integers (as $16^{40} = 2^{160}$). The subsequent data dominating storage was the huge array of integers forming the `range` payload. Using the `EncodeRanges` function, the `range` payload could be compressed to the point where the storage of file paths would again be the subject of (future) concern.

This function a nice piece of code because it works particularly wall *in the context it was written for*. This isn't an _algorithmic_ pearl, where the procedure will produce some optimal value for any pathological input you could supply. In fact, it's the opposite. It's the anti-Bellman–Ford. It makes *very specific* assumptions about how its input will be supplied, in order to take advantage of insights in the common cases of the input distribution.

The code, in its entirety [^1], is shown below.

[^1]: This code works but has been edited (more terse comments, new variable names) to fit more naturally on a webpage.

```go
// EncodeRanges serializes ranges of the form `[startLine, startCharacter, endLine, endCharacter]`
// into a compact binary format. It is assumed that the ranges are sorted by their start components.
func EncodeRanges(values []int32) ([]byte, error) {
	n := len(values)
	if n == 0 {
		return nil, nil
	} else if n%4 != 0 {
		return nil, fmt.Errorf("unexpected range length - have %d but expected a multiple of 4", n)
	}

	var (
		numRows   = n / 4
		col1Begin = numRows * 0 // determine column offsets
		col2Begin = numRows * 1
		col3Begin = numRows * 2
		col4Begin = numRows * 3
	)

	// Encode components of first range into columns
	deltaEncoded := make([]int32, n)
	deltaEncoded[col1Begin] = values[0]
	deltaEncoded[col2Begin] = values[1]
	deltaEncoded[col3Begin] = values[2] - values[0] // (end - start)
	deltaEncoded[col4Begin] = values[3] - values[1]

	// Delta-encode components of remaining ranges into columns
	for di, ri := 1, 4; di < numRows; di, ri = di+1, ri+4 {
		deltaEncoded[col1Begin+di] = values[ri+0] - values[ri-4] // (curr - prev)
		deltaEncoded[col2Begin+di] = values[ri+1] - values[ri-3]
		deltaEncoded[col3Begin+di] = values[ri+2] - values[ri+0] - (values[ri-2] - values[ri-4])
		deltaEncoded[col4Begin+di] = values[ri+3] - values[ri+1] - (values[ri-1] - values[ri-3])
	}

	// Reverse the elements in the fourth column
	for lo, hi := col4Begin, n-1; lo < hi; lo, hi = lo+1, hi-1 {
		deltaEncoded[lo], deltaEncoded[hi] = deltaEncoded[hi], deltaEncoded[lo]
	}

	binaryEncoded := make([]byte, 0, n*4) // pessimistic capacity
	for i := 0; i < n; {
		if value := deltaEncoded[i]; value != 0 {
			// Write non-zero value as varint
			binaryEncoded = binary.AppendVarint(binaryEncoded, int64(value))
			i++
		} else{
			runStart := i
			for i < n && deltaEncoded[i] == 0 {
				i++
			}

			// Write run of zero values as <0, runLength>
			binaryEncoded = binary.AppendVarint(binaryEncoded, int64(0))
			binaryEncoded = binary.AppendVarint(binaryEncoded, int64(i-runStart))
		}
	}

	return binaryEncoded, nil
}
```

## What makes this code so special?

Honestly, nothing! The code itself is not revolutionary and will appear in no papers. It's just a bunch of techniques that are applied in a thoughtful order that yields a huge savings in a dimension that was concerning for the project at the time. It did its job, it understood the assignment, and that's as valid a definition of **good code** as any.

To better understand the context of the encoding, let's try an example. Suppose we're looking for all uses of the Go standard library function `fmt.Fprintf`. Here's a snippet of a text document including some occurrences of this function, starting at line 150:

{{< highlight go "linenostart=150" >}}
func serializeValues(w io.Writer, vs []string) {
	fmt.Fprintf(w, HeaderText) // 151:6-151:13
	fmt.Fprintf(w, MetaText)   // 152:6-152:13
	fmt.Fprintf(w)             // 153:6-153:13

	xs := make([]string, len(vs))
	ys := make([]string, len(vs))
	for i, v := range vs {
		name := titleCase(v)
		xs[i] = fmt.Sprintf("%s: %q", name, v)
		ys[i] = name
	}

	fmt.Fprintf(               // 163:6-163:13
		w,
		JoinTemplate,
		strings.Join(xs, "\n"),
		strings.Join(ys, ", "),
	)
}
{{< / highlight >}}

There are ten total occurrences of `fmt.Fprintf` in this document. Four of these occurrences are shown in the snippet above, and another six occurrences presumably occur earlier in the document. Each range that describes the position of an occurrence in a document is composed of four components: a start line, a start character, an end line, and an end character. These components can be compacted into a single integer array, as follows.

```go
ranges := []int32{
     58, 7,  58, 14, //  58:7 -  58:14
     69, 7,  69, 14, //  69:7 -  69:14
    103, 8, 103, 15, // 103:8 - 103:15
    109, 7, 109, 14, // 109:7 - 109:14
    134, 7, 134, 14, // 134:7 - 134:14
    146, 7, 146, 14, // 146:7 - 146:14
    151, 6, 151, 13, // 151:6 - 151:13 (shown above)
    152, 6, 152, 13, // 152:6 - 152:13 (shown above)
    153, 6, 153, 13, // 153:6 - 153:13 (shown above)
    163, 6, 163, 13, // 163:6 - 163:13 (shown above)
}
```

Now the question is, how small can we make this payload so that we can shove it into a database column without blowing the company's runway on poorly utilized disk space?

### Naive encoding

In our most basic binary encoding, we can lay each 32-bit integer down into a byte array, one after another. Each of the 40 values occupies 32 bytes, meaning it takes 160 bytes to encode all 10 ranges, as so:

```
00000000 00000000 00000000 00111010 // 58
00000000 00000000 00000000 00000111 // 7
00000000 00000000 00000000 00111010 // 58
00000000 00000000 00000000 00001110 // 14
00000000 00000000 00000000 01000101 // 69
00000000 00000000 00000000 00000111 // 7
00000000 00000000 00000000 01000101 // 69
00000000 00000000 00000000 00001110 // 14
...
```

### Variable-width integer encoding

Given that we're encoding components of source code ranges, we can take advantage of the fact that the value of each component will, the vast majority of the time, never touch the majority of the significant bits of the encoding. Line numbers for even very large files will range in the hundreds to thousands (possibly tens of thousands of lines before other developer tooling tooling begins to choke), and character numbers will generally stay below 100 or so. Even more, zealots will always [keep it below 80](https://en.wikipedia.org/wiki/Punched_card) as a principled rule. These numbers ar miniscule compared to 2 billion, the upper range of a 32-bit integer.

We can, in a slightly more sophisticated fashion, encode integers by keeping only the necessary lower bits of each value. To do this, we use the [`binary.PutVarint`](https://pkg.go.dev/encoding/binary#PutVarint) function in Go's standard library, which implements [base 128 varint encoding](https://protobuf.dev/programming-guides/encoding/#varints) as described by the Protocol Buffers spec. The encoding process is simple.

First, the input number is [zig-zag encoded](https://lemire.me/blog/2022/11/25/making-all-your-integers-positive-with-zigzag-encoding/). This converts the input from a 32-bit signed integer into a 64-bit unsigned integer, where the negatives are "interleaved" with the non-negatives. Intuitively, this maximizes the leading zeroes for numbers with a smaller absolute value (those closer to zero).

```binary
  0 //  0
  1 // -1
 10 //  1
 11 // -2
100 //  2
101 // -3
110 //  3
...
```

Next, the resulting zig-zagged integer is encoded into the minimum sequence of of binary octets. Each octet, except for the last, has the most significant "continuation bit" set to denote that it's not the final octet in a sequence encoding a value. While the integer cannot be represented in seven bits, the seven least significant bits will be (destructively) shifted off to form a new octet and its continuation bit will be set. Eventually, the remaining integer will be less than 128, and become the final octet.

To encode the value 856, we first zig-zag encode it as the following 64-bit pattern (grouped into 7s):

```
0 0000000 0000000 0000000 0000000 0000000 0000000 0000000 0001101 0110000
                                                                  ^^^^^^^
                                                          ^^^^^^^ 
```

We then pull the last seven digits from this value to form the first octet. Because the remaining value (`1101`) is non-zero, we add a continuation bit to yield `10110000`. The remaining value can be encoded in a single octet, yielding a complete varint representation as the following 16-bit pattern:

```
10110000 00001101
``````

Encoding each integer in this way allows us to encode all 10 ranges in only 58 bytes, as so:

```
01110100          // 58
00001110          // 7
01110100          // 58
00011100          // 14
10001010 00000001 // 69
00001110          // 7
10001010 00000001 // 69
00011100          // 14
...
```

This yields an initial 64% reduction in space, but we have more tricks to apply.

### Delta encoding

Varint encoding is so successful because _our input integers are already fairly small_. If there's a way to we can losslessly alter the data so that the inputs are even smaller, we can compound this benefit for even more space savings. To achieve this, we can use [delta encoding](https://en.wikipedia.org/wiki/Delta_encoding) to store the _difference_ between adjacent values in a sequence, rather than encoding the original values as they are given.

#### Step 1: Column-orient the data

The first step we take is to flip the rows and the columns of the input array. This makes it so that each start line is adjacent to another start line, each start character is adjacent to another start character, and so on, and has the effect of lowering the _variance_ between sequential elements.

```go
ranges := []int32{
    58, 69, 103, 109, 134, 146, 151, 152, 153, 163, // start lines
     7,  7,   8,   7,   7,   7,   6,   6,   6,   6, // start characters
    58, 69, 103, 109, 134, 146, 151, 152, 153, 163, // end lines
    14, 14,  15,  14,  14,  14,  13,  13,  13,  13, // end characters
}
```

Because ranges are supplied in ascending order, high variance between start lines will occur only when there are large gaps between symbol references. The variance in start characters are bounded by the maximum line length in a given file, enforced by senior engineers, rigid style guides, and bounded monitor real estate. The variance in ending line and character offsets turn out to be inconsequential because of the next few tricks we employ.

#### Step 2: Store span lengths

If we consider what ranges we're encoding represents, we can do something ridiculously effective. In the most common case, we're encoding the range of an _identifier_, not the entirety of an expression block. Thus, the range does not span multiple lines, and the start line and end line will, for a dominating proportion of uses, be the same. Furthermore, the majority of operations we're enabling will result in a list of references _of the same length_. In the case of our running example, the references to our target is always `Fprintf`, which is 7 characters long **in every context in which it appears**.

Our next trick is to replace the ending line and character offsets with the range's line and character _span lengths_.

```go
ranges := []int32{
    58, 69, 103, 109, 134, 146, 151, 152, 153, 163, // start lines
     7,  7,   8,   7,   7,   7,   6,   6,   6,   6, // start characters
     0,  0,   0,   0,   0,   0,   0,   0,   0,   0, // line span length
     7,  7,   7,   7,   7,   7,   7,   7,   7,   7, // character span length
}
```

Given that our goal is to minimize the value of each component, we've already done very well. In our example, we've reduced a quarter of the values to zero, and cut another quarter of the values by half.

But we're not done cooking.

#### Step 3: Delta-encode each column

Now that our data is prepped and our mise en place is at the stovetop, we can finally apply some heat. To perform the delta encoding, we replace each value in the array with the difference to the value that precedes it in the original array.

```go
ranges := []int32{
    58,  11,  34,   6,  25,  12,   5,  1,  1,  10, // start lines (delta-encoded)
     7,   0,   1,  -1,   0,   0,  -1,  0,  0,   0, // start characters (delta-encoded)
     0,   0,   0,   0,   0,   0,   0,  0,  0,   0, // line span length (delta-encoded)
     7,   0,   0,   0,   0,   0,   0,  0,  0,   0, // character span length (delta-encoded)
}
```

**Look at all those zeroes!**

Since all character span lengths were the same, all but the first value reduces down to zero. In addition, we're encoding ranges of an identifier that's used as the _prefix of a statement_. This statement won't happen at any arbitrary starting column, but will be bound to a small number of indentation levels: a print statement within a function, a print statement within an if statement or loop, etc. In this example, it reduces most of elements of the start character sequence down to the range $\lbrace -1, 0, +1\rbrace$.

There are many such cases across languages where identifier references will happen to occupy a fixed set of columns. In Go, for example, the receiver or type name for methods will fall into a repetitive pattern; as will the type names of aligned fields in structs or variable and constant blocks.

Encoding this sequence as varints can be done in 40 bytes, as each element can be encoded within a single octet, yielding a stacked 31% reduction in space, or a 75% reduction from our original naive encoding.

_But look at all those zeroes..._

### Encoding runs of zero-runs

For our last trick, we'll remove some unnecessary elements from the encoding altogether. Nothing is smaller than something you didn't need to encode in the first place.

We use [run-length encoding](https://en.wikipedia.org/wiki/Run-length_encoding) to replace $n$ occurrences of a zero element with two values: a zero (indicating a zero run) and the number of zeroes that followed it in the sequence. When we encounter a zero while decoding, we simply need to read the subsequent value and produce that many zeroes to reconstruct the original run.

Before compressing runs, we notice that the line span lengths and character span length sequences both end in a long sequence of zeroes. If we reverse the elements in the latter sequence, we then have one sequence that _ends_ in a long run of zeroes, and a subsequent sequence that _begins_ in a long run of zeroes. This maximizes the length of the run so it can be compressed as a single element, rather than two distinct runs with a non-zero element between them.

```go
ranges := []int32{
    58, 11, 34,  6, 25, 12,  5, 1, 1, 10,
     7,  0,  1, -1,  0,  0, -1, 0, 0,  0,
     0,  0,  0,  0,  0,  0,  0, 0, 0,  0,
     0,  0,  0,  0,  0,  0,  0, 0, 0,  7, // reversed
}
```

Applying run-length encoding and reformatting the elements so it's obvious yields a new, shorter sequence which we'll then encode into varints as described earlier.

```go
ranges := []int32{
    58, 11, 34, 6, 25, 12, 5, 1, 1, 10, 7, // (non-zero run)
     0,  1,                                // run of  1 zero
     1, -1,                                // (non-zero run)
     0,  2,                                // run of  2 zeroes
    -1,                                    // (non-zero run)
     0, 22,                                // run of 22 zeroes
     7,                                    // (non-zero run)
}
```

After all our changes, it's now possible to rendered the final binary encoding in its entirety:

```
01110100 00010110 01000100 00001100 00110010 00011000 00001010
00000010 00000010 00010100 00001110 00000000 00000010 00000010
00000001 00000000 00000100 00000001 00000000 00101100 00001110
```

Weighing in at 21 bytes, this yields a stacked 48% reduction in space, or an 87% reduction from our original naive encoding.

### Takeaway

Thinking about the shape of data in practice can often reveal insights that can be exploited.
