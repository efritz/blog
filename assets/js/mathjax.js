MathJax.Hub.Config({
  tex2jax: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    processEscapes: true,
  },
  jax: ['input/TeX', 'output/SVG'],
  extensions: ['tex2jax.js'],
  SVG: {
    fontCache: 'global'
  }
});

MathJax.Hub.setRenderer('SVG');
