+++
date = "2016-10-02T22:55:05-04:00"
title = "Papers"
index = true
+++

## Papers

### 2018 (Expected)

{{< collapsing-header
    title="Waddle: Always-Canonical Intermediate Representation"
    detail="Available Soon / [Proposal Slides](/documents/Fritz - PhD Proposal.pdf)"
    anchor="thesis"
    >}}

{{% small %}}By Eric Fritz -- Doctoral Dissertation{{%/ small %}}

**Abstract**: Optimizations that are able to rely on the presence of *canonical properties* of the program under optimization can be written to be more robust and efficient than an equivalent but generalized optimization which also handles non-canonical programs. If a canonical property is required but broken earlier in an earlier optimization, it must be rebuilt –- often from scratch. This additional necessary work can be intractable when many optimizations are applied over large programs. This dissertation introduces a methodology for constructing optimizations so that the program remains in an *always-canonical* form as the program is mutated, making only local changes to restore broken properties.

### 2017

{{< collapsing-header
    title="Charon: The Design of a Limiting Microservice"
    detail="Available Soon"
    anchor="charon"
    >}}

{{% small %}}By Eric Fritz, Andy Brezinsky, and Andy Ortlieb{{%/ small %}}

**Abstract**: Charon is a service designed to increase the stability of a distributed system by preventing the overcommitment of limited resources during extreme load. The service monitors the access history of resources and is used as a central authority which either grants or denies requests for resource acquisition and use. This paper describes the architecture and feature set of Charon, as well as the rationale behind design decisions.

{{< collapsing-header
    title="Typing and Semantics of Asynchronous Arrows in JavaScript"
    detail="[Author's Version](/documents/Fritz - Typing and Semantics of Asynchronous Arrows in JavaScript.pdf)"
    >}}

{{% small %}}By Eric Fritz and [Tian Zhao](http://uwm.edu/engineering/people/zhao-ph-d-tian/) -- in Science of Computer Programming; Volume 141 Issue C {{%/ small %}}

**Abstract**: Asynchronous programs in JavaScript using callbacks and promises are difficult to write correctly. Many programs have subtle errors due to the unwanted interaction of event handlers. To fix such errors, the programmer is burdened with explicit registration and de-registration of event handlers. This produces fragile code which is difficult to read and maintain. Arrows, a generalization of monads, are an elegant solution to asynchronous program composition. In this paper, we present the semantics of an Arrow-based DSL in JavaScript which can encode asynchronous programs as a state machines where edge transitions are triggered by external events. To ensure that arrows are composed correctly, we provide an optional type-checker that reports errors before the machine begins execution.

### 2016

{{< collapsing-header
    title="Arrows in Commercial Web Applications"
    detail="[Author's Version](/documents/Fritz - Arrows in Commercial Web Applications.pdf) / [Workshop Slides](/documents/Fritz - HotWeb2016.pdf)"
    >}}

{{% small %}}By Eric Fritz, Jose Antony, and [Tian Zhao](http://uwm.edu/engineering/people/zhao-ph-d-tian/) -- presented at [HotWeb, 2016](http://conferences.computer.org/hotweb2016/){{%/ small %}}

**Abstract**: Developing scalable and robust Web applications is difficult. One obstacle is JavaScript's event model, which makes asynchronous programs hard to maintain and extend. In this paper, we present the case study of a JavaScript library based on Arrows for asynchronous computation. Our library enables modular and more understandable programs and supports static type inference and visualization of control flow.

### 2015

{{< collapsing-header
    title="Type Inference of Asynchronous Arrows in JavaScript"
    detail="[Author's Version](/documents/Fritz - Type Inference of Asynchronous Arrows in JavaScript.pdf) / [Workshop Slides](/documents/Fritz - REBLS2015.pdf)"
    >}}

{{% small %}}By Eric Fritz and [Tian Zhao](http://uwm.edu/engineering/people/zhao-ph-d-tian/) -- presented at [REBLS, 2015](http://2015.splashcon.org/track/rebls2015){{%/ small %}}

**Abstract**: Asynchronous programming with callbacks in JavaScript leads to code that is difficult to understand and maintain. Arrows, a generalization of monads, are an elegant solution to asynchronous program composition. Unfortunately, improper arrow composition can cause mysterious failures with subtle sources. We present an arrows-based DSL in JavaScript which encodes semantics similar to ES6 Promises and an optional type-checker that reports errors at arrow composition time.
