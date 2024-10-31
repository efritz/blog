const headerHeight = 78;
const heroBuffer = 20;
const tocHeaderSelectors = 'h2, h3, h4, h5, h6';

$(document).ready(function() {
    const toc = $('#toc');
    const heroContainer = $('.hero-container');

    toc.toc({
        content: '.articles, .resume',
        headings: tocHeaderSelectors,
    });

    // Always use fixed positioning
    toc.css('position', 'fixed');

    window.addEventListener('scroll', () => {
        updateLink(selectVisibleHeader());

        const hasHero = heroContainer.length > 0;
        const scrollTop = $(window).scrollTop();
        const heroHeight = hasHero && heroContainer.offset().top + heroContainer.outerHeight();

        if (hasHero) {
            // With hero image: smoothly transition between positions
            if (scrollTop + headerHeight < heroHeight) {
                const newTop = heroHeight - scrollTop + heroBuffer;
                toc.css('top', `${newTop}px`);
            } else {
                toc.css('top', `${headerHeight}px`);
            }
        } else {
            // Without hero image: adjust based on scroll position
            if (scrollTop < 92) { // 170 - 78 = 92 (difference between desired initial position and header height)
                toc.css('top', '170px');
            } else {
                toc.css('top', `${headerHeight}px`);
            }
        }
    });

    // Set initial position
    if (heroContainer.length) {
        const initialTop = heroContainer.offset().top + heroContainer.outerHeight() + heroBuffer;
        toc.css('top', `${initialTop}px`);
    } else {
        toc.css('top', '170px');
    }

    // Highlight link on header copy button press
    window.addEventListener('hashchange', () => updateLink(fromHash()));

    // Set initial state
    updateLink(fromHash());
});

function selectVisibleHeader() {
    const headers = $(tocHeaderSelectors).toArray();
    const viewportHeight = $(window).innerHeight();
    const scrollTop = $(window).scrollTop();

    let currentHeader = headers[0];
    for (const header of headers) {
        if (header.getBoundingClientRect().top + scrollTop < scrollTop + (viewportHeight / 3)) {
            currentHeader = header;
        }
    }

    return currentHeader.id;
}

function fromHash() {
    return decodeURI(window.location.hash.slice(1));
}

function updateLink(id) {
    if (id === '') {
        id = $('h2').toArray()[0].id;
    }

    $('#toc a').removeClass('current');
    $(`#toc a[href="#${id}"]`).addClass('current');
}
