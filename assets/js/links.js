const linkableHeaderSelector = '.articles h3:not(.list-item), .articles h4:not(.list-item), .articles h5:not(.list-item)';

$(document).ready(function() {
    for (const header of document.querySelectorAll(linkableHeaderSelector)) {
        $('<span />', { class: 'header-link fa fa-link' }).appendTo($(header)).on('click', function() {
            const target = window.location.origin + window.location.pathname + '#' + header.id;
            window.location = target;
            navigator.clipboard.writeText(target);
        });
    }
});
