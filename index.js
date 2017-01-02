'use strict';

var through2 = require('through2');
var Combine = require('ordered-read-streams');
var unique = require('unique-stream');

var glob = require('glob');
var pumpify = require('pumpify');
var isNegatedGlob = require('is-negated-glob');
var globParent = require('glob-parent');
var resolveGlob = require('to-absolute-glob');
var extend = require('extend');
var removeTrailingSeparator = require('remove-trailing-separator');

function globStream(globs, opt) {
  if (!opt) {
    opt = {};
  }

  var ourOpt = extend({}, opt);
  var ignore = ourOpt.ignore;

  ourOpt.cwd = typeof ourOpt.cwd === 'string' ? ourOpt.cwd : process.cwd();
  ourOpt.dot = typeof ourOpt.dot === 'boolean' ? ourOpt.dot : false;
  ourOpt.silent = typeof ourOpt.silent === 'boolean' ? ourOpt.silent : true;
  ourOpt.nonull = typeof ourOpt.nonull === 'boolean' ? ourOpt.nonull : false;
  ourOpt.cwdbase = typeof ourOpt.cwdbase === 'boolean' ? ourOpt.cwdbase : false;

  if (ourOpt.cwdbase) {
    ourOpt.base = ourOpt.cwd;
  }
  // Normalize string `ignore` to array
  if (typeof ignore === 'string') {
    ignore = [ignore];
  }
  // Ensure `ignore` is an array
  if (!Array.isArray(ignore)) {
    ignore = [];
  }

  // Only one glob no need to aggregate
  if (!Array.isArray(globs)) {
    globs = [globs];
  }

  var positives = [];
  var negatives = [];

  globs.forEach(function(globString, index) {
    if (typeof globString !== 'string') {
      throw new Error('Invalid glob at index ' + index);
    }

    var glob = isNegatedGlob(globString);
    var globArray = glob.negated ? negatives : positives;

    globArray.push({
      index: index,
      glob: glob.pattern,
    });
  });

  if (positives.length === 0) {
    throw new Error('Missing positive glob');
  }

  // Only one positive glob no need to aggregate
  if (positives.length === 1) {
    return streamFromPositive(positives[0]);
  }

  // Create all individual streams
  var streams = positives.map(streamFromPositive);

  // Then just pipe them to a single unique stream and return it
  var aggregate = new Combine(streams);
  var uniqueStream = unique('path');

  return pumpify.obj(aggregate, uniqueStream);

  function streamFromPositive(positive) {
    var negativeGlobs = negatives
      .filter(indexGreaterThan(positive.index))
      .map(toGlob)
      .concat(ignore);
    return createStream(positive.glob, negativeGlobs, ourOpt);
  }
}

function createStream(ourGlob, negatives, opt) {
  function resolveNegatives(negative) {
    return resolveGlob(negative, opt);
  }

  var ourOpt = extend({}, opt);
  delete ourOpt.root;

  var ourNegatives = negatives.map(resolveNegatives);
  ourOpt.ignore = ourNegatives;

  // Extract base path from glob
  var basePath = ourOpt.base || getBasePath(ourGlob, opt);

  // Remove path relativity to make globs make sense
  ourGlob = resolveGlob(ourGlob, opt);

  // Create globbing stuff
  var globber = new glob.Glob(ourGlob, ourOpt);

  // Create stream and map events from globber to it
  var stream = through2.obj(ourOpt);

  var found = false;

  globber.on('error', stream.emit.bind(stream, 'error'));
  globber.once('end', function() {
    if (opt.allowEmpty !== true && !found && globIsSingular(globber)) {
      stream.emit('error',
        new Error('File not found with singular glob: ' + ourGlob));
    }

    stream.end();
  });
  globber.on('match', function(filename) {
    found = true;

    stream.write({
      cwd: opt.cwd,
      base: basePath,
      path: removeTrailingSeparator(filename),
    });
  });
  return stream;
}

function indexGreaterThan(index) {
  return function(obj) {
    return obj.index > index;
  };
}

function toGlob(obj) {
  return obj.glob;
}

function globIsSingular(glob) {
  var globSet = glob.minimatch.set;
  if (globSet.length !== 1) {
    return false;
  }

  return globSet[0].every(function isString(value) {
    return typeof value === 'string';
  });
}

function getBasePath(ourGlob, opt) {
  return globParent(resolveGlob(ourGlob, opt));
}

module.exports = globStream;
