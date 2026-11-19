import fs from "node:fs/promises";
import path from "node:path";
import { deprecate } from "node:util";
import { ReadableStream } from "node:stream/web";

import globParent from "glob-parent";

function validateGlobs(globs) {
  let hasPositiveGlob = false;

  for (const [index, globString] of globs.entries()) {
    if (typeof globString !== "string") {
      throw new Error(`Invalid glob at index ${index}`);
    }

    if (isPositiveGlob(globString)) {
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

function validateUniqueBy({ uniqueBy } = {}) {
  if (typeof uniqueBy === "function") {
    return;
  }

  if (typeof uniqueBy === "string") {
    if (uniqueBy === "cwd" || uniqueBy === "base" || uniqueBy === "path") {
      return;
    } else {
      throw new Error("The `uniqueBy` string must be 'cwd', 'base', or 'path'");
    }
  }

  throw new Error("The `uniqueBy` option must be a string or function");
}

function isDefined(item) {
  return item != null;
}
const showIgnoreDeprecation = deprecate(
  () => {},
  "The `ignore` option is deprecated - use `exclude` instead",
);

function validateOptions(opts) {
  if (typeof opts.cwd !== "string") {
    throw new Error("The `cwd` option must be a string");
  }

  if (typeof opts.cwdbase !== "boolean") {
    throw new Error("The `cwdbase` option must be a boolean");
  }

  validateUniqueBy(opts);

  if (opts.base && typeof opts.base !== "string") {
    throw new Error("The `base` option must be a string if specified");
  }

  if (!Array.isArray(opts.ignore)) {
    throw new Error("The `ignore` option must be a string or array");
  } else {
    if (opts.ignore.some(isDefined)) {
      showIgnoreDeprecation();
    }
  }

  if (!Array.isArray(opts.exclude)) {
    throw new Error("The `exclude` option must be a string or array");
  }
}

function uniqueBy(comparator) {
  const seen = new Set();

  if (typeof comparator === "string") {
    if (comparator === "cwd") {
      return isUniqueByCwd;
    }
    if (comparator === "base") {
      return isUniqueByBase;
    }
    if (comparator === "path") {
      return isUniqueByPath;
    }
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

  function isUniqueByCwd(obj) {
    return isUnique(obj.cwd);
  }
  function isUniqueByBase(obj) {
    return isUnique(obj.base);
  }
  function isUniqueByPath(obj) {
    return isUnique(obj.path);
  }

  function isUniqueByFunc(obj) {
    return isUnique(comparator(obj));
  }
}

export default function globStream(globs, opt) {
  if (!Array.isArray(globs)) {
    globs = [globs];
  }

  validateGlobs(globs);

  const ourOpt = Object.assign(
    {},
    {
      cwd: process.cwd(),
      cwdbase: false,
      uniqueBy: "path",
      exclude: [],
      // TODO: deprecate `ignore` option
      ignore: [],
    },
    opt,
    {
      withFileTypes: true,
      followSymlinks: true,
    },
  );
  // Normalize `ignore` to array
  ourOpt.ignore =
    typeof ourOpt.ignore === "string" ? [ourOpt.ignore] : ourOpt.ignore;
  // Normalize `exclude` to array
  ourOpt.exclude =
    typeof ourOpt.exclude === "string" ? [ourOpt.exclude] : ourOpt.exclude;

  validateOptions(ourOpt);

  ourOpt.cwd = path.resolve(ourOpt.cwd);

  let base = ourOpt.base;
  if (ourOpt.cwdbase) {
    base = ourOpt.cwd;
  }

  const positiveGlobs = [];
  const negativeGlobs = [];
  for (const globString of globs) {
    if (isNegatedGlob(globString)) {
      negativeGlobs.push(globString.slice(1));
    } else {
      positiveGlobs.push(globString);
    }
  }
  ourOpt.exclude = [...negativeGlobs, ...ourOpt.ignore, ...ourOpt.exclude];

  const isUnique = uniqueBy(ourOpt.uniqueBy);

  async function* globber(globs, opts) {
    for (const glob of globs) {
      const globber = fs.glob(glob, opts);
      const globIter = globber[Symbol.asyncIterator]();

      // Build the glob parent exactly once for each glob
      let parent = globParent(glob);
      if (!path.isAbsolute(parent)) {
        parent = path.join(opts.cwd, parent);
      }

      for await (const dirent of globIter) {
        const filepath = path.join(dirent.parentPath, dirent.name);

        // Decide on the glob's base path
        const basePath = base || parent;

        const obj = {
          // We always want to normalize the properties to posix-style slashes
          cwd: opts.cwd,
          base: path.normalize(basePath),
          path: filepath,
        };

        // TODO: Attach to opts so this can be hoisted outside the function?
        const unique = isUnique(obj);
        if (unique) {
          yield obj;
        }
      }
    }
  }

  return ReadableStream.from(globber(positiveGlobs, ourOpt));
}
