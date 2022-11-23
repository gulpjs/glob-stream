'use strict';

var unique = require('unique-stream');
var pumpify = require('pumpify');
var isNegatedGlob = require('is-negated-glob');

var GlobStream = require('./readable');

function globStream(globs, opt) {
  if (!opt) {
    opt = {};
  }

  var ourOpt = Object.assign({}, opt);

  ourOpt.cwd = typeof ourOpt.cwd === 'string' ? ourOpt.cwd : process.cwd();
  ourOpt.dot = typeof ourOpt.dot === 'boolean' ? ourOpt.dot : false;
  ourOpt.silent = typeof ourOpt.silent === 'boolean' ? ourOpt.silent : true;
  ourOpt.cwdbase = typeof ourOpt.cwdbase === 'boolean' ? ourOpt.cwdbase : false;
  ourOpt.uniqueBy =
    typeof ourOpt.uniqueBy === 'string' || typeof ourOpt.uniqueBy === 'function'
      ? ourOpt.uniqueBy
      : 'path';

  if (ourOpt.cwdbase) {
    ourOpt.base = ourOpt.cwd;
  }

  // Only one glob no need to aggregate
  if (!Array.isArray(globs)) {
    globs = [globs];
  }

  var hasPositiveGlob = false;

  globs.forEach(checkGlobs);

  function checkGlobs(globString, index) {
    if (typeof globString !== 'string') {
      throw new Error('Invalid glob at index ' + index);
    }

    var result = isNegatedGlob(globString);
    if (result.negated === false) {
      hasPositiveGlob = true;
    }
  }

  if (hasPositiveGlob === false) {
    throw new Error('Missing positive glob');
  }

  // Then just pipe them to a single unique stream and return it
  var aggregate = new GlobStream(globs, ourOpt);
  var uniqueStream = unique(ourOpt.uniqueBy);

  return pumpify.obj(aggregate, uniqueStream);
}

module.exports = globStream;
