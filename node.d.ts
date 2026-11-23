declare module "node:fs/promises" {
  interface GlobOpts {
    cwd: string;
    exclude: string[];
    withFileTypes: boolean;
    followSymlinks: boolean;
  }
  interface Dirent {
    parentPath: string;
    name: string;
  }
  function glob(g: string, opts: GlobOpts): AsyncIterable<Dirent>;
}

declare module "node:path" {
  function resolve(p1: string): string;
  function isAbsolute(p1: string): boolean;
  function join(p1: string, p2: string): string;
  function normalize(p1: string): string;
}

declare module "node:process" {
  function cwd(): string;
}

declare module "node:util" {
  function deprecate(fn: () => void, msg: string): () => void;
}

declare module "node:stream/web" {
  const ReadableStream: globalThis.ReadableStream & {
    from<T>(iter: AsyncIterable<T>): globalThis.ReadableStream<T>;
  };
}
