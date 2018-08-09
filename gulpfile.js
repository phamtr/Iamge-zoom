'use strict';

var gulp     = require('gulp'),
    reporter = require('jshint-stylish'),
    plugins
;

plugins = require('gulp-load-plugins')({lazy:false});


gulp.errorLogger = function(error) {
    plugins.util.log(plugins.util.colors.red(error.message));
    this.emit('end');
};


gulp.task('styles', [], function() {
    return gulp.src('./src/styles/ngimagezoom.scss')
        .pipe(plugins.plumber(gulp.errorLogger)) // display errors in console, but don't break the watch cycle
        //.pipe(plugins.sourcemaps.init())
        .pipe(plugins.sass({errLogToConsole: true}))
        //.pipe(plugins.sourcemaps.write())

        .pipe(gulp.dest('dist/'))
        .pipe(plugins.livereload())
        .pipe(plugins.minifyCss())
        .pipe(plugins.rename({suffix: '.min'}))
        .pipe(gulp.dest('dist/'));
});


gulp.task('templates', function() {
    return gulp.src(['./src/templates/**/*.html'])
        .pipe(plugins.angularTemplatecache({
            module: 'imageZoom',
            standalone:false,
            templateHeader: 'angular.module(\'<%= module %>\'<%= standalone %>).run([\'$templateCache\', function($templateCache) {\n',
            templateBody: '    $templateCache.put(\'<%= url %>\',\'<%= contents %>\');\n',
            templateFooter: '}]);\n'
        }))
        .pipe(gulp.dest('./.tmp/'));
});


gulp.task('jshinting', function() {
    return gulp.src(['./src/scripts/*.js'])
        .pipe(plugins.plumber(gulp.errorLogger))
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter(reporter))
        .pipe(plugins.jscs());
});


gulp.task('scripts', ['templates', 'jshinting'], function(callback) {
    return gulp.src(['./src/scripts/module.js', './.tmp/templates.js', './src/scripts/**/*.js']) //,
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.concat('ngimagezoom.js'))
        .pipe(plugins.wrap(
            '/**\n' +
            ' * @license AngularImage Zoom\n' +
            ' * License: MIT\n' +
            ' */\n' +
            '(function(window, document, angular) {\n\'use strict\';\n<%= contents %>\n})(window, document, window.angular);'))
        .pipe(plugins.sourcemaps.write())
        .pipe(gulp.dest('dist/'))
        .pipe(plugins.livereload())
        .pipe(plugins.uglify({
            sourceMap: false,
            compress: {
                drop_console: true
            },
            preserveComments: 'license',
            mangle: true,
            beautify: false
        }))
        .pipe(plugins.rename({suffix: '.min'}))
        .pipe(gulp.dest('dist/'));
});


gulp.task('build', ['styles', 'scripts'], function(callback) {
    callback();
});


gulp.task('watch', ['build'], function () {
    plugins.livereload.listen( {start:true} );
    gulp.watch(['./src/scripts/**/*.js', './src/templates/*.html'], ['scripts']);
    gulp.watch(['./src/styles/*.scss'], ['styles']);
    gulp.watch(['./demo/index.html', './demo/scripts/demo.js']).on('change', function(file) {
        plugins.livereload.reload('/');
    });
});


gulp.task('default', ['build']);
