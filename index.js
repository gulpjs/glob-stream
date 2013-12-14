var es = require('event-stream');
var Combine = require('combine-stream');
var glob = require('glob');
var minimatch = require('minimatch');
var path = require('path');

var isMatch = function(file, pattern) {
  if (typeof pattern === 'string') return minimatch(file.path, pattern);
  if (pattern instanceof RegExp) return pattern.test(file.path);
  return true; // unknown glob type?
};

var isNegative = function(pattern) {
  if (typeof pattern !== 'string') return true;
  if (pattern[0] === '!') return true;
  return false;
};

var isPositive = function(pattern) {
  return !isNegative(pattern);
};

var flatten2d = function(arr){
  return arr.map(function(s, idx) {
    if (typeof s === 'string' && idx !== arr.length-1) {
      return s;
    } else {
      return '';
    }
  });
};

var comparator = function(a,b) {
  return a.path == b.path;
};

var unrelative = function(cwd, glob) {
  var mod = '';
  if (glob[0] === '!') {
    mod = glob[0];
    glob = glob.slice(1);
  }
  return mod+path.resolve(cwd, glob);
};

// pause all streams
// then resume them one by one
// until they are all done
var streamSeries = function(streams) {
  var currentStream = -1;
  streams.forEach(function(stream){
    stream.pause();
  });
  var next = function(){
    var stream = streams[++currentStream];
    if (!stream) return; // done
    stream.once('end', next);
    stream.resume();
  };
  next();
};

module.exports = us = {
  // creates a stream for a single glob or filter
  createStream: function(ourGlob, negatives, opt) {
    if (!negatives) negatives = [];
    if (!opt) opt = {};
    if (typeof opt.cwd !== 'string') opt.cwd = process.cwd();
    if (typeof opt.silent !== 'boolean') opt.silent = true;
    if (typeof opt.nonull !== 'boolean') opt.nonull = false;

    // remove path relativity to make globs make sense
    ourGlob = unrelative(opt.cwd, ourGlob);
    negatives = negatives.map(unrelative.bind(null, opt.cwd));

    // create globbing stuff
    var globber = new glob.Glob(ourGlob, opt);

    // extract base path because we are too lazy lol
    var rules = globber.minimatch.set[0];
    var basePath = path.normalize(flatten2d(rules).join(path.sep));

    // create stream and map events from globber to it
    var stream = es.pause();
    globber.on('error', stream.emit.bind(stream, 'error'));
    globber.on('end', function(){
      stream.end();
    });
    globber.on('match', function(filename) {
      stream.write({
        cwd: opt.cwd,
        base: basePath,
        path: path.resolve(opt.cwd, filename)
      });
    });

    if (negatives.length === 0) return stream; // no filtering needed

    // stream to check against negatives
    var filterStream = es.map(function(filename, cb) {
      var matcha = isMatch.bind(null, filename);
      if (negatives.every(matcha)) return cb(null, filename); // pass
      cb(); // ignore
    });

    return stream.pipe(filterStream);
  },

  // creates a stream for multiple globs or filters
  create: function(globs, opt) {
    if (!opt) opt = {};

    // only one glob no need to aggregate
    if (!Array.isArray(globs)) return us.createStream(globs, null, opt);

    var positives = globs.filter(isPositive);
    var negatives = globs.filter(isNegative);

    if (positives.length === 0) throw new Error("Missing positive glob");

    // only one positive glob no need to aggregate
    if (positives.length === 1) return us.createStream(positives[0], negatives, opt);

    // create all individual streams
    var streams = positives.map(function(glob){
      return us.createStream(glob, negatives, opt);
    });

    // then just pipe them to a single stream and return it
    var aggregateOpt = {
      recordDuplicates: true,
      comparator: comparator,
      streams: streams
    };
    var aggregate = new Combine(aggregateOpt);

    // set up streaming queue so items come in order
    //streamSeries(streams);

    return aggregate;
  }
};
