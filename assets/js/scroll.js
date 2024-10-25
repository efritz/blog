window.addEventListener('scroll', function() {
    var winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    var scrolled = (winScroll / height) * 100;
    document.getElementById('read-progress-bar').style.width = scrolled + '%';
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
