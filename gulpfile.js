const { src, dest, series, parallel } = require('gulp');

const postcss = require('gulp-postcss');
const cssnano = require('cssnano');
const autoprefixer = require('autoprefixer');
const concat = require('gulp-concat');
const sourcemaps = require('gulp-sourcemaps');
const minifyInline = require('gulp-minify-inline');

// HTML tasks
function htmlTask() {
    return src('src/*.html')
        .pipe(dest('dist'));
}

// scripts tasks 
function scriptsTask() {
    return src('src/scripts/*.js')
        .pipe(sourcemaps.init())
        .pipe(minifyInline())
        .pipe(sourcemaps.write())
        .pipe(dest('dist/scripts'));
}

// styles tasks 
function stylesTask() {
    return src('src/styles/*.css')
        .pipe(sourcemaps.init())
        .pipe(postcss([autoprefixer(), cssnano()]))
        .pipe(sourcemaps.write())
        .pipe(dest('dist/styles'));
}

// to make tasks available in gulp command 
exports.html = htmlTask;
exports.scripts = scriptsTask;
exports.styles = stylesTask;

exports.default = series(parallel(htmlTask, stylesTask, scriptsTask));