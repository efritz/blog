+++
title = "Papers"
index = true
+++

## Papers

{{< content
    title="Waddle - Always-Canonical Intermediate Representation"
    meta="2018"
    sub="Eric Fritz; Doctoral Dissertation"
    anchor="dissertation"
    >}}

{{% div class="attachments" %}}
* [Author's Version](/assets/papers/Fritz%20-%20Dissertation.pdf)
* [Defense Slides](/assets/papers/Fritz%20-%20PhD%20Defense.pdf)
* [Proposal Slides](/assets/papers/Fritz%20-%20PhD%20Proposal.pdf)
{{% /div %}}

Program transformations that are able to rely on the presence of canonical properties of the program undergoing optimization can be written to be more robust and efficient than an equivalent but generalized transformation that also handles non-canonical programs. If a canonical property is required but broken earlier in an earlier transformation, it must be rebuilt (often from scratch). This additional work can be a dominating factor in compilation time when many transformations are applied over large programs. This dissertation introduces a methodology for constructing program transformations so that the program remains in an always-canonical form as the program is mutated, making only local changes to restore broken properties.
{{< /content >}}

{{< content
    title="Maintaining Canonical Form After Edge Deletion"
    meta="2018"
    sub="Eric Fritz; In [ICOOOLPS, 2018](https://conf.researchr.org/track/ecoop-issta-2018/ICOOOLPS-2018-papers)"
    anchor="icooolps"
    >}}

{{% div class="attachments" %}}
* [Author's Version](/assets/papers/Fritz%20-%20Maintaining%20Canonical%20Form%20After%20Edge%20Deletion.pdf)
* [Workshop Slides](/assets/papers/Fritz%20-%20ICOOOLPS2018.pdf)
{{% /div %}}

Waddle is a research intermediate-form optimizer that strictly maintains a canonical form similar to the loop-simplify form used in LLVM. The properties of this canonical form simplify movement of instructions to the edges of loops and often localize the effect on variables to the loop in which they are defined. The guarantee of canonical form preservation allows program transformations to rely on the presence of certain program properties without a necessary sanity-check or recalculation pre-step and does not impose an order of transformations in which reconstruction passes must be inserted.

In this paper, we present a form-preserving edge deletion operation, in which a provably unreachable branch between two basic blocks is removed from the control flow graph. Additionally, we show a distinct application of the block ejection operation, a core procedure used for loop body reconstruction, as utilized in a function inlining transformation.
{{< /content >}}

{{< content
    title="Charon: The Design of a Limiting Microservice"
    meta="2007"
    sub="Eric Fritz, Andy Brezinsky, and Andy Ortlieb; Whitepaper"
    anchor="charon"
    >}}

{{% div class="attachments" %}}
* [Author's Version](/assets/papers/Fritz%20-%20Charon%20-%20The%20Design%20of%20a%20Limiting%20Microservice.pdf)
{{% /div %}}

Charon is a service designed to increase the stability of a distributed system by preventing the overcommitment of limited resources during extreme load. The service monitors the access history of resources and is used as a central authority which either grants or denies requests for resource acquisition and use. This paper describes the architecture and feature set of Charon, as well as the rationale behind design decisions.
{{< /content >}}

{{< content
    title="Typing and Semantics of Asynchronous Arrows in JavaScript"
    meta="2017"
    sub="Eric Fritz and [Tian Zhao](http://uwm.edu/engineering/people/zhao-ph-d-tian/); In [Science of Computer Programming](https://www.sciencedirect.com/science/article/pii/S0167642317300527)"
    >}}

{{% div class="attachments" %}}
* [Author's Version](/assets/papers/Fritz%20-%20Typing%20and%20Semantics%20of%20Asynchronous%20Arrows%20in%20JavaScript.pdf)
{{% /div %}}

Asynchronous programs in JavaScript using callbacks and promises are difficult to write correctly. Many programs have subtle errors due to the unwanted interaction of event handlers. To fix such errors, the programmer is burdened with explicit registration and de-registration of event handlers. This produces fragile code which is difficult to read and maintain. Arrows, a generalization of monads, are an elegant solution to asynchronous program composition. In this paper, we present the semantics of an Arrow-based DSL in JavaScript which can encode asynchronous programs as a state machines where edge transitions are triggered by external events. To ensure that arrows are composed correctly, we provide an optional type-checker that reports errors before the machine begins execution.
{{< /content >}}

{{< content
    title="Arrows in Commercial Web Applications"
    meta="2016"
    sub="Eric Fritz, Jose Antony, and [Tian Zhao](http://uwm.edu/engineering/people/zhao-ph-d-tian/); In [HotWeb, 2016](http://conferences.computer.org/hotweb2016/)"
    >}}

{{% div class="attachments" %}}
* [Author's Version](/assets/papers/Fritz%20-%20Arrows%20in%20Commercial%20Web%20Applications.pdf)
* [Workshop Slides](/assets/papers/Fritz%20-%20HotWeb2016.pdf)
{{% /div %}}

Developing scalable and robust Web applications is difficult. One obstacle is JavaScript's event model, which makes asynchronous programs hard to maintain and extend. In this paper, we present the case study of a JavaScript library based on Arrows for asynchronous computation. Our library enables modular and more understandable programs and supports static type inference and visualization of control flow.
{{< /content >}}

{{< content
    title="Type Inference of Asynchronous Arrows in JavaScript"
    meta="2015"
    sub="Eric Fritz and [Tian Zhao](http://uwm.edu/engineering/people/zhao-ph-d-tian/); In [REBLS, 2015](http://2015.splashcon.org/track/rebls2015)"
    >}}

{{% div class="attachments" %}}
* [Author's Version](/assets/papers/Fritz%20-%20Type%20Inference%20of%20Asynchronous%20Arrows%20in%20JavaScript.pdf)
* [Workshop Slides](/assets/papers/Fritz%20-%20REBLS2015.pdf)
{{% /div %}}

Asynchronous programming with callbacks in JavaScript leads to code that is difficult to understand and maintain. Arrows, a generalization of monads, are an elegant solution to asynchronous program composition. Unfortunately, improper arrow composition can cause mysterious failures with subtle sources. We present an arrows-based DSL in JavaScript which encodes semantics similar to ES6 Promises and an optional type-checker that reports errors at arrow composition time.
{{< /content >}}
