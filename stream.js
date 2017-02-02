'use strict';

var inherits = require('util').inherits;

var glob = require('glob');
var extend = require('extend');
var Readable = require('readable-stream').Readable;
var globParent = require('glob-parent');
var toAbsoluteGlob = require('to-absolute-glob');
var removeTrailingSeparator = require('remove-trailing-separator');

function getBasePath(ourGlob, opt) {
  return globParent(toAbsoluteGlob(ourGlob, opt));
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

function GlobStream(ourGlob, negatives, opt) {
  if (!(this instanceof GlobStream)) {
    return new GlobStream(ourGlob, negatives, opt);
  }

  // TODO: document that we only accept highWaterMark
  Readable.call(this, {
    objectMode: true,
    highWaterMark: opt.highWaterMark || 16
  });

  var self = this;

  function resolveNegatives(negative) {
    return toAbsoluteGlob(negative, opt);
  }

  var ourOpt = extend({}, opt);
  delete ourOpt.root;
  delete ourOpt.highWaterMark;

  var ourNegatives = negatives.map(resolveNegatives);
  ourOpt.ignore = ourNegatives;

  // Extract base path from glob
  var basePath = ourOpt.base || getBasePath(ourGlob, opt);

  // Remove path relativity to make globs make sense
  ourGlob = toAbsoluteGlob(ourGlob, opt);

  var globber = new glob.Glob(ourGlob, ourOpt);
  this._globber = globber;

  var found = false;

  globber.on('match', function(filepath) {
    found = true;
    var obj = {
      cwd: opt.cwd,
      base: basePath,
      path: removeTrailingSeparator(filepath),
    };
    if (!self.push(obj)) {
      globber.pause();
    }
  });

  globber.once('end', function() {
    if (opt.allowEmpty !== true && !found && globIsSingular(globber)) {
      // TODO: consider adding note about `allowEmpty` option in error
      // TODO: should we really be emitting the event here or should it be passed to destroy
      self.emit('error',
        new Error('File not found with singular glob: ' + ourGlob));
    }

    self.push(null);
  });

  globber.once('error', function() {
    // TODO: re-emit error on stream (maybe call destroy?)
  });
}
inherits(GlobStream, Readable);

GlobStream.prototype._read = function() {
  this._globber.resume();
};

GlobStream.prototype.destroy = function(err) {
  var self = this;

  // TODO: figure out proper signature for this and use correctly
  this._globber.abort();

  process.nextTick(function() {
    if (err) {
      self.emit('error', err);
    }
    self.emit('close');
  });
};

module.exports = GlobStream;
