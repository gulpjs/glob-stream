"use strict";

var path = require("node:path");
// Need to wrap this to cause walker to emit an error
var fs = require("node:fs");
var os = require("node:os");
var assert = require("node:assert");
var { describe, it } = require("node:test");
var { assertExtras } = require("./support");

var globStream = require("../");

function deWindows(p) {
  return p.replace(/\\/g, "/");
}

var cwd = deWindows(process.cwd());
var dir = deWindows(__dirname);

function suite(moduleName) {
  var stream = require(moduleName);

  function concat(fn, timeout) {
    var items = [];
    return new stream.Writable({
      objectMode: true,
      write: function (chunk, enc, cb) {
        if (typeof enc === "function") {
          cb = enc;
        }
        setTimeout(function () {
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

  describe("glob-stream (with " + moduleName + ")", function () {
    it("streams a single object when given a directory path", function (t, done) {
      var expected = {
        cwd: dir,
        base: dir + "/fixtures",
        path: dir + "/fixtures/whatsgoingon",
      };

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assert.deepStrictEqual(pathObjs[0], expected);
      }

      stream.pipeline(
        [
          globStream("./fixtures/whatsgoingon", { cwd: dir }),
          concat(assertion),
        ],
        done,
      );
    });

    it("streams a single object when given a file path", function (t, done) {
      var expected = {
        cwd: dir,
        base: dir + "/fixtures",
        path: dir + "/fixtures/test.coffee",
      };

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assert.deepStrictEqual(pathObjs[0], expected);
      }

      stream.pipeline(
        [globStream("./fixtures/test.coffee", { cwd: dir }), concat(assertion)],
        done,
      );
    });

    it("streams only objects with directory paths when given a directory glob", function (t, done) {
      var expected = {
        cwd: dir,
        base: dir + "/fixtures/whatsgoingon",
        path: dir + "/fixtures/whatsgoingon/hey",
      };

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assert.deepStrictEqual(pathObjs[0], expected);
      }

      stream.pipeline(
        [
          globStream("./fixtures/whatsgoingon/*/", { cwd: dir }),
          concat(assertion),
        ],
        done,
      );
    });

    it("does not emit an error if glob base directory does not exist", function (t, done) {
      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 0);
      }

      stream.pipeline(
        [
          globStream("./fixtures/not-exists/*", { cwd: dir }),
          concat(assertion),
        ],
        done,
      );
    });

    it("streams only objects with file paths from a non-directory glob", function (t, done) {
      var expected = {
        cwd: dir,
        base: dir + "/fixtures",
        path: dir + "/fixtures/test.coffee",
      };

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assert.deepStrictEqual(pathObjs[0], expected);
      }

      stream.pipeline(
        [globStream("./fixtures/*.coffee", { cwd: dir }), concat(assertion)],
        done,
      );
    });

    it("properly handles ( ) in cwd path", function (t, done) {
      var cwd = dir + "/fixtures/has (parens)";

      var expected = {
        cwd: cwd,
        base: cwd,
        path: cwd + "/test.dmc",
      };

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assertExtras.containsAllEqual(pathObjs, [expected]);
      }

      stream.pipeline(
        [globStream("*.dmc", { cwd: cwd }), concat(assertion)],
        done,
      );
    });

    it("sets the correct base when ( ) in glob", function (t, done) {
      var expected = {
        cwd: dir,
        base: dir + "/fixtures/has (parens)",
        path: dir + "/fixtures/has (parens)/test.dmc",
      };

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assertExtras.containsAllEqual(pathObjs, [expected]);
      }

      stream.pipeline(
        [
          globStream("./fixtures/has \\(parens\\)/*.dmc", { cwd: dir }),
          concat(assertion),
        ],
        done,
      );
    });

    it("finds files in paths that contain ( ) or [ ] when they match the glob", function (t, done) {
      var expected = [
        {
          cwd: dir,
          base: dir + "/fixtures",
          path: dir + "/fixtures/has (parens)/test.dmc",
        },
        {
          cwd: dir,
          base: dir + "/fixtures",
          path: dir + "/fixtures/has [brackets]/test.foo",
        },
      ];

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 2);
        assertExtras.containsAllEqual(pathObjs, expected);
      }

      stream.pipeline(
        [globStream("./fixtures/has*/*", { cwd: dir }), concat(assertion)],
        done,
      );
    });

    it("properly handles [ ] in cwd path", function (t, done) {
      var cwd = dir + "/fixtures/has [brackets]";

      var expected = {
        cwd: cwd,
        base: cwd,
        path: cwd + "/test.foo",
      };

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assertExtras.containsAllEqual(pathObjs, [expected]);
      }

      stream.pipeline(
        [globStream("*.foo", { cwd: cwd }), concat(assertion)],
        done,
      );
    });

    it("sets the correct base when [ ] in glob", function (t, done) {
      var expected = {
        cwd: dir,
        base: dir + "/fixtures/has [brackets]",
        path: dir + "/fixtures/has [brackets]/test.foo",
      };

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assertExtras.containsAllEqual(pathObjs, [expected]);
      }

      stream.pipeline(
        [
          globStream("./fixtures/has \\[brackets\\]/*.foo", { cwd: dir }),
          concat(assertion),
        ],
        done,
      );
    });

    it("emits all objects (unordered) when given multiple paths and specified base", function (t, done) {
      var base = dir + "/fixtures";

      var expected = [
        {
          cwd: base,
          base: base,
          path: base + "/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt",
        },
        {
          cwd: base,
          base: base,
          path: base + "/test.coffee",
        },
        {
          cwd: base,
          base: base,
          path: base + "/whatsgoingon/test.js",
        },
      ];

      var paths = [
        "./whatsgoingon/hey/isaidhey/whatsgoingon/test.txt",
        "./test.coffee",
        "./whatsgoingon/test.js",
      ];

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 3);
        assertExtras.containsAllEqual(pathObjs, expected);
      }

      stream.pipeline(
        [globStream(paths, { cwd: base, base: base }), concat(assertion)],
        done,
      );
    });

    it("emits all objects (unordered) when given multiple paths and cwdbase", function (t, done) {
      var base = dir + "/fixtures";

      var expected = [
        {
          cwd: base,
          base: base,
          path: base + "/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt",
        },
        {
          cwd: base,
          base: base,
          path: base + "/test.coffee",
        },
        {
          cwd: base,
          base: base,
          path: base + "/whatsgoingon/test.js",
        },
      ];

      var paths = [
        "./whatsgoingon/hey/isaidhey/whatsgoingon/test.txt",
        "./test.coffee",
        "./whatsgoingon/test.js",
      ];

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 3);
        assertExtras.containsAllEqual(pathObjs, expected);
      }

      stream.pipeline(
        [globStream(paths, { cwd: base, cwdbase: true }), concat(assertion)],
        done,
      );
    });

    it("emits all objects (unordered) when given multiple globs with globstars", function (t, done) {
      var expected = [
        {
          cwd: dir,
          base: dir + "/fixtures",
          path:
            dir + "/fixtures/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt",
        },
        {
          cwd: dir,
          base: dir + "/fixtures",
          path: dir + "/fixtures/test.coffee",
        },
        {
          cwd: dir,
          base: dir + "/fixtures",
          path: dir + "/fixtures/whatsgoingon/test.js",
        },
        {
          cwd: dir,
          base: dir + "/fixtures",
          path: dir + "/fixtures/has (parens)/test.dmc",
        },
        {
          cwd: dir,
          base: dir + "/fixtures",
          path: dir + "/fixtures/stuff/test.dmc",
        },
        {
          cwd: dir,
          base: dir + "/fixtures",
          path: dir + "/fixtures/symlinks/symlink-dest/test.js",
        },
        {
          cwd: dir,
          base: dir + "/fixtures",
          path:
            dir +
            "/fixtures/symlinks/symlink-dest/hey/isaidhey/whatsgoingon/test.txt",
        },
      ];

      var globs = [
        "./fixtures/**/test.txt",
        "./fixtures/**/test.coffee",
        "./fixtures/**/test.js",
        "./fixtures/**/test.dmc",
      ];

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 7);
        assertExtras.containsAllEqual(pathObjs, expected);
      }

      stream.pipeline(
        [globStream(globs, { cwd: dir }), concat(assertion)],
        done,
      );
    });

    // By default, we only run this in non-Windows CI since it takes so long
    it(
      "does not stack overflow if there are an insane amount of files",
      { skip: process.env.CI !== "true" || os.platform() === "win32" },
      function (t, done) {
        var largeDir = path.join(dir, "fixtures/too-many");
        fs.mkdirSync(largeDir, { recursive: true });

        for (var i = 0; i < 100000; i++) {
          fs.writeFileSync(
            path.join(largeDir, "file-" + i + ".txt"),
            "test-" + i,
          );
        }

        function assertion(pathObjs) {
          for (var i = 0; i < 100000; i++) {
            fs.unlinkSync(path.join(largeDir, "file-" + i + ".txt"));
          }
          fs.rmdirSync(largeDir);

          assert.strictEqual(pathObjs.length, 100000);
        }

        var glob = deWindows(largeDir) + "/*.txt";

        stream.pipeline([globStream(glob), concat(assertion)], done);
      },
    );

    it("emits all objects (unordered) when given multiple absolute paths and no cwd", function (t, done) {
      var testFile = path.join(os.tmpdir(), "glob-stream-test.txt");
      fs.writeFileSync(testFile, "test");

      var tmp = deWindows(os.tmpdir());

      var expected = [
        {
          cwd: cwd,
          base: dir + "/fixtures/whatsgoingon/hey/isaidhey/whatsgoingon",
          path:
            dir + "/fixtures/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt",
        },
        {
          cwd: cwd,
          base: dir + "/fixtures",
          path: dir + "/fixtures/test.coffee",
        },
        {
          cwd: cwd,
          base: dir + "/fixtures/whatsgoingon",
          path: dir + "/fixtures/whatsgoingon/test.js",
        },
        {
          cwd: cwd,
          base: tmp,
          path: tmp + "/glob-stream-test.txt",
        },
      ];

      var paths = [
        dir + "/fixtures/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt",
        dir + "/fixtures/test.coffee",
        dir + "/fixtures/whatsgoingon/test.js",
        tmp + "/glob-stream-*.txt",
      ];

      function assertion(pathObjs) {
        fs.unlinkSync(testFile);
        assert.strictEqual(pathObjs.length, 4);
        assertExtras.containsAllEqual(pathObjs, expected);
      }

      stream.pipeline([globStream(paths), concat(assertion)], done);
    });

    it("skips directories with invalid permission", function (t, done) {
      var testFile = path.join(os.tmpdir(), "glob-stream-test.txt");
      fs.writeFileSync(testFile, "test");

      var testDir = path.join(os.tmpdir(), "glob-stream-private-dir");
      fs.mkdirSync(testDir, { recursive: true, mode: 0o200 });

      var tmp = deWindows(os.tmpdir());

      var expected = [
        {
          cwd: cwd,
          base: tmp,
          path: tmp + "/glob-stream-test.txt",
        },
      ];

      var paths = [tmp + "/glob-stream-*.txt"];

      function assertion(pathObjs) {
        fs.unlinkSync(testFile);
        fs.rmdirSync(testDir);
        assert.strictEqual(pathObjs.length, 1);
        assertExtras.containsAllEqual(pathObjs, expected);
      }

      stream.pipeline([globStream(paths), concat(assertion)], done);
    });

    it("resolves globs when process.chdir() changes the cwd", function (t, done) {
      var prevCwd = process.cwd();
      process.chdir("test/fixtures/stuff");

      var expected = {
        cwd: dir + "/fixtures/stuff",
        base: dir + "/fixtures",
        path: dir + "/fixtures/test.coffee",
      };

      function assertion(pathObjs) {
        process.chdir(prevCwd);

        assert.strictEqual(pathObjs.length, 1);
        assertExtras.containsAllEqual(pathObjs, [expected]);
      }

      stream.pipeline([globStream(["../*.coffee"]), concat(assertion)], done);
    });

    // https://github.com/gulpjs/glob-stream/issues/129
    // Extremely short timeout to ensure we aren't traversing node_modules
    it(
      "does not take a long time when when checking a singular glob in the project root",
      { timeout: 20 },
      function (t, done) {
        var expected = {
          cwd: cwd,
          base: cwd,
          path: cwd + "/package.json",
        };

        function assertion(pathObjs) {
          assert.strictEqual(pathObjs.length, 1);
          assert.deepStrictEqual(pathObjs[0], expected);
        }

        stream.pipeline(
          [globStream(["./package.json"]), concat(assertion)],
          done,
        );
      },
    );

    it("removes duplicate objects from the stream using default (path) filter", function (t, done) {
      var expected = {
        cwd: dir,
        base: dir + "/fixtures",
        path: dir + "/fixtures/test.coffee",
      };

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assertExtras.containsAllEqual(pathObjs, [expected]);
      }

      stream.pipeline(
        [
          globStream(["./fixtures/test.coffee", "./fixtures/*.coffee"], {
            cwd: dir,
          }),
          concat(assertion),
        ],
        done,
      );
    });

    it("removes duplicate objects from the stream using custom string filter", function (t, done) {
      var expected = {
        cwd: dir,
        base: dir + "/fixtures/stuff",
        path: dir + "/fixtures/stuff/run.dmc",
      };

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assertExtras.containsAllEqual(pathObjs, [expected]);
      }

      stream.pipeline(
        [
          globStream(
            ["./fixtures/stuff/run.dmc", "./fixtures/stuff/test.dmc"],
            {
              cwd: dir,
              uniqueBy: "base",
            },
          ),
          concat(assertion),
        ],
        done,
      );
    });

    it("removes duplicate objects from the stream using custom function filter", function (t, done) {
      var expected = [
        {
          cwd: dir,
          base: dir + "/fixtures/stuff",
          path: dir + "/fixtures/stuff/run.dmc",
        },
        {
          cwd: dir,
          base: dir + "/fixtures/stuff",
          path: dir + "/fixtures/stuff/test.dmc",
        },
      ];

      var uniqueBy = function (data) {
        return data.path;
      };

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 2);
        assertExtras.containsAllEqual(pathObjs, expected);
      }

      stream.pipeline(
        [
          globStream("./fixtures/stuff/*.dmc", {
            cwd: dir,
            uniqueBy: uniqueBy,
          }),
          concat(assertion),
        ],
        done,
      );
    });

    it("ignores dotfiles without dot option", function (t, done) {
      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 0);
      }

      stream.pipeline(
        [globStream("./fixtures/*swag", { cwd: dir }), concat(assertion)],
        done,
      );
    });

    it("finds dotfiles with dot option", function (t, done) {
      var expected = {
        cwd: dir,
        base: dir + "/fixtures",
        path: dir + "/fixtures/.swag",
      };

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assertExtras.containsAllEqual(pathObjs, [expected]);
      }

      stream.pipeline(
        [
          globStream("./fixtures/*swag", { cwd: dir, dot: true }),
          concat(assertion),
        ],
        done,
      );
    });

    it("removes dotfiles that match negative globs with dot option", function (t, done) {
      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 0);
      }

      stream.pipeline(
        [
          globStream(["./fixtures/*swag", "!./fixtures/**"], {
            cwd: dir,
            dot: true,
          }),
          concat(assertion),
        ],
        done,
      );
    });

    it("works with direct paths and no cwd", function (t, done) {
      var expected = {
        cwd: cwd,
        base: dir + "/fixtures",
        path: dir + "/fixtures/test.coffee",
      };

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assertExtras.containsAllEqual(pathObjs, [expected]);
      }

      stream.pipeline(
        [globStream(dir + "/fixtures/test.coffee"), concat(assertion)],
        done,
      );
    });

    it("works with a relative cwd", function (t, done) {
      var expected = {
        cwd: cwd + "/test",
        base: dir + "/fixtures",
        path: dir + "/fixtures/test.coffee",
      };

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assertExtras.containsAllEqual(pathObjs, [expected]);
      }

      stream.pipeline(
        [
          globStream(dir + "/fixtures/test.coffee", {
            cwd: path.relative(process.cwd(), __dirname),
          }),
          concat(assertion),
        ],
        done,
      );
    });

    it("supports negative globs", function (t, done) {
      var expected = {
        cwd: cwd,
        base: dir + "/fixtures/stuff",
        path: dir + "/fixtures/stuff/run.dmc",
      };

      var globs = [
        dir + "/fixtures/stuff/*.dmc",
        "!" + dir + "/fixtures/stuff/*test.dmc",
      ];

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assertExtras.containsAllEqual(pathObjs, [expected]);
      }

      stream.pipeline([globStream(globs), concat(assertion)], done);
    });

    it("supports negative file paths", function (t, done) {
      var expected = {
        cwd: cwd,
        base: dir + "/fixtures/stuff",
        path: dir + "/fixtures/stuff/run.dmc",
      };

      var paths = [
        dir + "/fixtures/stuff/*.dmc",
        "!" + dir + "/fixtures/stuff/test.dmc",
      ];

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assertExtras.containsAllEqual(pathObjs, [expected]);
      }

      stream.pipeline([globStream(paths), concat(assertion)], done);
    });

    it("does not error when a negative glob removes all matches from a positive glob", function (t, done) {
      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 0);
      }

      stream.pipeline(
        [
          globStream(["./fixtures/**/*.js", "!./**/test.js"], { cwd: dir }),
          concat(assertion),
        ],
        done,
      );
    });

    it("applies all negative globs to each positive glob", function (t, done) {
      var globs = [
        "./fixtures/stuff/*",
        "!./fixtures/stuff/*.dmc",
        "./fixtures/stuff/*.dmc",
      ];

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 0);
      }

      stream.pipeline(
        [globStream(globs, { cwd: dir }), concat(assertion)],
        done,
      );
    });

    it("does not exclude file path after negative glob", function (t, done) {
      var expected = [
        {
          cwd: dir,
          base: dir + "/fixtures/stuff",
          path: dir + "/fixtures/stuff/run.dmc",
        },
        {
          cwd: dir,
          base: dir + "/fixtures",
          path: dir + "/fixtures/test.coffee",
        },
      ];

      var paths = [
        dir + "/fixtures/stuff/*.dmc",
        "!" + dir + "/fixtures/stuff/test.dmc",
        dir + "/fixtures/test.coffee",
      ];

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 2);
        assertExtras.containsAllEqual(pathObjs, expected);
      }

      stream.pipeline(
        [globStream(paths, { cwd: dir }), concat(assertion)],
        done,
      );
    });

    it("does not exclude file path before negative glob", function (t, done) {
      var expected = [
        {
          cwd: dir,
          base: dir + "/fixtures/stuff",
          path: dir + "/fixtures/stuff/run.dmc",
        },
        {
          cwd: dir,
          base: dir + "/fixtures",
          path: dir + "/fixtures/test.coffee",
        },
      ];

      var paths = [
        dir + "/fixtures/stuff/*.dmc",
        dir + "/fixtures/test.coffee",
        "!" + dir + "/fixtures/stuff/test.dmc",
      ];

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 2);
        assertExtras.containsAllEqual(pathObjs, expected);
      }

      stream.pipeline(
        [globStream(paths, { cwd: dir }), concat(assertion)],
        done,
      );
    });

    it("throws on invalid glob argument", function () {
      assert.throws(globStream.bind(globStream, 42, { cwd: dir }), {
        message: /Invalid glob .* 0/,
      });
      assert.throws(globStream.bind(globStream, [".", 42], { cwd: dir }), {
        message: /Invalid glob .* 1/,
      });
    });

    it("throws on missing positive glob", function () {
      assert.throws(globStream.bind(globStream, "!c", { cwd: dir }), {
        message: /Missing positive glob/,
      });
      assert.throws(globStream.bind(globStream, ["!a", "!b"], { cwd: dir }), {
        message: /Missing positive glob/,
      });
    });

    it("emits an error when file not found on singular path", function (t, done) {
      function assertion(err) {
        assert.match(err.toString(), /File not found with singular glob/);
        done();
      }

      stream.pipeline([globStream("notfound"), concat()], assertion);
    });

    it("does not emit an error when file not found on glob containing {}", function (t, done) {
      function assertion(err) {
        assert.ifError(err);
        done();
      }

      stream.pipeline([globStream("notfound{a,b}"), concat()], assertion);
    });

    it("does not emit an error on singular path when allowEmpty is true", function (t, done) {
      function assertion(err) {
        assert.ifError(err);
        done();
      }

      stream.pipeline(
        [globStream("notfound", { allowEmpty: true }), concat()],
        assertion,
      );
    });

    it("emits an error when a singular path in multiple paths not found", function (t, done) {
      function assertion(err) {
        assert.match(err.toString(), /File not found with singular glob/);
        done();
      }

      stream.pipeline(
        [
          globStream(["notfound", "./fixtures/whatsgoingon"], { cwd: dir }),
          concat(),
        ],
        assertion,
      );
    });

    it("emits an error when a singular path in multiple paths/globs not found", function (t, done) {
      function assertion(err) {
        assert.match(err.toString(), /File not found with singular glob/);
        done();
      }

      stream.pipeline(
        [
          globStream(["notfound", "./fixtures/*.coffee"], { cwd: dir }),
          concat(),
        ],
        assertion,
      );
    });

    it("resolves absolute paths when root option is given", function (t, done) {
      var expected = {
        cwd: cwd,
        base: dir + "/fixtures",
        path: dir + "/fixtures/test.coffee",
      };

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assertExtras.containsAllEqual(pathObjs, [expected]);
      }

      stream.pipeline(
        [
          globStream("/test.coffee", { root: dir + "/fixtures" }),
          concat(assertion),
        ],
        done,
      );
    });

    it("traverses symlinked directories", function (t, done) {
      var expected = [
        {
          cwd: dir,
          base: dir + "/fixtures/symlinks",
          path: dir + "/fixtures/symlinks/file-a.txt",
        },
        {
          cwd: dir,
          base: dir + "/fixtures/symlinks",
          path:
            dir +
            "/fixtures/symlinks/symlink-dest/hey/isaidhey/whatsgoingon/test.txt",
        },
        {
          cwd: dir,
          base: dir + "/fixtures/symlinks",
          path: dir + "/fixtures/symlinks/folder-a/folder-a-file.txt",
        },
        {
          cwd: dir,
          base: dir + "/fixtures/symlinks",
          path: dir + "/fixtures/symlinks/folder-b/folder-b-file.txt",
        },
        // It should follow these circular symlinks, but not infinitely
        {
          cwd: dir,
          base: dir + "/fixtures/symlinks",
          path: dir + "/fixtures/symlinks/folder-a/link-to-b/folder-b-file.txt",
        },
        {
          cwd: dir,
          base: dir + "/fixtures/symlinks",
          path: dir + "/fixtures/symlinks/folder-b/link-to-a/folder-a-file.txt",
        },
      ];

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 6);
        assertExtras.containsAllEqual(pathObjs, expected);
      }

      stream.pipeline(
        [
          globStream(["./fixtures/symlinks/**/*.txt"], { cwd: dir }),
          concat(assertion),
        ],
        done,
      );
    });

    it("does not end prematurely", function (t, done) {
      var gs = globStream(["./fixtures/*.js"], { cwd: dir });

      function delayed() {
        stream.pipeline(
          [
            gs,
            new stream.Transform({
              objectMode: true,
              transform: function (data, enc, cb) {
                if (typeof enc === "function") {
                  cb = enc;
                }
                cb(null, data);
              },
            }),
            concat(),
          ],
          done,
        );
      }

      setTimeout(delayed, 10);
    });
  });

  describe("options", function () {
    it("avoids mutation of options", function (t, done) {
      var defaultedOpts = {
        cwd: process.cwd(),
        dot: false,
        cwdbase: false,
      };

      var opts = {};

      var gs = globStream(dir + "/fixtures/stuff/run.dmc", opts);
      assert.strictEqual(Object.keys(opts).length, 0);
      assert.notDeepStrictEqual(opts, defaultedOpts);

      stream.pipeline([gs, concat()], done);
    });

    it("throws on invalid options", function () {
      assert.throws(() => globStream("./fixtures/stuff/*.dmc", { cwd: 1234 }), {
        message: /must be a string/,
      });
      assert.throws(() => globStream("./fixtures/stuff/*.dmc", { dot: 1234 }), {
        message: /must be a boolean/,
      });
      assert.throws(
        () => globStream("./fixtures/stuff/*.dmc", { cwdbase: 1234 }),
        {
          message: /must be a boolean/,
        },
      );
      assert.throws(
        () => globStream("./fixtures/stuff/*.dmc", { uniqueBy: 1234 }),
        {
          message: /must be a string or function/,
        },
      );
      assert.throws(
        () => globStream("./fixtures/stuff/*.dmc", { allowEmpty: 1234 }),
        { message: /must be a boolean/ },
      );
      assert.throws(
        () => globStream("./fixtures/stuff/*.dmc", { base: 1234 }),
        {
          message: /must be a string if specified/,
        },
      );
      assert.throws(
        () => globStream("./fixtures/stuff/*.dmc", { ignore: 1234 }),
        {
          message: /must be a string or array/,
        },
      );
    });

    describe("ignore", function () {
      it("accepts a string (in addition to array)", function (t, done) {
        var expected = {
          cwd: dir,
          base: dir + "/fixtures/stuff",
          path: dir + "/fixtures/stuff/run.dmc",
        };

        function assertion(pathObjs) {
          assert.strictEqual(pathObjs.length, 1);
          assertExtras.containsAllEqual(pathObjs, [expected]);
        }

        stream.pipeline(
          [
            globStream("./fixtures/stuff/*.dmc", {
              cwd: dir,
              ignore: "./fixtures/stuff/test.dmc",
            }),
            concat(assertion),
          ],
          done,
        );
      });

      it("supports the ignore option instead of negation", function (t, done) {
        var expected = {
          cwd: dir,
          base: dir + "/fixtures/stuff",
          path: dir + "/fixtures/stuff/run.dmc",
        };

        function assertion(pathObjs) {
          assert.strictEqual(pathObjs.length, 1);
          assertExtras.containsAllEqual(pathObjs, [expected]);
        }

        stream.pipeline(
          [
            globStream("./fixtures/stuff/*.dmc", {
              cwd: dir,
              ignore: ["./fixtures/stuff/test.dmc"],
            }),
            concat(assertion),
          ],
          done,
        );
      });

      it("supports the ignore option with dot option", function (t, done) {
        function assertion(pathObjs) {
          assert.strictEqual(pathObjs.length, 0);
        }

        stream.pipeline(
          [
            globStream("./fixtures/*swag", {
              cwd: dir,
              dot: true,
              ignore: ["./fixtures/**"],
            }),
            concat(assertion),
          ],
          done,
        );
      });

      it("can use both ignore option and negative globs", function (t, done) {
        var globs = ["./fixtures/stuff/*.dmc", "!./fixtures/stuff/test.dmc"];

        function assertion(pathObjs) {
          assert.strictEqual(pathObjs.length, 0);
        }

        stream.pipeline(
          [
            globStream(globs, {
              cwd: dir,
              ignore: ["./fixtures/stuff/run.dmc"],
            }),
            concat(assertion),
          ],
          done,
        );
      });
    });

    it("emits an error if there are no matches", function (t, done) {
      function assertion(err) {
        assert.match(err.message, /^File not found with singular glob/g);
        done();
      }

      stream.pipeline(
        [globStream("notfound", { cwd: dir }), concat()],
        assertion,
      );
    });

    it("throws an error if you try to write to it", function (t, done) {
      var gs = globStream("notfound", { cwd: dir });
      gs.on("error", function () {});

      try {
        gs.write({});
      } catch (err) {
        assert.ok(err);
        done();
      }
    });

    it("does not throw an error if you push to it", function (t, done) {
      var stub = {
        cwd: dir,
        base: dir,
        path: dir,
      };

      var gs = globStream("./fixtures/test.coffee", { cwd: dir });

      gs.push(stub);

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 2);
        assert.strictEqual(pathObjs[0], stub);
      }

      stream.pipeline([gs, concat(assertion)], done);
    });

    it("accepts a file path", function (t, done) {
      var expected = {
        cwd: dir,
        base: dir + "/fixtures",
        path: dir + "/fixtures/test.coffee",
      };

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 1);
        assertExtras.containsAllEqual(pathObjs, [expected]);
      }

      stream.pipeline(
        [globStream("./fixtures/test.coffee", { cwd: dir }), concat(assertion)],
        done,
      );
    });

    it("accepts a glob", function (t, done) {
      var expected = [
        {
          cwd: dir,
          base: dir + "/fixtures",
          path: dir + "/fixtures/has (parens)/test.dmc",
        },
        {
          cwd: dir,
          base: dir + "/fixtures",
          path: dir + "/fixtures/stuff/run.dmc",
        },
        {
          cwd: dir,
          base: dir + "/fixtures",
          path: dir + "/fixtures/stuff/test.dmc",
        },
      ];

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 3);
        assertExtras.containsAllEqual(pathObjs, expected);
      }

      stream.pipeline(
        [globStream("./fixtures/**/*.dmc", { cwd: dir }), concat(assertion)],
        done,
      );
    });

    it("pauses the globber upon backpressure", function (t, done) {
      var gs = globStream("./fixtures/**/*.dmc", {
        cwd: dir,
        highWaterMark: 1,
      });

      function waiter(pathObj, _, cb) {
        setTimeout(function () {
          cb(null, pathObj);
        }, 500);
      }

      function assertion(pathObjs) {
        assert.strictEqual(pathObjs.length, 3);
      }

      stream.pipeline(
        [
          gs,
          new stream.PassThrough(
            { objectMode: true, highWaterMark: 1 },
            waiter,
          ),
          concat(assertion),
        ],
        done,
      );
    });

    it("destroys the stream with an error if no match is found", function (t, done) {
      var gs = globStream("notfound", { cwd: dir });

      var spy = t.mock.method(gs, "destroy");

      function assertion(err) {
        assert.strictEqual(spy.mock.calls[0].arguments[0], err);
        assert.match(err.toString(), /File not found with singular glob/);
        done();
      }

      stream.pipeline([gs, concat()], assertion);
    });

    it("destroys the stream with an error if no match is found with multiple singular globs", function (t, done) {
      var gs = globStream(["notfound", "notfound2"], { cwd: dir });

      var spy = t.mock.method(gs, "destroy");

      function assertion(err) {
        assert.strictEqual(spy.mock.calls[0].arguments[0], err);
        assert.match(err.toString(), /File not found with singular glob/);
        done();
      }

      stream.pipeline([gs, concat()], assertion);
    });

    it("destroys the stream if walker errors", function (t, done) {
      var expectedError = new Error("Stubbed error");

      var gs = globStream("./fixtures/**/*.dmc", { cwd: dir });

      function stubError(dirpath, opts, cb) {
        cb(expectedError);
      }
      var spy = t.mock.method(gs, "destroy");
      t.mock.method(fs, "readdir", stubError);

      function assertion(err) {
        assert.strictEqual(spy.mock.callCount() > 0, true);
        assert.strictEqual(err, expectedError);
        done();
      }

      stream.pipeline([gs, concat()], assertion);
    });

    it("destroys the stream if walker errors when following symlink", function (t, done) {
      var expectedError = new Error("Stubbed error");

      var gs = globStream("./fixtures/**/*.dmc", { cwd: dir });

      function stubError(dirpath, cb) {
        cb(expectedError);
      }
      var spy = t.mock.method(gs, "destroy");
      t.mock.method(fs, "stat", stubError);

      function assertion(err) {
        assert.strictEqual(spy.mock.callCount() > 0, true);
        assert.strictEqual(err, expectedError);
        done();
      }

      stream.pipeline([gs, concat()], assertion);
    });

    it("does not emit an error if stream is destroyed without an error", function (t, done) {
      var gs = globStream("./fixtures/**/*.dmc", { cwd: dir });

      var spy = t.mock.fn(() => true);

      gs.on("error", spy);

      gs.on("close", function () {
        assert.strictEqual(spy.mock.callCount() > 0, false);
        done();
      });

      gs.destroy();
    });

    it(
      "handles tons of files with double-star glob",
      { timeout: 10000 },
      function (t, done) {
        var gs = globStream("./node_modules/**/LICENSE", {
          cwd: path.resolve(__dirname, "../"),
        });

        function assertion(results) {
          assert.strictEqual(results.length > 16, true);
        }

        stream.pipeline([gs, concat(assertion)], done);
      },
    );

    it(
      "handles tons of files with single-star glob",
      { timeout: 10000 },
      function (t, done) {
        var gs = globStream("./node_modules/*", {
          cwd: path.resolve(__dirname, "../"),
        });

        function assertion(results) {
          assert.strictEqual(results.length > 16, true);
        }

        stream.pipeline([gs, concat(assertion)], done);
      },
    );
  });
}

suite("stream");
suite("streamx");
suite("readable-stream");
