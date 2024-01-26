// Unload the lightbox when the user hits escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        let openModal = document.querySelector('.lightbox:target');
        if (openModal) {
            window.location.href = '#_';
        }
    }
});

// Scale SVGs in the lightbox to fit the screen
document.querySelectorAll('.lightbox img').forEach(function(img) {
    if (img.src.endsWith('.svg')) {
        if (img.height < img.width) {
            img.style.width = '80%';
            img.style.height = 'auto';
        } else {
            img.style.height = '80%';
            img.style.width = 'auto';
        }
    }
});
