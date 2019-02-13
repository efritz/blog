import gulp from 'gulp'
import babel from 'gulp-babel'
import cleancss from 'gulp-clean-css'
import htmlmin from 'gulp-htmlmin'
import uglify from 'gulp-uglify'

gulp.task('minify-html', () => {
  return gulp.src('public/**/*.html')
    .pipe(htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true,
      removeComments: true,
      useShortDoctype: true,
    }))
    .pipe(gulp.dest('./public'));
});

gulp.task('minify-js', () => {
  return gulp.src('public/**/*.js', {base: './'})
    .pipe(babel({
      presets: ['@babel/env']
    }))
    .pipe(uglify())
    .pipe(gulp.dest('./'));
});

gulp.task('minify-css', () => {
  return gulp.src('public/**/*.css', {base: './'})
    .pipe(cleancss({level: 2, debug: true}))
    .pipe(gulp.dest('./'));
});

gulp.task('minify', gulp.parallel(
  'minify-html',
  'minify-js',
  'minify-css',
));
