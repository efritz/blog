+++
title = "Home office setup"
slug = "home-office-setup"
date = "2023-12-29T00:00:00-00:00"
tags = []
showpagemeta = true
+++

I recently ended a four (plus) year stint at a geographically distributed, all-remote, async-first startup, and began a similar remote role at another slightly earlier stage SF-based startup. I took the two weeks between jobs to tidy up my home office to clean my mental slate. It's like clean your dorm between terms: _new semester, new me_.

I snapped a few pictures to immortalize the absence of dust and clutter on my desk and was reminded of an old [Sourcegraph blog post](https://about.sourcegraph.com/blog/home-offices-of-sourcegraph#eric-fritz-software-engineer) from 2020 where the entire company (which was very small at the time) shared their home office setup. I felt it was time to post a personal update.

### Room setup

{{< lightbox src="/images/office/current.png" anchor="current" >}}

The desk is a [Renew Sit-to-Stand Table](https://www.hermanmiller.com/products/tables/sit-to-stand-tables/renew-sit-to-stand-tables/) from Herman Miller, shown at a level comfortable to be used with the [ErgoChair Pro](https://www.autonomous.ai/office-chairs/ergonomic-chair?option20=50&option_code=ErgonomicChair-ErgoChairPro_ChairColor.Evergreen) from Autonomous (with Evergreen fabric). I've previously had Herman Miller Aerons (stool _and_ chair form factors over the years), but have come to prefer the Autonomous chairs as the cushioned front allows me to sit cross-legged on occasion. Aeron chairs have a hard plastic lip that made sitting in that position uncomfortable.

Also pictured on the bookshelf is the requisite [Art of Computer Programming Box Set](https://www.amazon.com/dp/0137935102) (Note: I _have actually read_ Volume 4 to implement efficient arbitrary precision integer arithmetic for a passion compiler project a few years ago, thank you very much). There's also a completely unnecessary figurine of [Dat Boi](https://www.amazon.com/dp/B09KHH3XTW), which my wife has demanded I move from the living room mantel.

{{< lightbox src="/images/office/detail.png" anchor="detail" >}}

I'll describe the laptops, monitor, keyboard and mouse inputs, and camera in more detail below because, in a similar spirit to to how most programmers feel about their tools, _I've got a lot of opinions about them_.

As for the rest of what's pictured, I've got a [Streaky Black Desk Pad](https://www.konah-home.com/products/personality-black-mouse-pad-super-print-good-quality-washable-mousepad-game-players-like-to-play-the-game-pad-gifts?_pos=1&_sid=c8e647f27&_ss=r) from Konah Home to designate the "active workspace area" (the same way one uses an area rug in a large room) and to keep mouse movements comfortable. I use a [CyberPower UPS](https://www.amazon.com/dp/B00429N19W) as a surge protector as well as a battery backup that can keep my peripherals powered for a short period of time during (infrequent) power outages. A [vertical laptop stand holder](https://www.amazon.com/gp/product/B07FFK8LTD) holds two laptops (used in clamshell mode) and takes up very little desk real estate. 

I use a pair of wired [Bose QuietComfort 35](https://www.amazon.com/dp/B01E3SNO1G) with a perpetually drained battery during work and hang them off a [headphone holder](https://www.amazon.com/gp/product/B07BVK2FQW) mounted on my desk when not in use. I also have a pair of open-ear and non-noise-cancelling [Sennheiser HD 650](https://www.amazon.com/dp/B00018MSNI) when I play piano (not pictured, but to the left of the desk).

I keep things fairly tidy by buying cables that are waaaay too long, routing them down monitor arms, wrapping them in [cable sleeves](https://www.amazon.com/gp/product/B08NJL5LYC) and other assortments of velcro straps (but **not** zip ties, which are a pain when you need to ultimately add or remove a cable from your run), then stuffing the remaining extra cable slack into a [cable management box](https://www.amazon.com/gp/product/B08B46GBSY).

Lastly, a [Baseus Desk Fan](https://www.amazon.com/gp/product/B09WMNWHQV) mounted on the top of my monitor and pointed directly at my face has made the summers a bit more comfortable as my office runs slightly hotter than the rest of the house.

### Machines

I'm currently in possession of two 16-inch MacBook Pros:

- An M1 Max 64 GB from 2021 that I've purchased from Sourcegraph as a personal machine; and
- An M2 Max 32 GB from 2023 more recently supplied by Render.

Both machines are setup almost identically via shared [dotfiles](https://github.com/efritz/dotfiles), although the Render machine has a few additional utilities such as Tailscale that allows connection to certain sensitive services. I was originally hoping Render would supply a 64GB or 96GB machine, but I haven't actually felt any issue with 32GB in the past three months. The control plane software we're building runs in a personal development cluster on GCP/AWS, so there's no massive local application pressure.

Mounted below the desk is a Windows machine with an [AMD Ryzen 5 3600 6-Core](https://www.amazon.com/gp/product/B07STGGQ18) in a [NZXT H200i](https://www.amazon.com/gp/product/B0776QQD4T) (Mini-ITX) used exclusively for Steam. This is likely an outdated build at this point, but it works well enough for leisure.

### Display

My display preferences have evolved over time, adapting to the type of machine (mostly determined by the operating system).

{{< lightbox src="/images/office/university.png" anchor="university" half="true" >}}
{{< lightbox src="/images/office/sourcegraph.png" anchor="sourcegraph" half="true" >}}

My home setup during university (left) was a windows machine attached to a [Dell UltraSharp 30" Monitor](https://www.amazon.com/dp/B004KKGF1O) and two 21" monitors in portrait mode on either side. This gave me my first rudimentary "zoned" workflow:

1. The left monitor was used for chat applications and music streaming;
1. The center monitor was the main "focus area", usually containing an IDE; and
1. The right monitor was reserved for a full-screen browser, which was visible as a reference without using any screen real estate of the main focus area.

The following iteration of my home setup (right), which later became my work-from-home setup for the first half of my tenure at Sourcegraph, was a 27" iMac (a 4.0GHz quad-core Intel i7; 16GB RAM) and two [Dell Ultrasharp 27" 4K monitors](https://www.amazon.com/gp/product/B073VYVX5S) in portrait mode on either side. Because the portrait monitors had much more available vertical space, zone preferences were also adapted. In the picture, you can see a smaller Spotify window on top of a browser window only taking the lower two thirds of the screen. Having some previous experience with the [i3](https://i3wm.org/) tiling window manager on Linux, I began to use [Divvy](https://mizage.com/divvy/) for comparable tiling functionality on MacOS.

At some point, I upgraded the machine to a similarly sized iMac Pro (3.2GHz 8-core Intel Xenon W; 32GB RAM) which was **sick as hell**. When I joined Sourcegraph I declined a company-supplied machine so I could continue to use my home setup. Unfortunately for me, Sourcegraph security concerns evolved to the point where remote device management became a necessity for all employees.

The change from a 27" to a 16" display for the main focus area demanded a new choice in peripherals. At the recommendation of a co-worker, I chose a [Samsung 49" Odyssety G9](https://www.amazon.com/gp/product/B088HH6LW5) mounted on a [Ergotron Heavy Duty Monitor Arm](https://www.amazon.com/gp/product/B0959D7XDM) to maximize usable desk space. The change from a **gorgeous** 5K retina display to a monitor where individual pixels were visible again was an initial shock, but didn't spark any long-lasting regrets.

Having a _single_ monitor with such massive width made me appreciate adopting Divvy, as it's no longer feasible to maximize a window within the bounds of _one of several_ monitors. So, once again, my zone preferences adapted to the available hardware.

{{< lightbox src="/images/office/zone-1.png" anchor="zone-1" half="true" >}}
{{< lightbox src="/images/office/zone-2.png" anchor="zone-2" half="true" >}}

The applications I frequently run fall into one of two overlapping zone sets:

- The _main_ zone (left) is used for deep work and includes, from left-to-right, a browser, an IDE, and a terminal; and
- The _secondary_ zone (right) is used mainly for communication and includes, from left-to-right, Slack (or Spotify), and social applications (Signal, Discord, WhatsApp, and Messages).

### Keyboard

I used to have a pair of [CODE mechanical keyboard](https://codekeyboards.com/) (one for work, one for home) before transition to a [Ergodox EZ](https://ergodox-ez.com/) with Cherry MX Blue switches. The transition to an ortholinear keyboard (which uses a uniform grid instead of an offset one) was a bit rough. My typing speed (which was recently recorded at a peak of 168 WPM) dropped for a two-week span until I re-learned precisely where all the key centers were in the new layout. For some reason I was unable to hit the "y" key with any accuracy at first.

The Ergodox layout is completely customizable, and took quite a bit of iteration to get to something stable that I was effective and comfortable with. Although I didn't do anything crazy like adopt a non-QWERTY layout, I did highly customize modifier keys and code navigation hotkeys. My current layout looks like the following, over three layers:

<div style="padding-top: 85%; position: relative">
	<iframe src="https://configure.zsa.io/embed/ergodox-ez/layouts/MzDbr/latest/0" style="border: 0; height: 100%; left: 0; position: absolute; top: 0; width: 100%"></iframe>
</div>

### Mouse

Although the keyboard is the input device more closely tied to my personality and self-worth (like most developers that don't have enough non-coding hobbies), I have also been recently and pleasantly surprised by the feel of the [Logitech MX Master 3S](https://www.amazon.com/gp/product/B09HMKFDXC). Maybe one day I'll switch from VSCode to Neovim and abandon the mouse entirely; or maybe I'll try out a [vertical mouse](https://www.amazon.com/dp/B09J1TB35S) at the suggestion of a co-worker just to see how it feels.

### Camera

When I traded in my iMac for a laptop in clamshell mode, I lost a built-in webcam. Instead of opting for a USB webcam mounted atop my monitor, I decided to use the majority of my untapped desk budget at Sourcegraph to help purchase a mirrorless camera. Having experience with [specific Canon products](https://www.amazon.com/dp/B000H7GSG6) in film school, I decided to honor a brand that worked well for me. I initially chose a [Canon EOS R](https://www.amazon.com/gp/product/B088MMTS9P) as the base product, and decided to build from there.

{{< lightbox src="/images/office/camera.png" anchor="camera" >}}

To gather an list of the accessories I'd need to set up this Rube Goldberg machine successfully, I initially followed [Quinn Slack's guide](https://slack.org/high-resolution-video-calls) on how he achieved similar high-resolution video calls. Here's what I ended up needing:

- A [Rode VideoMicro](https://www.amazon.com/gp/product/B015R0IQGW) for audio;
- A [battery AC power adapter kit](https://www.amazon.com/gp/product/B089KMWW9L) maintain continuous power for the camera;
- An [Elgato Cam Link 4K](https://www.amazon.com/gp/product/B07K3FN5MR) to convert the external camera signal into a webcam-compatible signal; and
- An [overhead tripod](https://www.amazon.com/gp/product/B08ZCW4N6V) and a [tilt tripod head](https://www.amazon.com/gp/product/B07RJW34WB) to mount the camera at a heigh independent of the monitor and desk and to adjust the camera frame so you see a bit more than the top third of my face, respectively.

Maybe in the future I'll get a stronger [zoom lens](https://www.bhphotovideo.com/c/product/1691842-REG/canon_rf_1200mm_f_8_l.html/?ap=y&ap=y&smp=y&smp=y&smpm=ba_f2_lar&lsft=BI%3A514&gad_source=1&gclid=CjwKCAiAnL-sBhBnEiwAJRGigjL5fywefuwoKqetcRGVvKTAXjGEcWOgCDtP8CYnzR_Bpmg4bGQA7RoCo40QAvD_BwE), as the current one is a bit limited:

{{< lightbox src="/images/office/face.png" anchor="face" >}}
