'use strict';

var path = require('path');
var expect = require('expect');
var sinon = require('sinon');

// Need to wrap this to cause walker to emit an error
var fs = require('fs');
var os = require('os');

var globStream = require('../');

function deWindows(p) {
  return p.replace(/\\/g, '/');
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
        if (typeof enc === 'function') {
          cb = enc;
        }
        setTimeout(function () {
          items.push(chunk);
          cb();
        }, timeout || 1);
      },
      final: function (cb) {
        if (typeof fn === 'function') {
          fn(items);
        }

        cb();
      },
    });
  }

  describe('glob-stream (with ' + moduleName + ')', function () {
    it('streams a single object when given a directory path', function (done) {
      var expected = {
        cwd: dir,
        base: dir + '/fixtures',
        path: dir + '/fixtures/whatsgoingon',
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline(
        [globStream('./fixtures/whatsgoingon', { cwd: dir }), concat(assert)],
        done
      );
    });

    it('streams a single object when given a file path', function (done) {
      var expected = {
        cwd: dir,
        base: dir + '/fixtures',
        path: dir + '/fixtures/test.coffee',
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline(
        [globStream('./fixtures/test.coffee', { cwd: dir }), concat(assert)],
        done
      );
    });

    it('streams only objects with directory paths when given a directory glob', function (done) {
      var expected = {
        cwd: dir,
        base: dir + '/fixtures/whatsgoingon',
        path: dir + '/fixtures/whatsgoingon/hey',
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline(
        [
          globStream('./fixtures/whatsgoingon/*/', { cwd: dir }),
          concat(assert),
        ],
        done
      );
    });

    it('streams only objects with file paths from a non-directory glob', function (done) {
      var expected = {
        cwd: dir,
        base: dir + '/fixtures',
        path: dir + '/fixtures/test.coffee',
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline(
        [globStream('./fixtures/*.coffee', { cwd: dir }), concat(assert)],
        done
      );
    });

    it('properly handles ( ) in cwd path', function (done) {
      var cwd = dir + '/fixtures/has (parens)';

      var expected = {
        cwd: cwd,
        base: cwd,
        path: cwd + '/test.dmc',
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline(
        [globStream('*.dmc', { cwd: cwd }), concat(assert)],
        done
      );
    });

    it('sets the correct base when ( ) in glob', function (done) {
      var expected = {
        cwd: dir,
        base: dir + '/fixtures/has (parens)',
        path: dir + '/fixtures/has (parens)/test.dmc',
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline(
        [
          globStream('./fixtures/has \\(parens\\)/*.dmc', { cwd: dir }),
          concat(assert),
        ],
        done
      );
    });

    it('finds files in paths that contain ( ) or [ ] when they match the glob', function (done) {
      var expected = [
        {
          cwd: dir,
          base: dir + '/fixtures',
          path: dir + '/fixtures/has (parens)/test.dmc',
        },
        {
          cwd: dir,
          base: dir + '/fixtures',
          path: dir + '/fixtures/has [brackets]/test.foo',
        },
      ];

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(2);
        expect(pathObjs).toContainEqual(expected[0]);
        expect(pathObjs).toContainEqual(expected[1]);
      }

      stream.pipeline(
        [globStream('./fixtures/has*/*', { cwd: dir }), concat(assert)],
        done
      );
    });

    it('properly handles [ ] in cwd path', function (done) {
      var cwd = dir + '/fixtures/has [brackets]';

      var expected = {
        cwd: cwd,
        base: cwd,
        path: cwd + '/test.foo',
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline(
        [globStream('*.foo', { cwd: cwd }), concat(assert)],
        done
      );
    });

    it('sets the correct base when [ ] in glob', function (done) {
      var expected = {
        cwd: dir,
        base: dir + '/fixtures/has [brackets]',
        path: dir + '/fixtures/has [brackets]/test.foo',
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline(
        [
          globStream('./fixtures/has \\[brackets\\]/*.foo', { cwd: dir }),
          concat(assert),
        ],
        done
      );
    });

    it('emits all objects (unordered) when given multiple paths and specified base', function (done) {
      var base = dir + '/fixtures';

      var expected = [
        {
          cwd: base,
          base: base,
          path: base + '/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt',
        },
        {
          cwd: base,
          base: base,
          path: base + '/test.coffee',
        },
        {
          cwd: base,
          base: base,
          path: base + '/whatsgoingon/test.js',
        },
      ];

      var paths = [
        './whatsgoingon/hey/isaidhey/whatsgoingon/test.txt',
        './test.coffee',
        './whatsgoingon/test.js',
      ];

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(3);
        expect(pathObjs).toContainEqual(expected[0]);
        expect(pathObjs).toContainEqual(expected[1]);
        expect(pathObjs).toContainEqual(expected[2]);
      }

      stream.pipeline(
        [globStream(paths, { cwd: base, base: base }), concat(assert)],
        done
      );
    });

    it('emits all objects (unordered) when given multiple paths and cwdbase', function (done) {
      var base = dir + '/fixtures';

      var expected = [
        {
          cwd: base,
          base: base,
          path: base + '/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt',
        },
        {
          cwd: base,
          base: base,
          path: base + '/test.coffee',
        },
        {
          cwd: base,
          base: base,
          path: base + '/whatsgoingon/test.js',
        },
      ];

      var paths = [
        './whatsgoingon/hey/isaidhey/whatsgoingon/test.txt',
        './test.coffee',
        './whatsgoingon/test.js',
      ];

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(3);
        expect(pathObjs).toContainEqual(expected[0]);
        expect(pathObjs).toContainEqual(expected[1]);
        expect(pathObjs).toContainEqual(expected[2]);
      }

      stream.pipeline(
        [globStream(paths, { cwd: base, cwdbase: true }), concat(assert)],
        done
      );
    });

    it('emits all objects (unordered) when given multiple globs with globstars', function (done) {
      var expected = [
        {
          cwd: dir,
          base: dir + '/fixtures',
          path:
            dir + '/fixtures/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt',
        },
        {
          cwd: dir,
          base: dir + '/fixtures',
          path: dir + '/fixtures/test.coffee',
        },
        {
          cwd: dir,
          base: dir + '/fixtures',
          path: dir + '/fixtures/whatsgoingon/test.js',
        },
        {
          cwd: dir,
          base: dir + '/fixtures',
          path: dir + '/fixtures/has (parens)/test.dmc',
        },
        {
          cwd: dir,
          base: dir + '/fixtures',
          path: dir + '/fixtures/stuff/test.dmc',
        },
        {
          cwd: dir,
          base: dir + '/fixtures',
          path: dir + '/fixtures/symlinks/symlink-dest/test.js',
        },
        {
          cwd: dir,
          base: dir + '/fixtures',
          path:
            dir +
            '/fixtures/symlinks/symlink-dest/hey/isaidhey/whatsgoingon/test.txt',
        },
      ];

      var globs = [
        './fixtures/**/test.txt',
        './fixtures/**/test.coffee',
        './fixtures/**/test.js',
        './fixtures/**/test.dmc',
      ];

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(7);
        expect(pathObjs).toContainEqual(expected[0]);
        expect(pathObjs).toContainEqual(expected[1]);
        expect(pathObjs).toContainEqual(expected[2]);
        expect(pathObjs).toContainEqual(expected[3]);
        expect(pathObjs).toContainEqual(expected[4]);
        expect(pathObjs).toContainEqual(expected[5]);
        expect(pathObjs).toContainEqual(expected[6]);
      }

      stream.pipeline([globStream(globs, { cwd: dir }), concat(assert)], done);
    });

    // By default, we only run this in non-Windows CI since it takes so long
    it('does not stack overflow if there are an insane amount of files', function (done) {
      if (process.env.CI !== "true" || os.platform() ===  'win32') {
        this.skip();
      }

      this.timeout(0);
      var largeDir = path.join(dir, 'fixtures/too-many');
      fs.mkdirSync(largeDir, { recursive: true });

      for (var i = 0; i < 100000; i++) {
        fs.writeFileSync(path.join(largeDir, 'file-' + i + '.txt'), "test-" + i)
      }

      function assert(pathObjs) {
        for (var i = 0; i < 100000; i++) {
          fs.unlinkSync(path.join(largeDir, 'file-' + i + '.txt'))
        }
        fs.rmdirSync(largeDir);

        expect(pathObjs.length).toEqual(100000);
      }

      var glob = deWindows(largeDir) + '/*.txt';

      stream.pipeline([globStream(glob), concat(assert)], done);
    });

    it('emits all objects (unordered) when given multiple absolute paths and no cwd', function (done) {
      var testFile = path.join(os.tmpdir(), 'glob-stream-test.txt');
      fs.writeFileSync(testFile, 'test');

      var tmp = deWindows(os.tmpdir());

      var expected = [
        {
          cwd: cwd,
          base: dir + '/fixtures/whatsgoingon/hey/isaidhey/whatsgoingon',
          path:
            dir + '/fixtures/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt',
        },
        {
          cwd: cwd,
          base: dir + '/fixtures',
          path: dir + '/fixtures/test.coffee',
        },
        {
          cwd: cwd,
          base: dir + '/fixtures/whatsgoingon',
          path: dir + '/fixtures/whatsgoingon/test.js',
        },
        {
          cwd: cwd,
          base: tmp,
          path: tmp + '/glob-stream-test.txt',
        }
      ];

      var paths = [
        dir + '/fixtures/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt',
        dir + '/fixtures/test.coffee',
        dir + '/fixtures/whatsgoingon/test.js',
        tmp + '/glob-stream-*.txt',
      ];

      function assert(pathObjs) {
        fs.unlinkSync(testFile, 'test');
        expect(pathObjs.length).toEqual(4);
        expect(pathObjs).toContainEqual(expected[0]);
        expect(pathObjs).toContainEqual(expected[1]);
        expect(pathObjs).toContainEqual(expected[2]);
        expect(pathObjs).toContainEqual(expected[3]);
      }

      stream.pipeline([globStream(paths), concat(assert)], done);
    });

    it('resolves globs when process.chdir() changes the cwd', function (done) {
      var prevCwd = process.cwd();
      process.chdir('test/fixtures/stuff');

      var expected = {
        cwd: dir + '/fixtures/stuff',
        base: dir + '/fixtures',
        path: dir + '/fixtures/test.coffee',
      };

      function assert(pathObjs) {
        process.chdir(prevCwd);

        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline([globStream(['../*.coffee']), concat(assert)], done);
    });

    // https://github.com/gulpjs/glob-stream/issues/129
    it('does not take a long time when when checking a singular glob in the project root', function (done) {
      // Extremely short timeout to ensure we aren't traversing node_modules
      this.timeout(20);

      var expected = {
        cwd: cwd,
        base: cwd,
        path: cwd + '/package.json',
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline([globStream(['./package.json']), concat(assert)], done);
    });

    it('removes duplicate objects from the stream using default (path) filter', function (done) {
      var expected = {
        cwd: dir,
        base: dir + '/fixtures',
        path: dir + '/fixtures/test.coffee',
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline(
        [
          globStream(['./fixtures/test.coffee', './fixtures/*.coffee'], {
            cwd: dir,
          }),
          concat(assert),
        ],
        done
      );
    });

    it('removes duplicate objects from the stream using custom string filter', function (done) {
      var expected = {
        cwd: dir,
        base: dir + '/fixtures/stuff',
        path: dir + '/fixtures/stuff/run.dmc',
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline(
        [
          globStream(
            ['./fixtures/stuff/run.dmc', './fixtures/stuff/test.dmc'],
            {
              cwd: dir,
              uniqueBy: 'base',
            }
          ),
          concat(assert),
        ],
        done
      );
    });

    it('removes duplicate objects from the stream using custom function filter', function (done) {
      var expected = [
        {
          cwd: dir,
          base: dir + '/fixtures/stuff',
          path: dir + '/fixtures/stuff/run.dmc',
        },
        {
          cwd: dir,
          base: dir + '/fixtures/stuff',
          path: dir + '/fixtures/stuff/test.dmc',
        },
      ];

      var uniqueBy = function (data) {
        return data.path;
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(2);
        expect(pathObjs).toContainEqual(expected[0]);
        expect(pathObjs).toContainEqual(expected[1]);
      }

      stream.pipeline(
        [
          globStream('./fixtures/stuff/*.dmc', {
            cwd: dir,
            uniqueBy: uniqueBy,
          }),
          concat(assert),
        ],
        done
      );
    });

    it('ignores dotfiles without dot option', function (done) {
      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(0);
      }

      stream.pipeline(
        [globStream('./fixtures/*swag', { cwd: dir }), concat(assert)],
        done
      );
    });

    it('finds dotfiles with dot option', function (done) {
      var expected = {
        cwd: dir,
        base: dir + '/fixtures',
        path: dir + '/fixtures/.swag',
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline(
        [
          globStream('./fixtures/*swag', { cwd: dir, dot: true }),
          concat(assert),
        ],
        done
      );
    });

    it('removes dotfiles that match negative globs with dot option', function (done) {
      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(0);
      }

      stream.pipeline(
        [
          globStream(['./fixtures/*swag', '!./fixtures/**'], {
            cwd: dir,
            dot: true,
          }),
          concat(assert),
        ],
        done
      );
    });

    it('works with direct paths and no cwd', function (done) {
      var expected = {
        cwd: cwd,
        base: dir + '/fixtures',
        path: dir + '/fixtures/test.coffee',
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline(
        [globStream(dir + '/fixtures/test.coffee'), concat(assert)],
        done
      );
    });

    it('works with a relative cwd', function (done) {
      var expected = {
        cwd: cwd + '/test',
        base: dir + '/fixtures',
        path: dir + '/fixtures/test.coffee',
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline(
        [
          globStream(dir + '/fixtures/test.coffee', {
            cwd: path.relative(process.cwd(), __dirname),
          }),
          concat(assert),
        ],
        done
      );
    });

    it('supports negative globs', function (done) {
      var expected = {
        cwd: cwd,
        base: dir + '/fixtures/stuff',
        path: dir + '/fixtures/stuff/run.dmc',
      };

      var globs = [
        dir + '/fixtures/stuff/*.dmc',
        '!' + dir + '/fixtures/stuff/*test.dmc',
      ];

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline([globStream(globs), concat(assert)], done);
    });

    it('supports negative file paths', function (done) {
      var expected = {
        cwd: cwd,
        base: dir + '/fixtures/stuff',
        path: dir + '/fixtures/stuff/run.dmc',
      };

      var paths = [
        dir + '/fixtures/stuff/*.dmc',
        '!' + dir + '/fixtures/stuff/test.dmc',
      ];

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline([globStream(paths), concat(assert)], done);
    });

    it('does not error when a negative glob removes all matches from a positive glob', function (done) {
      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(0);
      }

      stream.pipeline(
        [
          globStream(['./fixtures/**/*.js', '!./**/test.js'], { cwd: dir }),
          concat(assert),
        ],
        done
      );
    });

    it('applies all negative globs to each positive glob', function (done) {
      var globs = [
        './fixtures/stuff/*',
        '!./fixtures/stuff/*.dmc',
        './fixtures/stuff/*.dmc',
      ];

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(0);
      }

      stream.pipeline([globStream(globs, { cwd: dir }), concat(assert)], done);
    });

    it('throws on invalid glob argument', function (done) {
      expect(globStream.bind(globStream, 42, { cwd: dir })).toThrow(
        /Invalid glob .* 0/
      );
      expect(globStream.bind(globStream, ['.', 42], { cwd: dir })).toThrow(
        /Invalid glob .* 1/
      );
      done();
    });

    it('throws on missing positive glob', function (done) {
      expect(globStream.bind(globStream, '!c', { cwd: dir })).toThrow(
        /Missing positive glob/
      );
      expect(globStream.bind(globStream, ['!a', '!b'], { cwd: dir })).toThrow(
        /Missing positive glob/
      );
      done();
    });

    it('emits an error when file not found on singular path', function (done) {
      function assert(err) {
        expect(err.toString()).toMatch(/File not found with singular glob/);
        done();
      }

      stream.pipeline([globStream('notfound'), concat()], assert);
    });

    it('does not emit an error when file not found on glob containing {}', function (done) {
      function assert(err) {
        expect(err).not.toEqual(expect.anything());
        done();
      }

      stream.pipeline([globStream('notfound{a,b}'), concat()], assert);
    });

    it('does not emit an error on singular path when allowEmpty is true', function (done) {
      function assert(err) {
        expect(err).not.toEqual(expect.anything());
        done();
      }

      stream.pipeline(
        [globStream('notfound', { allowEmpty: true }), concat()],
        assert
      );
    });

    it('emits an error when a singular path in multiple paths not found', function (done) {
      function assert(err) {
        expect(err).toEqual(expect.anything());
        expect(err.toString()).toMatch(/File not found with singular glob/);
        done();
      }

      stream.pipeline(
        [
          globStream(['notfound', './fixtures/whatsgoingon'], { cwd: dir }),
          concat(),
        ],
        assert
      );
    });

    it('emits an error when a singular path in multiple paths/globs not found', function (done) {
      function assert(err) {
        expect(err.toString()).toMatch(/File not found with singular glob/);
        done();
      }

      stream.pipeline(
        [
          globStream(['notfound', './fixtures/*.coffee'], { cwd: dir }),
          concat(),
        ],
        assert
      );
    });

    it('resolves absolute paths when root option is given', function (done) {
      var expected = {
        cwd: cwd,
        base: dir + '/fixtures',
        path: dir + '/fixtures/test.coffee',
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(1);
        expect(pathObjs[0]).toEqual(expected);
      }

      stream.pipeline(
        [
          globStream('/test.coffee', { root: dir + '/fixtures' }),
          concat(assert),
        ],
        done
      );
    });

    it('traverses symlinked directories', function (done) {
      var expected = [
        {
          cwd: dir,
          base: dir + '/fixtures/symlinks',
          path: dir + '/fixtures/symlinks/file-a.txt',
        },
        {
          cwd: dir,
          base: dir + '/fixtures/symlinks',
          path:
            dir +
            '/fixtures/symlinks/symlink-dest/hey/isaidhey/whatsgoingon/test.txt',
        },
        {
          cwd: dir,
          base: dir + '/fixtures/symlinks',
          path: dir + '/fixtures/symlinks/folder-a/folder-a-file.txt',
        },
        {
          cwd: dir,
          base: dir + '/fixtures/symlinks',
          path: dir + '/fixtures/symlinks/folder-b/folder-b-file.txt',
        },
        // It should follow these circular symlinks, but not infinitely
        {
          cwd: dir,
          base: dir + '/fixtures/symlinks',
          path: dir + '/fixtures/symlinks/folder-a/link-to-b/folder-b-file.txt',
        },
        {
          cwd: dir,
          base: dir + '/fixtures/symlinks',
          path: dir + '/fixtures/symlinks/folder-b/link-to-a/folder-a-file.txt',
        },
      ];

      function assert(pathObjs) {
        expect(pathObjs.length).toBe(6);
        expect(pathObjs).toContainEqual(expected[0]);
        expect(pathObjs).toContainEqual(expected[1]);
        expect(pathObjs).toContainEqual(expected[2]);
        expect(pathObjs).toContainEqual(expected[3]);
        expect(pathObjs).toContainEqual(expected[4]);
        expect(pathObjs).toContainEqual(expected[5]);
      }

      stream.pipeline(
        [
          globStream(['./fixtures/symlinks/**/*.txt'], { cwd: dir }),
          concat(assert),
        ],
        done
      );
    });

    it('does not end prematurely', function (done) {
      var gs = globStream(['./non-existent-file'], { cwd: dir, allowEmpty: true });

      function setup() {
        stream.pipeline(
          [
            gs,
            concat(),
          ],
          done
        );
      }

      setTimeout(setup, 10);
    });
  });

  describe('options', function () {
    it('avoids mutation of options', function (done) {
      var defaultedOpts = {
        cwd: process.cwd(),
        dot: false,
        cwdbase: false,
      };

      var opts = {};

      var gs = globStream(dir + '/fixtures/stuff/run.dmc', opts);
      expect(Object.keys(opts).length).toEqual(0);
      expect(opts).not.toEqual(defaultedOpts);

      stream.pipeline([gs, concat()], done);
    });

    it('throws on invalid options', function (done) {
      expect(function () {
        globStream('./fixtures/stuff/*.dmc', { cwd: 1234 });
      }).toThrow('must be a string');
      expect(function () {
        globStream('./fixtures/stuff/*.dmc', { dot: 1234 });
      }).toThrow('must be a boolean');
      expect(function () {
        globStream('./fixtures/stuff/*.dmc', { cwdbase: 1234 });
      }).toThrow('must be a boolean');
      expect(function () {
        globStream('./fixtures/stuff/*.dmc', { uniqueBy: 1234 });
      }).toThrow('must be a string or function');
      expect(function () {
        globStream('./fixtures/stuff/*.dmc', { allowEmpty: 1234 });
      }).toThrow('must be a boolean');
      expect(function () {
        globStream('./fixtures/stuff/*.dmc', { base: 1234 });
      }).toThrow('must be a string if specified');
      expect(function () {
        globStream('./fixtures/stuff/*.dmc', { ignore: 1234 });
      }).toThrow('must be a string or array');

      done();
    });

    describe('ignore', function () {
      it('accepts a string (in addition to array)', function (done) {
        var expected = {
          cwd: dir,
          base: dir + '/fixtures/stuff',
          path: dir + '/fixtures/stuff/run.dmc',
        };

        function assert(pathObjs) {
          expect(pathObjs.length).toEqual(1);
          expect(pathObjs[0]).toEqual(expected);
        }

        stream.pipeline(
          [
            globStream('./fixtures/stuff/*.dmc', {
              cwd: dir,
              ignore: './fixtures/stuff/test.dmc',
            }),
            concat(assert),
          ],
          done
        );
      });

      it('supports the ignore option instead of negation', function (done) {
        var expected = {
          cwd: dir,
          base: dir + '/fixtures/stuff',
          path: dir + '/fixtures/stuff/run.dmc',
        };

        function assert(pathObjs) {
          expect(pathObjs.length).toEqual(1);
          expect(pathObjs[0]).toEqual(expected);
        }

        stream.pipeline(
          [
            globStream('./fixtures/stuff/*.dmc', {
              cwd: dir,
              ignore: ['./fixtures/stuff/test.dmc'],
            }),
            concat(assert),
          ],
          done
        );
      });

      it('supports the ignore option with dot option', function (done) {
        function assert(pathObjs) {
          expect(pathObjs.length).toEqual(0);
        }

        stream.pipeline(
          [
            globStream('./fixtures/*swag', {
              cwd: dir,
              dot: true,
              ignore: ['./fixtures/**'],
            }),
            concat(assert),
          ],
          done
        );
      });

      it('can use both ignore option and negative globs', function (done) {
        var globs = ['./fixtures/stuff/*.dmc', '!./fixtures/stuff/test.dmc'];

        function assert(pathObjs) {
          expect(pathObjs.length).toEqual(0);
        }

        stream.pipeline(
          [
            globStream(globs, {
              cwd: dir,
              ignore: ['./fixtures/stuff/run.dmc'],
            }),
            concat(assert),
          ],
          done
        );
      });
    });

    it('emits an error if there are no matches', function (done) {
      function assert(err) {
        expect(err.message).toMatch(/^File not found with singular glob/g);
        done();
      }

      stream.pipeline([globStream('notfound', { cwd: dir }), concat()], assert);
    });

    it('throws an error if you try to write to it', function (done) {
      var gs = globStream('notfound', { cwd: dir });
      gs.on('error', function () {});

      try {
        gs.write({});
      } catch (err) {
        expect(err).toEqual(expect.anything());
        done();
      }
    });

    it('does not throw an error if you push to it', function (done) {
      var stub = {
        cwd: dir,
        base: dir,
        path: dir,
      };

      var gs = globStream('./fixtures/test.coffee', { cwd: dir });

      gs.push(stub);

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(2);
        expect(pathObjs[0]).toEqual(stub);
      }

      stream.pipeline([gs, concat(assert)], done);
    });

    it('accepts a file path', function (done) {
      var expected = {
        cwd: dir,
        base: dir + '/fixtures',
        path: dir + '/fixtures/test.coffee',
      };

      function assert(pathObjs) {
        expect(pathObjs.length).toBe(1);
        expect(pathObjs[0]).toMatchObject(expected);
      }

      stream.pipeline(
        [globStream('./fixtures/test.coffee', { cwd: dir }), concat(assert)],
        done
      );
    });

    it('accepts a glob', function (done) {
      var expected = [
        {
          cwd: dir,
          base: dir + '/fixtures',
          path: dir + '/fixtures/has (parens)/test.dmc',
        },
        {
          cwd: dir,
          base: dir + '/fixtures',
          path: dir + '/fixtures/stuff/run.dmc',
        },
        {
          cwd: dir,
          base: dir + '/fixtures',
          path: dir + '/fixtures/stuff/test.dmc',
        },
      ];

      function assert(pathObjs) {
        expect(pathObjs.length).toBe(3);
        expect(pathObjs).toContainEqual(expected[0]);
        expect(pathObjs).toContainEqual(expected[1]);
        expect(pathObjs).toContainEqual(expected[2]);
      }

      stream.pipeline(
        [globStream('./fixtures/**/*.dmc', { cwd: dir }), concat(assert)],
        done
      );
    });

    it('pauses the globber upon backpressure', function (done) {
      var gs = globStream('./fixtures/**/*.dmc', {
        cwd: dir,
        highWaterMark: 1,
      });

      function waiter(pathObj, _, cb) {
        setTimeout(function () {
          cb(null, pathObj);
        }, 500);
      }

      function assert(pathObjs) {
        expect(pathObjs.length).toEqual(3);
      }

      stream.pipeline(
        [
          gs,
          new stream.PassThrough(
            { objectMode: true, highWaterMark: 1 },
            waiter
          ),
          concat(assert),
        ],
        done
      );
    });

    it('destroys the stream with an error if no match is found', function (done) {
      var gs = globStream('notfound', { cwd: dir });

      var spy = sinon.spy(gs, 'destroy');

      function assert(err) {
        sinon.restore();
        expect(spy.getCall(0).args[0]).toBe(err);
        expect(err.toString()).toMatch(/File not found with singular glob/);
        done();
      }

      stream.pipeline([gs, concat()], assert);
    });

    it('destroys the stream with an error if no match is found with multiple singular globs', function (done) {
      var gs = globStream(['notfound', 'notfound2'], { cwd: dir });

      var spy = sinon.spy(gs, 'destroy');

      function assert(err) {
        sinon.restore();
        expect(spy.getCall(0).args[0]).toBe(err);
        expect(err.toString()).toMatch(/File not found with singular glob/);
        done();
      }

      stream.pipeline([gs, concat()], assert);
    });

    it('destroys the stream if walker errors', function (done) {
      var expectedError = new Error('Stubbed error');

      var gs = globStream('./fixtures/**/*.dmc', { cwd: dir });

      function stubError(dirpath, opts, cb) {
        cb(expectedError);
      }

      var spy = sinon.spy(gs, 'destroy');
      sinon.stub(fs, 'readdir').callsFake(stubError);

      function assert(err) {
        sinon.restore();
        expect(spy.called).toEqual(true);
        expect(err).toBe(expectedError);
        done();
      }

      stream.pipeline([gs, concat()], assert);
    });

    it('destroys the stream if walker errors when following symlink', function (done) {
      var expectedError = new Error('Stubbed error');

      var gs = globStream('./fixtures/**/*.dmc', { cwd: dir });

      function stubError(dirpath, cb) {
        cb(expectedError);
      }

      var spy = sinon.spy(gs, 'destroy');
      sinon.stub(fs, 'stat').callsFake(stubError);

      function assert(err) {
        sinon.restore();
        expect(spy.called).toEqual(true);
        expect(err).toBe(expectedError);
        done();
      }

      stream.pipeline([gs, concat()], assert);
    });

    it('does not emit an error if stream is destroyed without an error', function (done) {
      var gs = globStream('./fixtures/**/*.dmc', { cwd: dir });

      var spy = sinon.spy();

      gs.on('error', spy);

      gs.on('close', function () {
        sinon.restore();
        expect(spy.called).toEqual(false);
        done();
      });

      gs.destroy();
    });

    it('handles tons of files with double-star glob', function (done) {
      this.timeout(10000);

      var gs = globStream('./node_modules/**/LICENSE', {
        cwd: path.resolve(__dirname, '../'),
      });

      function assert(results) {
        expect(results.length).toBeGreaterThan(16);
      }

      stream.pipeline([gs, concat(assert)], done);
    });

    it('handles tons of files with single-star glob', function (done) {
      this.timeout(10000);

      var gs = globStream('./node_modules/*', {
        cwd: path.resolve(__dirname, '../'),
      });

      function assert(results) {
        expect(results.length).toBeGreaterThan(16);
      }

      stream.pipeline([gs, concat(assert)], done);
    });
  });
}

suite('stream');
suite('streamx');
suite('readable-stream');
