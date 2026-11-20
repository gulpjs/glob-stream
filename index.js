import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { deprecate } from "node:util";
import { ReadableStream } from "node:stream/web";

import globParent from "glob-parent";

/**
 * @typedef {object} PathObject Object of path information for a file matched by glob.
 * @property {string} cwd The current working directory of the matcher.
 * @property {string} base The non-magic portion of the glob that matched.
 * @property {string} path The absolute file path to the file.
 */

/**
 * @typedef {(p: PathObject) => unknown} UniqueByFunc A function used to provide a value of uniqueness.
 */

/**
 * @typedef {object} Options Configuration for the glob-stream instance.
 * @property {"cwd" | "base" | "path" | UniqueByFunc} [uniqueBy] A property or function to determine uniqueness of a {@link PathObject} - defaults to `"path"`.
 * @property {string} [cwd] The current working directory - defaults to `process.cwd()`.
 * @property {boolean} [cwdbase] If `true`, the `cwd` value will be used as the `base` on {@link PathObject}.
 * @property {string} [base] A hardcoded `base` to use on each {@link PathObject}.
 * @property {string | string[]} [ignore] Paths or globs for the glob instance to exclude.
 * @property {string | string[]} [exclude] Paths or globs for the glob instance to exclude.
 */

/**
 * Validates that all items in an array are strings and at least
 * one isn't a negative glob (doesn't start with a `!`).
 *
 * @param {unknown[]} globs The glob array to validate.
 * @returns {asserts globs is string[]}
 */
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

/**
 * Determines if a glob starts with `!`.
 *
 * @param {string} glob The glob string to check.
 * @returns `true` if the glob string starts with ! or `false` otherwise.
 */
function isNegatedGlob(glob) {
  return glob.startsWith("!");
}

/**
 * Determines if a glob does not start with a `!`.
 *
 * @param {string} glob The glob string to check.
 * @returns `true` if the glob does not start with `!` or `false` otherwise.
 */
function isPositiveGlob(glob) {
  return !isNegatedGlob(glob);
}

/**
 * Validates the `uniqueBy` option is of the allowed types.
 *
 * @param {Options} opts The options to validate.
 */
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

/**
 * Determines if a value is not `null` or `undefined`.
 *
 * @param {unknown} value The value to check.
 * @returns {boolean} `false` if the value is `null`/`undefined` or `true` otherwise.
 */
function isDefined(value) {
  return value != null;
}
const showIgnoreDeprecation = deprecate(
  () => {},
  "The `ignore` option is deprecated - use `exclude` instead",
);

/**
 * Determines if all options are of valid types.
 *
 * @param {Options} opts The options to validate.
 * @returns {asserts opts is {
 *  uniqueBy: "cwd" | "base" | "path" | UniqueByFunc;
 *  cwd: string;
 *  cwdbase: boolean;
 *  base?: string;
 *  ignore: string[];
 *  exclude: string[];
 * }}
 */
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

/**
 * Creates a uniqueness matching function based on a comparator.
 *
 * @param {"cwd" | "base" | "path" | UniqueByFunc} comparator
 * @returns {(p: PathObject) => boolean}
 */
function uniqueBy(comparator) {
  const seen = new Set();

  if (typeof comparator === "string") {
    if (comparator === "cwd") {
      return (obj) => isUnique(obj.cwd);
    }
    if (comparator === "base") {
      return (obj) => isUnique(obj.base);
    }
    // Has to be "path" given previous assertions
    return (obj) => isUnique(obj.path);
  } else {
    return (obj) => isUnique(comparator(obj));
  }

  /**
   * @param {string | unknown} value The value to check uniqueness of.
   * @returns {boolean} `true` if the value has been seen before or `false` otherwise.
   */
  function isUnique(value) {
    if (seen.has(value)) {
      return false;
    } else {
      seen.add(value);
      return true;
    }
  }
}

/**
 * Creates a ReadableStream that emits file path objects that match a series of globs.
 *
 * @param {string | string[]} globs The globs to match against.
 * @param {Options} [opt] Configuration for the glob-stream instance.
 * @returns {ReadableStream<PathObject>} A stream that emits file path objects that have matched.
 */
export default function globStream(globs, opt) {
  if (!Array.isArray(globs)) {
    globs = [globs];
  }

  validateGlobs(globs);

  const ourOpt = {
    cwd: process.cwd(),
    cwdbase: false,
    /** @type {"path"} */
    uniqueBy: "path",
    exclude: [],
    ignore: [],
    // Spread user-provided options
    ...opt,
  };
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

  /**
   * @param {string[]} globs
   * @param {{ cwd: string, exclude: string[] }} opts
   */
  async function* globber(globs, opts) {
    const globOpts = {
      cwd: opts.cwd,
      exclude: opts.exclude,
      withFileTypes: true,
      followSymlinks: true,
    };
    for (const glob of globs) {
      const globber = fs.glob(glob, globOpts);

      // Build the glob parent exactly once for each glob
      let parent = globParent(glob);
      if (!path.isAbsolute(parent)) {
        parent = path.join(opts.cwd, parent);
      }

      for await (const dirent of globber) {
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
