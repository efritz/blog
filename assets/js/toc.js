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

    window.addEventListener('scroll', () => {
        updateLink(selectVisibleHeader());

        const hasHero = heroContainer.length > 0;
        const scrollTop = $(window).scrollTop();
        const heroHeight = hasHero && heroContainer.offset().top + heroContainer.outerHeight();

        if (hasHero && (scrollTop + headerHeight < heroHeight)) {
            toc.css({ 'position': 'absolute', 'top': heroHeight + heroBuffer });
        } else {
            toc.css({ 'position': 'fixed', 'top': headerHeight });
        }
    });

    if (heroContainer.length) {
        // Set to 20px below hero image
        toc.css('top', heroContainer.offset().top + heroContainer.outerHeight() + heroBuffer);
    } else {
        // Set directly below header
        toc.css('top', headerHeight);
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
