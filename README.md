<p align="center">
  <a href="http://gulpjs.com">
    <img height="257" width="114" src="https://raw.githubusercontent.com/gulpjs/artwork/master/gulp-2x.png">
  </a>
</p>

# glob-stream

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coveralls Status][coveralls-image]][coveralls-url] [![Gitter chat][gitter-image]][gitter-url]

A wrapper around [node-glob][node-glob-url] to make it streamy.

## Usage

```javascript
var gs = require('glob-stream');

var stream = gs('./files/**/*.coffee', { /* options */ });

stream.on('data', function(file){
  // file has path, base, and cwd attrs
});
```

You can pass any combination of globs. One caveat is that you can not only pass a glob negation, you must give it at least one positive glob so it knows where to start. All given must match for the file to be returned.

## API

### globStream(globs, options)

Returns a stream for multiple globs or filters.

#### Options

- cwd
  - Default is `process.cwd()`
- base
  - Default is everything before a glob starts (see [glob-parent][glob-parent-url])
- cwdbase
  - Default is `false`
  - When true it is the same as saying opt.base = opt.cwd
- allowEmpty
  - Default is `false`
  - If true, won't emit an error when a glob pointing at a single file fails to match

This argument is passed directly to [node-glob][node-glob-url] so check there for more options

#### Glob

```js
var stream = gs(['./**/*.js', '!./node_modules/**/*']);
```

Globs are executed in order, so negations should follow positive globs. For example:

```js
gulp.src(['!b*.js', '*.js'])
```

would not exclude any files, but this would

```js
gulp.src(['*.js', '!b*.js'])
```

## Readable Stream

A ReadableStream interface is available by requiring `glob-stream/readable`.

__Note: This is an advanced feature and you probably don't want to use it.__

### `new ReadableGlobStream(singleGlob, negativesArray, options)`

A constructor for a ReadableStream against a single glob string. An array of globs can be provided as the second argument and will remove matches from the result. Options are passed as the last argument. No argument juggling is provided, so all arguments must be provided (use an empty array if you have no negatives).

#### Options

##### `options.allowEmpty`

Whether or not to error upon an empty singular glob.

Type: `Boolean`

Default: `false` (error upon no match)

##### `options.highWaterMark`

The highWaterMark of the ReadableStream. This is mostly exposed to test backpressure.

Type: `Number`

Default: `16`

##### `options.root`

The root path that the glob is resolved against.

Type: `String`

Default: `undefined` (use the filesystem root)

##### `options.cwd`

The current working directory that the glob is resolved against.

Type: `String`

Default: `process.cwd()`

##### `options.base`

The absolute segment of the glob path that isn't a glob. This value is attached to each glob object and is useful for relative pathing.

Type: `String`

Default: The absolute path segement before a glob starts (see [glob-parent][glob-parent-url])

##### other

Any glob-related options are documented in [node-glob][node-glob-url]. Those options are forwarded verbatim, with the exception of `root` and `ignore`. `root` is pre-resolved and `ignore` is overwritten by the `negativesArray` argument.

## License

MIT

[node-glob-url]: https://github.com/isaacs/node-glob
[glob-parent-url]: https://github.com/es128/glob-parent

[downloads-image]: http://img.shields.io/npm/dm/glob-stream.svg
[npm-url]: https://www.npmjs.com/package/glob-stream
[npm-image]: https://badge.fury.io/js/glob-stream.svg

[travis-url]: https://travis-ci.org/gulpjs/glob-stream
[travis-image]: https://travis-ci.org/gulpjs/glob-stream.svg?branch=master

[coveralls-url]: https://coveralls.io/r/gulpjs/glob-stream
[coveralls-image]: https://coveralls.io/repos/gulpjs/glob-stream/badge.svg

[gitter-url]: https://gitter.im/gulpjs/gulp
[gitter-image]: https://badges.gitter.im/gulpjs/gulp.png
