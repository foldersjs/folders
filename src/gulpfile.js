var gulp = require('gulp');
var exit = require('gulp-exit');

gulp.task('default', function() {
  // place code for your default task here
});

var jshint = require('gulp-jshint');

var core = ['*.js'];

// JS hint task
gulp.task('jshint', function() {
	gulp.src(core)
		.pipe(jshint())
		.pipe(jshint.reporter('default'));
});
var istanbul = require('gulp-istanbul');
// We'll use mocha here, but any test framework will work
var mocha = require('gulp-mocha');

gulp.task('test', function (cb) {
  gulp.src(core)
    .pipe(istanbul()) // Covering files
    .pipe(istanbul.hookRequire()) // Force `require` to return covered files
    .on('finish', function () {
      gulp.src(['test/*.js'])
        .pipe(mocha())
        .pipe(istanbul.writeReports()) // Creating the reports after tests runned
        .on('end', cb)
	  .pipe(exit());
    });
});

