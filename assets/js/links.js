const linkableHeaderSelector = '.articles h3:not(.list-item), .articles h4:not(.list-item), .articles h5:not(.list-item)';

const linkIcon = '<svg class="icon icon-link" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

$(document).ready(function() {
    for (const header of document.querySelectorAll(linkableHeaderSelector)) {
        $('<span />', { class: 'header-link', html: linkIcon }).appendTo($(header)).on('click', function() {
            const target = window.location.origin + window.location.pathname + '#' + header.id;
            window.location = target;
            navigator.clipboard.writeText(target);
        });
    }
});
