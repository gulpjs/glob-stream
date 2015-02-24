/*jslint node: true */

'use strict';

var through2 = require('through2');
var Combine = require('ordered-read-streams');
var unique = require('unique-stream');
var clone = require('lodash.clone');

var glob = require('glob');
var glob2base = require('glob2base');
var path = require('path');

var gs = {
  // creates a stream for a single glob or filter
  createStream: function(ourGlob, negatives, opt) {
    if (negatives.length) {
      // Do not mutate the options object which may be used
      // in multiple `gs.createStream()` calls.
      opt = clone(opt);
      opt.ignore = (opt.ignore || []).concat(negatives);
    }

    // create globbing stuff
    var globber = new glob.Glob(ourGlob, opt);

    // extract base path from glob
    var basePath = opt.base || glob2base(globber);

    // create stream and map events from globber to it
    var stream = through2.obj();

    globber.on('error', stream.emit.bind(stream, 'error'));
    globber.on('end', function(/* some args here so can't use bind directly */){
      stream.end();
    });
    globber.on('match', function(filename) {
      stream.write({
        cwd: opt.cwd,
        base: basePath,
        path: path.resolve(opt.cwd, filename)
      });
    });

    return stream;
  },

  // creates a stream for multiple globs or filters
  create: function(globs, opt) {
    if (!opt) opt = {};
    if (typeof opt.cwd !== 'string') opt.cwd = process.cwd();
    if (typeof opt.dot !== 'boolean') opt.dot = false;
    if (typeof opt.silent !== 'boolean') opt.silent = true;
    if (typeof opt.nonull !== 'boolean') opt.nonull = false;
    if (typeof opt.cwdbase !== 'boolean') opt.cwdbase = false;
    if (opt.cwdbase) opt.base = opt.cwd;

    // only one glob no need to aggregate
    if (!Array.isArray(globs)) globs = [globs];

    var positives = [];
    var negatives = [];

    globs.forEach(function(glob, index) {
      if (typeof glob !== 'string') {
        throw new Error('Invalid glob at index ' + index);
      }

      var globArray = isNegative(glob) ? negatives : positives;

      // remove leading "!" from negative globs to pass them to glob's `ignore` option
      if (globArray === negatives) {
        glob = glob.slice(1);
      }

      // remove path relativity to make globs make sense
      glob = unrelative(opt.cwd, glob);

      globArray.push({
        index: index,
        glob: glob
      });
    });

    if (positives.length === 0) throw new Error('Missing positive glob');

    // only one positive glob no need to aggregate
    if (positives.length === 1) return streamFromPositive(positives[0]);

    // create all individual streams
    var streams = positives.map(streamFromPositive);

    // then just pipe them to a single unique stream and return it
    var aggregate = new Combine(streams);
    var uniqueStream = unique('path');

    return aggregate.pipe(uniqueStream);

    function streamFromPositive(positive) {
      var negativeGlobs = negatives.filter(indexGreaterThan(positive.index)).map(toGlob);
      return gs.createStream(positive.glob, negativeGlobs, opt);
    }
  }
};

function isNegative(pattern) {
  return pattern[0] === '!';
}

function unrelative(cwd, glob) {
  return path.resolve(cwd, glob);
}

function indexGreaterThan(index) {
  return function(obj) {
    return obj.index > index;
  };
}

function toGlob(obj) {
  return obj.glob;
}

module.exports = gs;
