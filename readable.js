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

  var ourOpt = extend({}, opt);

  Readable.call(this, {
    objectMode: true,
    highWaterMark: ourOpt.highWaterMark || 16
  });

  // Delete `highWaterMark` after inheriting from Readable
  delete ourOpt.highWaterMark;

  var self = this;

  function resolveNegatives(negative) {
    return toAbsoluteGlob(negative, ourOpt);
  }

  var ourNegatives = negatives.map(resolveNegatives);
  ourOpt.ignore = ourNegatives;

  var cwd = ourOpt.cwd;
  var allowEmpty = ourOpt.allowEmpty || false;

  // Extract base path from glob
  var basePath = ourOpt.base || getBasePath(ourGlob, ourOpt);

  // Remove path relativity to make globs make sense
  ourGlob = toAbsoluteGlob(ourGlob, ourOpt);
  // Delete `root` after all resolving done
  delete ourOpt.root;

  var globber = new glob.Glob(ourGlob, ourOpt);
  this._globber = globber;

  var found = false;

  globber.on('match', function(filepath) {
    found = true;
    var obj = {
      cwd: cwd,
      base: basePath,
      path: removeTrailingSeparator(filepath),
    };
    if (!self.push(obj)) {
      globber.pause();
    }
  });

  globber.once('end', function() {
      // TODO: consider adding note about `allowEmpty` option in error
      // TODO: should we really be emitting the event here or should it be passed to destroy
      self.emit('error',
        new Error('File not found with singular glob: ' + ourGlob));
    if (allowEmpty !== true && !found && globIsSingular(globber)) {
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
