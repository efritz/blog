const minFromTop = 10;
const bufferFromNav = 170;
const bufferFromHero = 20;
const tocHeaderSelectors = 'h2, h3, h4, h5, h6';

$(document).ready(function() {
    $('#toc').toc({
        content: '.articles, .resume',
        headings: tocHeaderSelectors,
    });

    window.addEventListener('scroll', () => {
        updateLink(selectVisibleHeader());
        updateTocPosition();
    });

    window.addEventListener('hashchange', () => {
        updateLink(fromHash());
    });

    updateLink(fromHash());
    updateTocPosition();
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

function updateTocPosition() {
    const toc = $('#toc');
    const heroContainer = $('.hero-container');
    const hasHero = heroContainer.length > 0;
    const scrollTop = $(window).scrollTop();
    const heroHeight = hasHero && heroContainer.offset().top + heroContainer.outerHeight();

    if (hasHero) {
        // With hero image: smoothly transition between positions
        if (scrollTop < heroHeight - minFromTop) {
            toc.css('top', `${heroHeight - scrollTop + bufferFromHero}px`);
        } else {
            toc.css('top', `${minFromTop}px`);
        }
    } else {
        // Without hero image: adjust based on scroll position
        if (scrollTop < bufferFromNav - minFromTop) {
            toc.css('top', `${bufferFromNav}px`);
        } else {
            toc.css('top', `${minFromTop}px`);
        }
    }
}
