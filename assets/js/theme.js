// The initial theme is applied by an inline script in the page head. This
// handles the toggle and follows the system preference until a choice is saved.
(function() {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

    function savedTheme() {
        try {
            return localStorage.getItem('theme');
        } catch (e) {
            return null;
        }
    }

    document.getElementById('theme-toggle').addEventListener('click', function() {
        const theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', theme);

        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            // Storage is unavailable; the choice lasts for this page only.
        }
    });

    systemDark.addEventListener('change', function(event) {
        if (!savedTheme()) {
            root.setAttribute('data-theme', event.matches ? 'dark' : 'light');
        }
    });
})();
