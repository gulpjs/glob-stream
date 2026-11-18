"use strict";

var fs = require("node:fs");
var os = require("node:os");
var path = require("node:path");
var timers = require("node:timers/promises");
var { AssertionError } = require("node:assert");
var { isDeepStrictEqual } = require("node:util");
var { assert, describe, it, getTestContext } = require("node:test");
var { pipeline } = require("node:stream/promises");

assert.register("containsAllEqual", (actual, expected) => {
  const t = getTestContext();

  t.assert.strictEqual(actual.length, expected.length);

  for (const exp of expected) {
    const found = actual.some((pathObj) => isDeepStrictEqual(pathObj, exp));
    t.assert.ok(
      found,
      // We create an assertion error to have a deepStrictEqual diff on the pathObj that is not specified
      new AssertionError({
        actual: undefined,
        expected: exp,
        operator: "deepStrictEqual",
        diff: "simple",
      }),
    );
  }
});

var globStream = require("../");

function deWindows(p) {
  return p.replace(/\\/g, "/");
}

var isWin32 = os.platform() === "win32";

// For globs
var dir = deWindows(__dirname);

// For filepaths
var cwd = process.cwd();
var dirname = __dirname;

function suite(moduleName) {
  var { PassThrough, Transform, Writable } = require(moduleName);

  function concat(fn, timeout) {
    var items = [];
    return new Writable({
      objectMode: true,
      write: function (chunk, enc, cb) {
        if (typeof enc === "function") {
          cb = enc;
        }
        setTimeout(() => {
          items.push(chunk);
          cb();
        }, timeout || 1);
      },
      final: function (cb) {
        if (typeof fn === "function") {
          fn(items);
        }

        cb();
      },
    });
  }

  describe(`glob-stream (with ${moduleName})`, () => {
    it("streams a single object when given a directory path", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/whatsgoingon"),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream("./fixtures/whatsgoingon", { cwd: dirname }),
        concat(assertion),
      );
    });

    it("streams a single object when given a file path", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/test.coffee"),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream("./fixtures/test.coffee", { cwd: dirname }),
        concat(assertion),
      );
    });

    it("streams only objects with directory paths when given a directory glob", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures/whatsgoingon"),
          path: path.join(dirname, "/fixtures/whatsgoingon/hey"),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream("./fixtures/whatsgoingon/*/", { cwd: dirname }),
        concat(assertion),
      );
    });

    it("does not emit an error if glob base directory does not exist", async (t) => {
      var expected = [];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream("./fixtures/not-exists/*", { cwd: dirname }),
        concat(assertion),
      );
    });

    it("streams only objects with file paths from a non-directory glob", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/test.coffee"),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream("./fixtures/*.coffee", { cwd: dirname }),
        concat(assertion),
      );
    });

    it("properly handles ( ) in cwd path", async (t) => {
      var cwd = path.join(dirname, "/fixtures/has (parens)");

      var expected = [
        {
          cwd: cwd,
          base: cwd,
          path: path.join(cwd, "/test.dmc"),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(globStream("*.dmc", { cwd: cwd }), concat(assertion));
    });

    it("sets the correct base when ( ) in glob", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures/has (parens)"),
          path: path.join(dirname, "/fixtures/has (parens)/test.dmc"),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream("./fixtures/has (parens)/*.dmc", { cwd: dir }),
        concat(assertion),
      );
    });

    it("finds files in paths that contain ( ) or [ ] when they match the glob", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/has (parens)/test.dmc"),
        },
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/has [brackets]/test.foo"),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream("./fixtures/has*/*", { cwd: dirname }),
        concat(assertion),
      );
    });

    it("properly handles [ ] in cwd path", async (t) => {
      var cwd = path.join(dir, "/fixtures/has [brackets]");

      var expected = [
        {
          cwd: cwd,
          base: cwd,
          path: path.join(cwd, "/test.foo"),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(globStream("*.foo", { cwd: cwd }), concat(assertion));
    });

    // Node glob does not seem to support `\\[` as an escaped bracket
    it("sets the correct base when [ is escaped by [[] in glob", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures/has [brackets]"),
          path: path.join(dirname, "/fixtures/has [brackets]/test.foo"),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream("./fixtures/has [[]brackets]/*.foo", { cwd: dir }),
        concat(assertion),
      );
    });

    it("emits all objects (unordered) when given multiple paths and specified base", async (t) => {
      var base = path.join(dir, "/fixtures");

      var expected = [
        {
          cwd: base,
          base: base,
          path: path.join(
            base,
            "/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt",
          ),
        },
        {
          cwd: base,
          base: base,
          path: path.join(base, "/test.coffee"),
        },
        {
          cwd: base,
          base: base,
          path: path.join(base, "/whatsgoingon/test.js"),
        },
      ];

      var globs = [
        "./whatsgoingon/hey/isaidhey/whatsgoingon/test.txt",
        "./test.coffee",
        "./whatsgoingon/test.js",
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream(globs, { cwd: base, base: base }),
        concat(assertion),
      );
    });

    it("emits all objects (unordered) when given multiple paths and cwdbase", async (t) => {
      var base = path.join(dir, "/fixtures");

      var expected = [
        {
          cwd: base,
          base: base,
          path: path.join(
            base,
            "/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt",
          ),
        },
        {
          cwd: base,
          base: base,
          path: path.join(base, "/test.coffee"),
        },
        {
          cwd: base,
          base: base,
          path: path.join(base, "/whatsgoingon/test.js"),
        },
      ];

      var globs = [
        "./whatsgoingon/hey/isaidhey/whatsgoingon/test.txt",
        "./test.coffee",
        "./whatsgoingon/test.js",
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream(globs, { cwd: base, cwdbase: true }),
        concat(assertion),
      );
    });

    it("emits all objects (unordered) when given multiple globs with globstars", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(
            dir,
            "/fixtures/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt",
          ),
        },
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/test.coffee"),
        },
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/whatsgoingon/test.js"),
        },
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/has (parens)/test.dmc"),
        },
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/stuff/test.dmc"),
        },
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/symlinks/symlink-dest/test.js"),
        },
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(
            dir,
            "/fixtures/symlinks/symlink-dest/hey/isaidhey/whatsgoingon/test.txt",
          ),
        },
      ];

      var globs = [
        "./fixtures/**/test.txt",
        "./fixtures/**/test.coffee",
        "./fixtures/**/test.js",
        "./fixtures/**/test.dmc",
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(globStream(globs, { cwd: dirname }), concat(assertion));
    });

    // By default, we only run this in non-Windows CI since it takes so long
    it(
      "does not stack overflow if there are an insane amount of files",
      { skip: process.env.CI !== "true" || os.platform() === "win32" },
      async (t) => {
        var largeDir = path.join(dir, "fixtures/too-many");
        fs.mkdirSync(largeDir, { recursive: true });

        for (var i = 0; i < 100000; i++) {
          fs.writeFileSync(path.join(largeDir, `file-${i}.txt`), `test-${i}`);
        }

        function assertion(pathObjs) {
          for (var i = 0; i < 100000; i++) {
            fs.unlinkSync(path.join(largeDir, `file-${i}.txt`));
          }
          fs.rmdirSync(largeDir);

          t.assert.strictEqual(pathObjs.length, 100000);
        }

        var glob = `${deWindows(largeDir)}/*.txt`;

        await pipeline(globStream(glob), concat(assertion));
      },
    );

    it("emits all objects (unordered) when given multiple absolute paths and no cwd", async (t) => {
      var tmp = os.tmpdir();

      var testFile = path.join(tmp, "glob-stream-test.txt");
      fs.writeFileSync(testFile, "test");

      var expected = [
        {
          cwd: cwd,
          base: path.join(
            dirname,
            "/fixtures/whatsgoingon/hey/isaidhey/whatsgoingon",
          ),
          path: path.join(
            dir,
            "/fixtures/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt",
          ),
        },
        {
          cwd: cwd,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/test.coffee"),
        },
        {
          cwd: cwd,
          base: path.join(dirname, "/fixtures/whatsgoingon"),
          path: path.join(dirname, "/fixtures/whatsgoingon/test.js"),
        },
        {
          cwd: cwd,
          base: tmp,
          path: path.join(tmp, "/glob-stream-test.txt"),
        },
      ];

      var globs = [
        `${dir}/fixtures/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt`,
        `${dir}/fixtures/test.coffee`,
        `${dir}/fixtures/whatsgoingon/test.js`,
        `${deWindows(tmp)}/glob-stream-*.txt`,
      ];

      function assertion(pathObjs) {
        fs.unlinkSync(testFile);

        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(globStream(globs), concat(assertion));
    });

    it("skips directories with invalid permission", async (t) => {
      var tmp = os.tmpdir();

      var testFile = path.join(tmp, "glob-stream-test.txt");
      fs.writeFileSync(testFile, "test");

      var testDir = path.join(tmp, "glob-stream-private-dir");
      fs.mkdirSync(testDir, { recursive: true, mode: 0o200 });

      var expected = [
        {
          cwd: cwd,
          base: tmp,
          path: path.join(tmp, "/glob-stream-test.txt"),
        },
      ];

      var globs = [`${deWindows(tmp)}/glob-stream-*.txt`];

      function assertion(pathObjs) {
        fs.unlinkSync(testFile);
        fs.rmdirSync(testDir);

        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(globStream(globs), concat(assertion));
    });

    it("resolves globs when process.chdir() changes the cwd", async (t) => {
      var prevCwd = cwd;
      process.chdir("test/fixtures/stuff");

      var expected = [
        {
          cwd: path.join(dirname, "/fixtures/stuff"),
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/test.coffee"),
        },
      ];

      function assertion(pathObjs) {
        process.chdir(prevCwd);

        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(globStream(["../*.coffee"]), concat(assertion));
    });

    // https://github.com/gulpjs/glob-stream/issues/129
    it(
      "does not take a long time when when checking a singular glob in the project root",
      // Extremely short timeout to ensure we aren't traversing node_modules
      { timeout: 20 },
      async (t) => {
        var expected = [
          {
            cwd: cwd,
            base: cwd,
            path: path.join(cwd, "/package.json"),
          },
        ];

        function assertion(pathObjs) {
          t.assert.containsAllEqual(pathObjs, expected);
        }

        await pipeline(globStream(["./package.json"]), concat(assertion));
      },
    );

    it("removes duplicate objects from the stream using default (path) filter", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/test.coffee"),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream(["./fixtures/test.coffee", "./fixtures/*.coffee"], {
          cwd: dirname,
        }),
        concat(assertion),
      );
    });

    it("removes duplicate objects from the stream using custom string filter", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures/stuff"),
          path: path.join(dirname, "/fixtures/stuff/run.dmc"),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream(["./fixtures/stuff/run.dmc", "./fixtures/stuff/test.dmc"], {
          cwd: dirname,
          uniqueBy: "base",
        }),
        concat(assertion),
      );
    });

    it("removes duplicate objects from the stream using custom function filter", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures/stuff"),
          path: path.join(dirname, "/fixtures/stuff/run.dmc"),
        },
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures/stuff"),
          path: path.join(dirname, "/fixtures/stuff/test.dmc"),
        },
      ];

      var uniqueBy = function (data) {
        return data.path;
      };

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream("./fixtures/stuff/*.dmc", {
          cwd: dirname,
          uniqueBy: uniqueBy,
        }),
        concat(assertion),
      );
    });

    it("ignores dotfiles without dot extglob", async (t) => {
      var expected = [];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream("./fixtures/*swag", { cwd: dirname }),
        concat(assertion),
      );
    });

    it("finds dotfiles with dot extglob", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/.swag"),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream("./fixtures/*(.)swag", { cwd: dirname }),
        concat(assertion),
      );
    });

    it("removes dotfiles that match negative globs with dot extglob", async (t) => {
      var expected = [];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream(["./fixtures/*(.)swag", "!./fixtures/**"], { cwd: dirname }),
        concat(assertion),
      );
    });

    it("works with direct paths and no cwd", async (t) => {
      var expected = [
        {
          cwd: cwd,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/test.coffee"),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream(`${dir}/fixtures/test.coffee`),
        concat(assertion),
      );
    });

    it("works with a relative cwd", async (t) => {
      var expected = [
        {
          cwd: path.join(cwd, "/test"),
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/test.coffee"),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream(`${dir}/fixtures/test.coffee`, {
          cwd: path.relative(cwd, dirname),
        }),
        concat(assertion),
      );
    });

    it("supports negative globs", async (t) => {
      var expected = [
        {
          cwd: cwd,
          base: path.join(dirname, "/fixtures/stuff"),
          path: path.join(dirname, "/fixtures/stuff/run.dmc"),
        },
      ];

      var globs = [
        `${dir}/fixtures/stuff/*.dmc`,
        `!${dir}/fixtures/stuff/*test.dmc`,
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(globStream(globs), concat(assertion));
    });

    it("supports negative file paths", async (t) => {
      var expected = [
        {
          cwd: cwd,
          base: path.join(dirname, "/fixtures/stuff"),
          path: path.join(dirname, "/fixtures/stuff/run.dmc"),
        },
      ];

      var globs = [
        `${dir}/fixtures/stuff/*.dmc`,
        `!${dir}/fixtures/stuff/test.dmc`,
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(globStream(globs), concat(assertion));
    });

    it("does not error when a negative glob removes all matches from a positive glob", async (t) => {
      function assertion(pathObjs) {
        t.assert.strictEqual(pathObjs.length, 0);
      }

      await pipeline(
        globStream(["./fixtures/**/*.js", "!./**/test.js"], { cwd: dirname }),
        concat(assertion),
      );
    });

    it("applies all negative globs to each positive glob", async (t) => {
      var expected = [];

      var globs = [
        "./fixtures/stuff/*",
        "!./fixtures/stuff/*.dmc",
        "./fixtures/stuff/*.dmc",
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(globStream(globs, { cwd: dirname }), concat(assertion));
    });

    it("does not exclude file path after negative glob", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures/stuff"),
          path: path.join(dirname, "/fixtures/stuff/run.dmc"),
        },
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/test.coffee"),
        },
      ];

      var globs = [
        `${dir}/fixtures/stuff/*.dmc`,
        `!${dir}/fixtures/stuff/test.dmc`,
        `${dir}/fixtures/test.coffee`,
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(globStream(globs, { cwd: dirname }), concat(assertion));
    });

    it("does not exclude file path before negative glob", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures/stuff"),
          path: path.join(dirname, "/fixtures/stuff/run.dmc"),
        },
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/test.coffee"),
        },
      ];

      var globs = [
        `${dir}/fixtures/stuff/*.dmc`,
        `${dir}/fixtures/test.coffee`,
        `!${dir}/fixtures/stuff/test.dmc`,
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(globStream(globs, { cwd: dirname }), concat(assertion));
    });

    it("throws on invalid glob argument", function (t) {
      t.assert.throws(() => globStream(42, { cwd: dirname }), {
        message: /Invalid glob .* 0/,
      });
      t.assert.throws(() => globStream([".", 42], { cwd: dirname }), {
        message: /Invalid glob .* 1/,
      });
    });

    it("throws on missing positive glob", function (t) {
      t.assert.throws(() => globStream("!c", { cwd: dirname }), {
        message: /Missing positive glob/,
      });
      t.assert.throws(() => globStream(["!a", "!b"], { cwd: dirname }), {
        message: /Missing positive glob/,
      });
    });

    it("does not emit an error when file not found on glob containing {}", async (t) => {
      await t.assert.doesNotReject(
        pipeline(globStream("notfound{a,b}"), concat()),
      );
    });

    it("does not emit an error on singular path", async (t) => {
      await t.assert.doesNotReject(pipeline(globStream("notfound"), concat()));
    });

    it("traverses symlinked directories", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures/symlinks"),
          path: path.join(dirname, "/fixtures/symlinks/file-a.txt"),
        },
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures/symlinks"),
          path: path.join(
            dir,
            "/fixtures/symlinks/symlink-dest/hey/isaidhey/whatsgoingon/test.txt",
          ),
        },
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures/symlinks"),
          path: path.join(
            dirname,
            "/fixtures/symlinks/folder-a/folder-a-file.txt",
          ),
        },
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures/symlinks"),
          path: path.join(
            dirname,
            "/fixtures/symlinks/folder-b/folder-b-file.txt",
          ),
        },
        // It should follow these circular symlinks, but not infinitely
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures/symlinks"),
          path: path.join(
            dirname,
            "/fixtures/symlinks/folder-a/link-to-b/folder-b-file.txt",
          ),
        },
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures/symlinks"),
          path: path.join(
            dirname,
            "/fixtures/symlinks/folder-b/link-to-a/folder-a-file.txt",
          ),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream(["./fixtures/symlinks/**/*.txt"], { cwd: dirname }),
        concat(assertion),
      );
    });

    it("does not end prematurely", async (t) => {
      var gs = globStream(["./fixtures/*.js"], { cwd: dirname });

      function assertion(pathObjs) {
        t.assert.strictEqual(pathObjs.length, 0);
      }

      await timers.setTimeout(100);

      await pipeline(gs, new PassThrough(), concat(assertion));
    });
  });

  describe("options", () => {
    it("avoids mutation of options", async (t) => {
      var defaultedOpts = {
        cwd: cwd,
        cwdbase: false,
      };

      var opts = {};

      var gs = globStream(`${dir}/fixtures/stuff/run.dmc`, opts);
      t.assert.strictEqual(Object.keys(opts).length, 0);
      t.assert.notDeepStrictEqual(opts, defaultedOpts);

      await pipeline(gs, concat());
    });

    it("throws on invalid options", (t) => {
      t.assert.throws(
        () => globStream("./fixtures/stuff/*.dmc", { cwd: 1234 }),
        {
          message: /must be a string/,
        },
      );
      t.assert.throws(
        () => globStream("./fixtures/stuff/*.dmc", { cwdbase: 1234 }),
        {
          message: /must be a boolean/,
        },
      );
      t.assert.throws(
        () => globStream("./fixtures/stuff/*.dmc", { uniqueBy: 1234 }),
        {
          message: /must be a string or function/,
        },
      );
      t.assert.throws(
        () => globStream("./fixtures/stuff/*.dmc", { base: 1234 }),
        {
          message: /must be a string if specified/,
        },
      );
      t.assert.throws(
        () => globStream("./fixtures/stuff/*.dmc", { ignore: 1234 }),
        {
          message: /must be a string or array/,
        },
      );
    });

    describe("cwd", () => {
      it("(win) accepts UNC paths", { skip: !isWin32 }, async (t) => {
        var namespaced = path.toNamespacedPath(dir);

        var expected = [
          {
            cwd: namespaced,
            base: path.join(namespaced, "/fixtures"),
            path: path.join(namespaced, "/fixtures/test.coffee"),
          },
        ];

        function assertion(pathObjs) {
          t.assert.containsAllEqual(pathObjs, expected);
        }

        await pipeline(
          globStream("fixtures/*.coffee", { cwd: namespaced }),
          concat(assertion),
        );
      });
    });

    describe("ignore", () => {
      it("accepts a string (in addition to array)", async (t) => {
        var expected = [
          {
            cwd: dirname,
            base: path.join(dirname, "/fixtures/stuff"),
            path: path.join(dirname, "/fixtures/stuff/run.dmc"),
          },
        ];

        function assertion(pathObjs) {
          t.assert.containsAllEqual(pathObjs, expected);
        }

        await pipeline(
          globStream("./fixtures/stuff/*.dmc", {
            cwd: dirname,
            ignore: "./fixtures/stuff/test.dmc",
          }),
          concat(assertion),
        );
      });

      it("supports the ignore option instead of negation", async (t) => {
        var expected = [
          {
            cwd: dirname,
            base: path.join(dirname, "/fixtures/stuff"),
            path: path.join(dirname, "/fixtures/stuff/run.dmc"),
          },
        ];

        function assertion(pathObjs) {
          t.assert.containsAllEqual(pathObjs, expected);
        }

        await pipeline(
          globStream("./fixtures/stuff/*.dmc", {
            cwd: dirname,
            ignore: ["./fixtures/stuff/test.dmc"],
          }),
          concat(assertion),
        );
      });

      it("supports the ignore option with dot extglob", async (t) => {
        var expected = [];

        function assertion(pathObjs) {
          t.assert.containsAllEqual(pathObjs, expected);
        }

        await pipeline(
          globStream("./fixtures/*(.)swag", {
            cwd: dirname,
            ignore: ["./fixtures/**"],
          }),
          concat(assertion),
        );
      });

      it("can use both ignore option and negative globs", async (t) => {
        var expected = [];

        var globs = ["./fixtures/stuff/*.dmc", "!./fixtures/stuff/test.dmc"];

        function assertion(pathObjs) {
          t.assert.containsAllEqual(pathObjs, expected);
        }

        await pipeline(
          globStream(globs, {
            cwd: dirname,
            ignore: ["./fixtures/stuff/run.dmc"],
          }),
          concat(assertion),
        );
      });
    });

    it("throws an error if you try to write to it", function (t) {
      var gs = globStream("notfound", { cwd: dirname });
      gs.on("error", () => {});

      t.assert.throws(() => gs.write({}));
    });

    it("does not throw an error if you push to it", async (t) => {
      var stub = {
        cwd: dirname,
        base: dir,
        path: dir,
      };

      var expected = [
        stub,
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/test.coffee"),
        },
      ];

      var gs = globStream("./fixtures/test.coffee", { cwd: dirname });

      gs.push(stub);

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(gs, concat(assertion));
    });

    it("accepts a file path", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/test.coffee"),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream("./fixtures/test.coffee", { cwd: dirname }),
        concat(assertion),
      );
    });

    it("accepts a glob", async (t) => {
      var expected = [
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/has (parens)/test.dmc"),
        },
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/stuff/run.dmc"),
        },
        {
          cwd: dirname,
          base: path.join(dirname, "/fixtures"),
          path: path.join(dirname, "/fixtures/stuff/test.dmc"),
        },
      ];

      function assertion(pathObjs) {
        t.assert.containsAllEqual(pathObjs, expected);
      }

      await pipeline(
        globStream("./fixtures/**/*.dmc", { cwd: dirname }),
        concat(assertion),
      );
    });

    it("pauses the globber upon backpressure", async (t) => {
      var gs = globStream("./fixtures/**/*.dmc", {
        cwd: dirname,
        highWaterMark: 1,
      });

      function waiter(pathObj, enc, cb) {
        if (typeof enc === "function") {
          cb = enc;
        }

        setTimeout(() => {
          cb(null, pathObj);
        }, 500);
      }

      function assertion(pathObjs) {
        t.assert.strictEqual(pathObjs.length, 3);
      }

      await pipeline(
        gs,
        new Transform({
          objectMode: true,
          highWaterMark: 1,
          transform: waiter,
        }),
        concat(assertion),
      );
    });

    it("does not emit an error if stream is destroyed without an error", (t, done) => {
      var gs = globStream("./fixtures/**/*.dmc", { cwd: dirname });

      var spy = t.mock.fn(() => {});

      gs.on("error", spy);

      gs.on("close", () => {
        t.assert.strictEqual(spy.mock.callCount() > 0, false);
        done();
      });

      gs.destroy();
    });

    it(
      "handles tons of files with double-star glob",
      { timeout: 10000 },
      async (t) => {
        var gs = globStream("./node_modules/**/LICENSE", {
          cwd: path.resolve(dirname, "../"),
        });

        function assertion(results) {
          t.assert.strictEqual(results.length > 16, true);
        }

        await pipeline(gs, concat(assertion));
      },
    );

    it(
      "handles tons of files with single-star glob",
      { timeout: 10000 },
      async (t) => {
        var gs = globStream("./node_modules/*", {
          cwd: path.resolve(dirname, "../"),
        });

        function assertion(results) {
          t.assert.strictEqual(results.length > 16, true);
        }

        await pipeline(gs, concat(assertion));
      },
    );
  });
}

suite("stream");
suite("streamx");
suite("readable-stream");
