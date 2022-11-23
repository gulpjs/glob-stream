'use strict';

var inherits = require('util').inherits;

var Readable = require('readable-stream').Readable;
var globParent = require('glob-parent');
var toAbsoluteGlob = require('to-absolute-glob');
var removeTrailingSeparator = require('remove-trailing-separator');
var anymatch = require('anymatch');
var isGlob = require('is-glob');
var fastq = require('fastq');
var fs = require('fs');
var EventEmitter = require('events');
var path = require('path');

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

function walkdir() {
  var readdirOpts = {
    withFileTypes: true,
  };

  var ee = new EventEmitter();

  var queue = fastq(readdir, 1);
  queue.drain = function () {
    ee.emit('end');
  };
  queue.error(onError);

  function onError(err) {
    if (err) {
      ee.emit('error', err);
    }
  }

  ee.pause = function () {
    queue.pause();
  };
  ee.resume = function () {
    queue.resume();
  };
  ee.end = function () {
    queue.kill();
  };
  ee.walk = function (filepath) {
    queue.push(filepath);
  };

  function readdir(filepath, cb) {
    fs.readdir(filepath, readdirOpts, onReaddir);

    function onReaddir(err, dirents) {
      if (err) {
        return cb(err);
      }

      dirents.forEach(processDirent);

      cb();
    }

    function processDirent(dirent) {
      var nextpath = path.join(filepath, dirent.name);
      ee.emit('path', nextpath, dirent);

      if (dirent.isDirectory()) {
        queue.push(nextpath);
      }
    }
  }

  return ee;
}

function GlobStream(globs, opt) {
  if (!(this instanceof GlobStream)) {
    return new GlobStream(globs, opt);
  }

  var ourOpt = Object.assign({}, opt);
  var ignore = ourOpt.ignore;

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

  if (!Array.isArray(globs)) {
    globs = [globs];
  }

  // Normalize string `ignore` to array
  if (typeof ignore === 'string') {
    ignore = [ignore];
  }
  // Ensure `ignore` is an array
  if (!Array.isArray(ignore)) {
    ignore = [];
  }

  ourOpt.ignore = ignore.map(resolveGlob);

  // Remove path relativity to make globs make sense
  var ourGlobs = globs.map(resolveGlob);

  var cwd = ourOpt.cwd;
  var allowEmpty = ourOpt.allowEmpty || false;

  var found = ourGlobs.map(isFound);

  // Delete `root` after all resolving done
  delete ourOpt.root;

  var matcher = anymatch(ourGlobs, null, ourOpt);

  var walker = walkdir();

  walker.on('path', function (filepath, dirent) {
    var matchIdx = matcher(filepath, true);
    if (matchIdx === -1 && dirent.isDirectory()) {
      matchIdx = matcher(filepath + '/', true);
    }
    if (matchIdx !== -1) {
      found[matchIdx] = true;

      // Extract base path from glob
      var basePath = ourOpt.base || getBasePath(ourGlobs[matchIdx], ourOpt);

      var obj = {
        cwd: cwd,
        base: basePath,
        path: removeTrailingSeparator(filepath),
      };

      var drained = self.push(obj);
      if (!drained) {
        walker.pause();
      }
    }
  });

  walker.once('end', function () {
    found.forEach(function (matchFound, idx) {
      if (allowEmpty !== true && !matchFound) {
        var err = new Error(globErrMessage1 + ourGlobs[idx] + globErrMessage2);

        return self.destroy(err);
      }
    });
    self.push(null);
  });

  this._walker = walker;

  walker.once('end', function () {
    self.push(null);
  });

  function onError(err) {
    self.destroy(err);
  }

  walker.once('error', onError);

  walker.walk(cwd);
}
inherits(GlobStream, Readable);

GlobStream.prototype._read = function () {
  this._walker.resume();
};

GlobStream.prototype.destroy = function (err) {
  var self = this;

  this._walker.end();

  process.nextTick(function () {
    if (err) {
      self.emit('error', err);
    }
    self.emit('close');
  });
};

module.exports = GlobStream;
