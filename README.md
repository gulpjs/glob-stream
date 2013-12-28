[![Build Status](https://travis-ci.org/wearefractal/glob-stream.png?branch=master)](https://travis-ci.org/wearefractal/glob-stream)

## Information

<table>
<tr> 
<td>Package</td><td>glob-stream</td>
</tr>
<tr>
<td>Description</td>
<td>File system globs as a stream</td>
</tr>
<tr>
<td>Node Version</td>
<td>>= 0.9</td>
</tr>
</table>

This is a simple wrapper around node-glob to make it streamy.

## Usage

```javascript
var gs = require('glob-stream');

var stream = gs.create("./files/**/*.coffee", {options});

stream.on('data', function(file){
  // file has path, base, and cwd attrs
});
```

You can pass any combination of globs. One caveat is that you can not only pass a glob negation, you must give it at least one positive glob so it knows where to start. All given must match for the file to be returned.

### Options

- fullBase
  - Default is `false`
  - When true it will make file.base relative to the cwd instead of the lowest glob expression

This argument is passed directly to [node-glob](https://github.com/isaacs/node-glob)

#### Glob

```javascript
var stream = gs.create(["./**/*.js", "!./node_modules/**/*.*"]);
```

## LICENSE

(MIT License)

Copyright (c) 2013 Fractal <contact@wearefractal.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/wearefractal/glob-stream/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

