var es = require('event-stream');
var glob = require('glob');
var minimatch = require('minimatch');
var path = require('path');

var isMatch = function(file, pattern) {
  if (typeof pattern === 'string') return minimatch(file.path, pattern);
  if (typeof pattern === 'function') return fn(file.path);
  if (pattern instanceof RegExp) return pattern.test(file.path);
  return true; // unknown glob type?
};

var matchAll = "**/*.*";

module.exports = {
  create: function(globs, opt) {
    if (!Array.isArray(globs)) globs = [globs];

    if (!opt) opt = {};
    if (typeof opt.silent !== 'boolean') opt.silent = true;
    if (typeof opt.nonull !== 'boolean') opt.nonull = false;

    
    var stream = es.pause();
    var globber = new glob.Glob(matchAll, opt);

    // extract base path because we are too lazy lol
    var rules = globber.minimatch.set[0];
    var basePath = path.normalize(rules.map(function(s, idx) {
      if (typeof s === 'string' && idx !== rules.length-1) {
        return s;
      } else {
        return '';
      }
    }).join(path.sep));

    globber.on('error', stream.emit.bind(stream, 'error'));
    globber.on('end', function(){
      stream.end();
    });
    globber.on('match', function(filename) {
      stream.write({
        base: basePath,
        path: filename
      });
    });

    var filterStream = es.map(function(filename, cb) {
      var matcha = isMatch.bind(null, filename);
      if (globs.every(matcha)) return cb(null, filename); // pass
      cb(); // ignore
    });

    return stream.pipe(filterStream);
  }
};
