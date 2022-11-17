'use strict';

var inherits = require('util').inherits;

var Readable = require('readable-stream').Readable;
var globParent = require('glob-parent');
var toAbsoluteGlob = require('to-absolute-glob');
var removeTrailingSeparator = require('remove-trailing-separator');
var walkdir = require('walkdir');
var anymatch = require('anymatch');
var isGlob = require('is-glob');

var globErrMessage1 = 'File not found with singular glob: ';
var globErrMessage2 = ' (if this was purposeful, use `allowEmpty` option)';

function getBasePath(ourGlob, opt) {
  return globParent(toAbsoluteGlob(ourGlob, opt));
}

function isFound(glob) {
  // All globs are "found", while singular globs are only found when matched successfully
  // This is due to the fact that a glob can match any number of files (0..Infinity) but
  // a signular glob is always expected to match
  return isGlob(glob);
}

function GlobStream(positives, negatives, opt) {
  if (!(this instanceof GlobStream)) {
    return new GlobStream(positives, negatives, opt);
  }

  var ourOpt = Object.assign({}, opt);

  Readable.call(this, {
    objectMode: true,
    highWaterMark: ourOpt.highWaterMark || 16,
  });

  // Delete `highWaterMark` after inheriting from Readable
  delete ourOpt.highWaterMark;

  var self = this;

  function resolveGlob(glob) {
    return toAbsoluteGlob(glob, ourOpt);
  }

  if (!Array.isArray(positives)) {
    positives = [positives];
  }

  // Remove path relativity to make globs make sense
  var ourPositives = positives.map(resolveGlob);
  var ourNegatives = negatives.map(resolveGlob);
  ourOpt.ignore = ourNegatives;

  var cwd = ourOpt.cwd;
  var allowEmpty = ourOpt.allowEmpty || false;

  var found = ourPositives.map(isFound);

  // Delete `root` after all resolving done
  delete ourOpt.root;
  ourOpt.strictSlashes = false;

  var matcher = anymatch(ourPositives, null, ourOpt);

  var globber = walkdir(cwd, function (filepath, stat) {
    var matchIdx = matcher(filepath, true);
    if (matchIdx === -1 && stat.isDirectory()) {
      matchIdx = matcher(filepath + '/', true);
    }
    if (matchIdx !== -1) {
      found[matchIdx] = true;

      // Extract base path from glob
      var basePath = ourOpt.base || getBasePath(ourPositives[matchIdx], ourOpt);

      var obj = {
        cwd: cwd,
        base: basePath,
        path: removeTrailingSeparator(filepath),
      };

      var drained = self.push(obj);
      if (!drained) {
        globber.pause();
      }
    }
  });

  globber.once('end', function () {
    found.forEach(function (matchFound, idx) {
      if (allowEmpty !== true && !matchFound) {
        var err = new Error(
          globErrMessage1 + ourPositives[idx] + globErrMessage2
        );

        return self.destroy(err);
      }
    });
    self.push(null);
  });

  this._globber = globber;

  globber.once('end', function () {
    self.push(null);
  });

  function onError(err) {
    self.destroy(err);
  }

  globber.once('error', onError);
}
inherits(GlobStream, Readable);

GlobStream.prototype._read = function () {
  this._globber.resume();
};

GlobStream.prototype.destroy = function (err) {
  var self = this;

  this._globber.end();

  process.nextTick(function () {
    if (err) {
      self.emit('error', err);
    }
    self.emit('close');
  });
};

module.exports = GlobStream;
