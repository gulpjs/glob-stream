/**
 * Creates a ReadableStream that emits file path objects that match a series of globs.
 *
 * @param {string | string[]} globs The globs to match against.
 * @param {Options} [opt] Configuration for the glob-stream instance.
 * @returns {ReadableStream<PathObject>} A stream that emits file path objects that have matched.
 */
export default function globStream(
  globs: string | string[],
  opt?: Options,
): ReadableStream<PathObject>;
/**
 * Object of path information for a file matched by glob.
 */
export type PathObject = {
  /**
   * The current working directory of the matcher.
   */
  cwd: string;
  /**
   * The non-magic portion of the glob that matched.
   */
  base: string;
  /**
   * The absolute file path to the file.
   */
  path: string;
};
/**
 * A function used to provide a value of uniqueness.
 */
export type UniqueByFunc = (p: PathObject) => unknown;
/**
 * Configuration for the glob-stream instance.
 */
export type Options = {
  /**
   * A property or function to determine uniqueness of a {@link PathObject} - defaults to `"path"`.
   */
  uniqueBy?: "base" | "path" | UniqueByFunc | "cwd" | undefined;
  /**
   * The current working directory - defaults to `process.cwd()`.
   */
  cwd?: string | undefined;
  /**
   * If `true`, the `cwd` value will be used as the `base` on {@link PathObject}.
   */
  cwdbase?: boolean | undefined;
  /**
   * A hardcoded `base` to use on each {@link PathObject}.
   */
  base?: string | undefined;
  /**
   * Paths or globs for the glob instance to exclude.
   */
  ignore?: string | string[] | undefined;
  /**
   * Paths or globs for the glob instance to exclude.
   */
  exclude?: string | string[] | undefined;
};
//# sourceMappingURL=index.d.ts.map
