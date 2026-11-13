"use strict";

var fs = require("node:fs");
var path = require("node:path");

var { Readable } = require("streamx");
var globParent = require("glob-parent").default;
var normalizePath = require("normalize-path");

function validateGlobs(globs) {
  var hasPositiveGlob = false;

  globs.forEach(validateGlobs);

  function validateGlobs(globString, index) {
    if (typeof globString !== "string") {
      throw new Error("Invalid glob at index " + index);
    }

    if (isNegatedGlob(globString) === false) {
      hasPositiveGlob = true;
    }
  }

  if (hasPositiveGlob === false) {
    throw new Error("Missing positive glob");
  }
}

function isNegatedGlob(glob) {
  return glob.startsWith("!");
}

function isPositiveGlob(glob) {
  return !isNegatedGlob(glob);
}

function validateOptions(opts) {
  if (typeof opts.cwd !== "string") {
    throw new Error("The `cwd` option must be a string");
  }

  if (typeof opts.cwdbase !== "boolean") {
    throw new Error("The `cwdbase` option must be a boolean");
  }

  if (
    typeof opts.uniqueBy !== "string" &&
    typeof opts.uniqueBy !== "function"
  ) {
    throw new Error("The `uniqueBy` option must be a string or function");
  }

  if (opts.base && typeof opts.base !== "string") {
    throw new Error("The `base` option must be a string if specified");
  }

  if (!Array.isArray(opts.ignore)) {
    throw new Error("The `ignore` option must be a string or array");
  }
}

function uniqueBy(comparator) {
  var seen = new Set();

  if (typeof comparator === "string") {
    return isUniqueByKey;
  } else {
    return isUniqueByFunc;
  }

  function isUnique(value) {
    if (seen.has(value)) {
      return false;
    } else {
      seen.add(value);
      return true;
    }
  }

  function isUniqueByKey(obj) {
    return isUnique(obj[comparator]);
  }

  function isUniqueByFunc(obj) {
    return isUnique(comparator(obj));
  }
}

function globStream(globs, opt) {
  if (!Array.isArray(globs)) {
    globs = [globs];
  }

  validateGlobs(globs);

  var ourOpt = Object.assign(
    {},
    {
      cwd: process.cwd(),
      cwdbase: false,
      uniqueBy: "path",
      // TODO: deprecate `ignore` option
      ignore: [],
    },
    opt,
    {
      withFileTypes: true,
      followSymlinks: true,
      // TODO: Remove when using `fs.glob` where this is unsupported
      dot: false,
      // TODO: Remove when no longer using `@gulpjs/to-absolute-glob`
      root: undefined,
    },
  );
  // Normalize `ignore` to array
  ourOpt.ignore =
    typeof ourOpt.ignore === "string" ? [ourOpt.ignore] : ourOpt.ignore;

  validateOptions(ourOpt);

  ourOpt.cwd = path.resolve(ourOpt.cwd);

  var base = ourOpt.base;
  if (ourOpt.cwdbase) {
    base = ourOpt.cwd;
  }

  var positiveGlobs = globs.filter(isPositiveGlob);
  var negativeGlobs = globs.filter(isNegatedGlob).map((glob) => glob.slice(1));
  // TODO: Support explicit `exclude` option
  ourOpt.exclude = [...negativeGlobs, ...ourOpt.ignore];

  var isUnique = uniqueBy(ourOpt.uniqueBy);

  async function* globber(globs, opts) {
    for (const glob of globs) {
      const globber = fs.promises.glob(glob, opts);
      const iter = globber[Symbol.asyncIterator]();
      const parent = globParent(glob, opts);

      for await (const dirent of iter) {
        const filepath = path.join(dirent.parentPath, dirent.name);

        // Extract base path from glob
        var basePath = base || parent;

        var obj = {
          // We always want to normalize the properties to posix-style slashes
          cwd: normalizePath(opts.cwd, true),
          base: normalizePath(basePath, true),
          path: normalizePath(filepath, true),
        };
        // TODO: Add some sort of "stat cache" for performance improvements if stats exist on file

        // TODO: Attach to opts so this can be hoisted outside the function?
        var unique = isUnique(obj);
        if (unique) {
          yield obj;
        }
      }
    }
  }

  return Readable.from(globber(positiveGlobs, ourOpt));
}

module.exports = globStream;
