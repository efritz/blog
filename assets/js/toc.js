
$(document).ready(function() {
    // Add 'top' id to the article title
    $('.articles h2:first').attr('id', 'top');

    $('#toc').toc({
        content: '.articles',  // Changed to include the title
        headings: 'h2, h3, h4, h5'
    });
});

window.addEventListener('scroll', function() {
    $('.article-content h2, .article-content h3, .article-content h4, .article-content h5').each(function(_, header) {
        const headerTop = header.getBoundingClientRect().top;

        if (0 <= headerTop && headerTop <= window.innerHeight / 2) {
            $('#toc a').each(function(_, tocLink) {
                if (tocLink.href.endsWith('#' + header.id)) {
                    $(tocLink).addClass('current');
                } else {
                    $(tocLink).removeClass('current');
                }
            });
        }
    });
});
