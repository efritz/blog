$(document).ready(function() {
    $('#toc').toc({
        content: '.articles, .resume',
        headings: 'h2, h3, h4, h5, h6'
    });

    window.addEventListener('scroll', () => updateLink(selectVisibleHeader()));
    window.addEventListener('hashchange', () => updateLink(fromHash()));
    updateLink(fromHash());
});

function selectVisibleHeader() {
    const headers = $('h2, h3, h4, h5, h6').toArray();
    const viewportHeight = window.innerHeight;
    const scrollTop = window.scrollY;
    
    let currentHeader = headers[0];
    for (const header of headers) {
        const rect = header.getBoundingClientRect();
        const headerTop = rect.top + scrollTop;
        
        if (headerTop < scrollTop + (viewportHeight / 3)) {
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

    console.log({id});
    $('#toc a').removeClass('current');
    $(`#toc a[href="#${id}"]`).addClass('current');
}
