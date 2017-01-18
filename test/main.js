'use strict';

var path = require('path');
var through2 = require('through2');
var expect = require('expect');
var globStream = require('../');

function deWindows(p) {
  return p.replace(/\\/g, '/');
}

var dir = deWindows(__dirname);

describe('glob-stream', function() {
  it('should return a folder name stream from a glob', function(done) {
    var stream = globStream('./fixtures/whatsgoingon', { cwd: dir });
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      expect(file.base).toExist();
      expect(file.cwd).toExist();
      expect(String(file.cwd)).toBe(dir);
      expect(String(file.base)).toBe(dir + '/fixtures');
      expect(String(file.path)).toBe(dir + '/fixtures/whatsgoingon');
      done();
    });
  });

  it('should return only folder name stream from a glob', function(done) {
    var folderCount = 0;
    var stream = globStream('./fixtures/whatsgoingon/*/', { cwd: dir });
    stream.on('error', function(err) {
      throw err;
    });
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      expect(String(file.path)).toBe(dir + '/fixtures/whatsgoingon/hey');
      folderCount++;
    });
    stream.on('end', function() {
      expect(folderCount).toBe(1);
      done();
    });
  });

  it('should return a file name stream from a glob', function(done) {
    var stream = globStream('./fixtures/*.coffee', { cwd: dir });
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      expect(file.base).toExist();
      expect(file.cwd).toExist();
      expect(String(file.cwd)).toBe(dir);
      expect(String(file.base)).toBe(dir + '/fixtures');
      expect(String(file.path)).toBe(dir + '/fixtures/test.coffee');
      done();
    });
  });

  it('should handle ( ) in directory paths', function(done) {
    var cwd = dir + '/fixtures/has (parens)';
    var stream = globStream('*.dmc', { cwd: cwd });
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      expect(file.base).toExist();
      expect(file.cwd).toExist();
      expect(String(file.cwd)).toBe(cwd);
      expect(String(file.base)).toBe(cwd);
      expect(String(file.path)).toBe(cwd + '/test.dmc');
      done();
    });
  });

  it('should set the correct base when ( ) in glob', function(done) {
    var stream = globStream('./fixtures/has (parens)/*.dmc', { cwd: dir });
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      expect(file.base).toExist();
      expect(file.cwd).toExist();
      expect(String(file.cwd)).toBe(dir);
      expect(String(file.base)).toBe(dir + '/fixtures/has (parens)');
      expect(String(file.path)).toBe(dir + '/fixtures/has (parens)/test.dmc');
      done();
    });
  });

  it('should find files in paths that contain ( )', function(done) {
    var stream = globStream('./fixtures/**/*.dmc', { cwd: dir });
    var files = [];
    stream.on('error', done);
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      files.push(file);
    });
    stream.on('end', function() {
      expect(files.length).toBe(3);
      expect(path.basename(files[0].path)).toBe('test.dmc');
      expect(files[0].path).toBe(dir + '/fixtures/has (parens)/test.dmc');
      expect(path.basename(files[1].path)).toBe('run.dmc');
      expect(files[1].path).toBe(dir + '/fixtures/stuff/run.dmc');
      expect(path.basename(files[2].path)).toBe('test.dmc');
      expect(files[2].path).toBe(dir + '/fixtures/stuff/test.dmc');
      done();
    });
  });

  it('should return a file name stream from a glob and respect state', function(done) {
    var stream = globStream('./fixtures/stuff/*.dmc', { cwd: dir });
    var wrapper = stream.pipe(through2.obj(function(data, enc, cb) {
      this.pause();
      setTimeout(function() {
        this.push(data);
        cb();
        this.resume();
      }.bind(this), 500);
    }));

    var count = 0;

    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    wrapper.on('data', function() {
      count++;
    });
    wrapper.on('end', function() {
      expect(count).toBe(2);
      done();
    });
  });

  it('should return a correctly ordered file name stream for two globs and specified base', function(done) {
    var baseDir = dir + '/fixtures';

    var globArray = [
      './whatsgoingon/hey/isaidhey/whatsgoingon/test.txt',
      './test.coffee',
      './whatsgoingon/test.js',
    ];
    var stream = globStream(globArray, { cwd: baseDir, base: baseDir });

    stream.on('error', done);
    stream.on('data', function(file) {
      expect(file).toExist().toExist();
      expect(file.base).toExist().toExist();
      expect(file.base).toBe(baseDir);
    });
    stream.on('end', function() {
      done();
    });
  });

  it('should return a correctly ordered file name stream for two globs and cwdbase', function(done) {
    var baseDir = dir + '/fixtures';

    var globArray = [
      './whatsgoingon/hey/isaidhey/whatsgoingon/test.txt',
      './test.coffee',
      './whatsgoingon/test.js',
    ];
    var stream = globStream(globArray, { cwd: baseDir, cwdbase: true });

    stream.on('error', done);
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.base).toExist();
      expect(file.base).toBe(baseDir);
    });
    stream.on('end', function() {
      done();
    });
  });

  it('should return a file name stream that does not duplicate', function(done) {
    var stream = globStream(['./fixtures/test.coffee', './fixtures/test.coffee'], { cwd: dir });
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      expect(file.base).toExist();
      expect(file.cwd).toExist();
      expect(String(file.cwd)).toBe(dir);
      expect(String(file.base)).toBe(dir + '/fixtures');
      expect(String(file.path)).toBe(dir + '/fixtures/test.coffee');
      done();
    });
  });

  it('should return a file name stream that does not duplicate when piped twice', function(done) {
    var stream = globStream('./fixtures/test.coffee', { cwd: dir });
    var stream2 = globStream('./fixtures/test.coffee', { cwd: dir });
    stream2.pipe(stream);

    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      expect(file.base).toExist();
      expect(file.cwd).toExist();
      expect(String(file.cwd)).toBe(dir);
      expect(String(file.base)).toBe(dir + '/fixtures');
      expect(String(file.path)).toBe(dir + '/fixtures/test.coffee');
      done();
    });
  });


  it('should return a file name stream from a direct path', function(done) {
    var stream = globStream('./fixtures/test.coffee', { cwd: dir });
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      expect(file.base).toExist();
      expect(file.cwd).toExist();
      expect(String(file.cwd)).toBe(dir);
      expect(String(file.base)).toBe(dir + '/fixtures');
      expect(String(file.path)).toBe(dir + '/fixtures/test.coffee');
      done();
    });
  });

  it('should not return a file name stream with dotfiles without dot option', function(done) {
    var stream = globStream('./fixtures/*swag', { cwd: dir });
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.once('data', function() {
      throw new Error('It matched!');
    });
    stream.once('end', done);
  });

  it('should return a file name stream with dotfiles with dot option', function(done) {
    var stream = globStream('./fixtures/*swag', { cwd: dir, dot: true });
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.once('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      expect(file.base).toExist();
      expect(file.cwd).toExist();
      expect(String(file.cwd)).toBe(dir);
      expect(String(file.base)).toBe(dir + '/fixtures');
      expect(String(file.path)).toBe(dir + '/fixtures/.swag');
      done();
    });
  });

  it('should return a file name stream with dotfiles negated', function(done) {
    var stream = globStream(['./fixtures/*swag', '!./fixtures/**'], { cwd: dir, dot: true });
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.once('data', function() {
      throw new Error('It matched!');
    });
    stream.once('end', done);
  });

  it('should return a file name stream from a direct path and pause/buffer items', function(done) {
    var stream = globStream('./fixtures/test.coffee', { cwd: dir });
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      expect(file.base).toExist();
      expect(file.cwd).toExist();
      expect(String(file.cwd)).toBe(dir);
      expect(String(file.base)).toBe(dir + '/fixtures');
      expect(String(file.path)).toBe(dir + '/fixtures/test.coffee');
      done();
    });
    stream.pause();
    setTimeout(function() {
      stream.resume();
    }, 1000);
  });

  it('should not fuck up direct paths with no cwd', function(done) {
    var stream = globStream(dir + '/fixtures/test.coffee');
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      expect(file.base).toExist();
      expect(file.cwd).toExist();
      expect(String(file.cwd)).toBe(process.cwd());
      expect(String(file.base)).toBe(dir + '/fixtures');
      expect(String(file.path)).toBe(dir + '/fixtures/test.coffee');
      done();
    });
  });

  it('should return a correctly ordered file name stream for three globs with globstars', function(done) {
    var globArray = [
      dir + '/fixtures/**/test.txt',
      dir + '/fixtures/**/test.coffee',
      dir + '/fixtures/**/test.js',
      dir + '/fixtures/**/test.dmc',
    ];
    var stream = globStream(globArray, { cwd: dir });

    var files = [];
    stream.on('error', done);
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      files.push(file);
    });
    stream.on('end', function() {
      expect(files.length).toBe(5);
      expect(path.basename(files[0].path)).toBe('test.txt');
      expect(path.basename(files[1].path)).toBe('test.coffee');
      expect(path.basename(files[2].path)).toBe('test.js');
      expect(path.basename(files[3].path)).toBe('test.dmc');
      expect(path.basename(files[4].path)).toBe('test.dmc');
      done();
    });
  });

  it('should return a correctly ordered file name stream for two globs', function(done) {
    var globArray = [
      dir + '/fixtures/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt',
      dir + '/fixtures/test.coffee',
      dir + '/fixtures/whatsgoingon/test.js',
    ];
    var stream = globStream(globArray, { cwd: dir });

    var files = [];
    stream.on('error', done);
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      files.push(file);
    });
    stream.on('end', function() {
      expect(files.length).toBe(3);
      expect(files[0].path).toBe(globArray[0]);
      expect(files[1].path).toBe(globArray[1]);
      expect(files[2].path).toBe(globArray[2]);
      done();
    });
  });

  it('should return a correctly ordered file name stream for two globs and custom base', function(done) {
      var baseDir = dir + '/fixtures';

      var globArray = [
        './whatsgoingon/hey/isaidhey/whatsgoingon/test.txt',
        './test.coffee',
        './whatsgoingon/test.js',
      ];
      var stream = globStream(globArray, { cwd: baseDir, cwdbase: true });

      stream.on('error', done);
      stream.on('data', function(file) {
        expect(file).toExist();
        expect(file.base).toExist();
        expect(file.base).toBe(baseDir);
      });
      stream.on('end', function() {
        done();
      });
    });

  it('should return a input stream for multiple globs, with negation (globbing)', function(done) {
    var expectedPath = dir + '/fixtures/stuff/run.dmc';
    var globArray = [
      dir + '/fixtures/stuff/*.dmc',
      '!' + dir + '/fixtures/stuff/test.dmc',
    ];
    var stream = globStream(globArray);

    var files = [];
    stream.on('error', done);
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      files.push(file);
    });
    stream.on('end', function() {
      expect(files.length).toBe(1);
      expect(files[0].path).toBe(expectedPath);
      done();
    });
  });

  it('should return a input stream for multiple globs, with negation (direct)', function(done) {
    var expectedPath = dir + '/fixtures/stuff/run.dmc';
    var globArray = [
      dir + '/fixtures/stuff/run.dmc',
      '!' + dir + '/fixtures/stuff/test.dmc',
    ];
    var stream = globStream(globArray);

    var files = [];
    stream.on('error', done);
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      files.push(file);
    });
    stream.on('end', function() {
      expect(files.length).toBe(1);
      expect(files[0].path).toBe(expectedPath);
      done();
    });
  });

  it('should return a input stream that can be piped to other input streams and remove duplicates', function(done) {
    var stream = globStream(dir + '/fixtures/stuff/*.dmc');
    var stream2 = globStream(dir + '/fixtures/stuff/*.dmc');
    var errored = false;

    stream2.pipe(stream);

    var files = [];
    stream.once('error', function(err) {
      errored = true;
      done(err);
    });
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      files.push(file);
    });
    stream.once('end', function() {
      if (errored) {
        return;
      }
      expect(files.length).toBe(2);
      done();
    });
  });

  it('should return a file name stream with negation from a glob', function(done) {
    var stream = globStream(['./fixtures/**/*.js', '!./**/test.js'], { cwd: dir });
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.on('data', function(file) {
      throw new Error('file ' + file.path + ' should have been negated');
    });
    stream.on('end', function() {
      done();
    });
  });

  it('should return a file name stream from two globs and a negative', function(done) {
    var stream = globStream(['./fixtures/*.coffee', './fixtures/whatsgoingon/*.coffee'], { cwd: dir });
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      expect(file.base).toExist();
      expect(file.cwd).toExist();
      expect(String(file.cwd)).toBe(dir);
      expect(String(file.base)).toBe(dir + '/fixtures');
      expect(String(file.path)).toBe(dir + '/fixtures/test.coffee');
      done();
    });
  });

  it('should respect the globs array order', function(done) {
    var stream = globStream(['./fixtures/stuff/*', '!./fixtures/stuff/*.dmc', './fixtures/stuff/run.dmc'], { cwd: dir });
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      expect(file.base).toExist();
      expect(file.cwd).toExist();
      expect(String(file.cwd)).toBe(dir);
      expect(String(file.base)).toBe(dir + '/fixtures/stuff');
      expect(String(file.path)).toBe(dir + '/fixtures/stuff/run.dmc');
      done();
    });
  });

  it('should ignore leading negative globs', function(done) {
    var stream = globStream(['!./fixtures/stuff/*.dmc', './fixtures/stuff/run.dmc'], { cwd: dir });
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      expect(file.base).toExist();
      expect(file.cwd).toExist();
      expect(String(file.cwd)).toBe(dir);
      expect(String(file.base)).toBe(dir + '/fixtures/stuff');
      expect(String(file.path)).toBe(dir + '/fixtures/stuff/run.dmc');
      done();
    });
  });

  it('should throw on invalid glob argument', function(done) {
    expect(globStream.bind(globStream, 42, { cwd: dir })).toThrow(/Invalid glob .* 0/);
    expect(globStream.bind(globStream, ['.', 42], { cwd: dir })).toThrow(/Invalid glob .* 1/);
    done();
  });

  it('should throw on missing positive glob', function(done) {
    expect(globStream.bind(globStream, '!c', { cwd: dir })).toThrow(/Missing positive glob/);
    expect(globStream.bind(globStream, ['!a', '!b'], { cwd: dir })).toThrow(/Missing positive glob/);
    done();
  });

  it('should emit error on singular glob when file not found', function(done) {
    var stream = globStream('notfound');
    expect(stream).toExist();
    stream.on('error', function(err) {
      expect(err).toMatch(/File not found with singular glob/);
      done();
    });
  });

  it('should emit error when a glob in multiple globs not found', function(done) {
    var stream = globStream(['notfound', './fixtures/whatsgoingon'], { cwd: dir });
    expect(stream).toExist();
    stream.on('error', function(err) {
      expect(err).toMatch(/File not found with singular glob/);
      done();
    });
  });

  it('should resolve relative paths when root option is given', function(done) {
    var stream = globStream('./fixtures/test.coffee', { cwd: dir, root: dir + '/fixtures' });
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      expect(file.base).toExist();
      expect(file.cwd).toExist();
      expect(String(file.cwd)).toBe(dir);
      expect(String(file.base)).toBe(dir + '/fixtures');
      expect(String(file.path)).toBe(dir + '/fixtures/test.coffee');
      done();
    });
  });

  it('should resolve absolute paths when root option is given', function(done) {
    var stream = globStream('/test.coffee', { cwd: dir, root: dir + '/fixtures' });
    expect(stream).toExist();
    stream.on('error', function(err) {
      throw err;
    });
    stream.on('data', function(file) {
      expect(file).toExist();
      expect(file.path).toExist();
      expect(file.base).toExist();
      expect(file.cwd).toExist();
      expect(String(file.cwd)).toBe(dir);
      expect(String(file.base)).toBe(dir + '/fixtures');
      expect(String(file.path)).toBe(dir + '/fixtures/test.coffee');
      done();
    });
  });

  it('should not emit error on glob containing {} when not found', function(done) {
    var stream = globStream('notfound{a,b}');
    expect(stream).toExist();
    stream.on('error', function() {
      throw new Error('Error was emitted');
    });

    stream.resume();
    stream.once('end', done);
  });

  it('should not emit error on singular glob when allowEmpty is true', function(done) {
    var stream = globStream('notfound', { allowEmpty: true });
    expect(stream).toExist();
    stream.on('error', function() {
      throw new Error('Error was emitted');
    });

    stream.resume();
    stream.once('end', done);
  });

  it('should pass options to through2', function(done) {
    var stream = globStream(['./fixtures/stuff/run.dmc'], { cwd: dir, objectMode: false });
    expect(stream).toExist();
    stream.on('error', function(err) {
      expect(err).toMatch(/Invalid non-string\/buffer chunk/);
      done();
    });
  });
});

describe('options', function() {

  it('avoids mutation of options', function(done) {

    var defaultedOpts = {
      cwd: process.cwd(),
      dot: false,
      silent: true,
      nonull: false,
      cwdbase: false,
    };

    var opts = {};

    var stream = globStream(dir + '/fixtures/stuff/run.dmc', opts);
    expect(Object.keys(opts).length).toBe(0);
    expect(opts).toNotBe(defaultedOpts);
    stream.on('data', function() {});
    stream.on('end', done);
  });

  describe('ignore', function() {

    it('accepts a string (in addition to array)', function(done) {
      var expectedPath = dir + '/fixtures/stuff/run.dmc';
      var glob = dir + '/fixtures/stuff/*.dmc';
      var stream = globStream(glob, { cwd: dir, ignore: './fixtures/stuff/test.dmc' });

      var files = [];
      stream.on('error', done);
      stream.on('data', function(file) {
        expect(file).toExist();
        expect(file.path).toExist();
        files.push(file);
      });
      stream.on('end', function() {
        expect(files.length).toBe(1);
        expect(files[0].path).toBe(expectedPath);
        done();
      });
    });

    it('should support the ignore option instead of negation', function(done) {
      var expectedPath = dir + '/fixtures/stuff/run.dmc';
      var glob = dir + '/fixtures/stuff/*.dmc';
      var stream = globStream(glob, { cwd: dir, ignore: ['./fixtures/stuff/test.dmc'] });

      var files = [];
      stream.on('error', done);
      stream.on('data', function(file) {
        expect(file).toExist();
        expect(file.path).toExist();
        files.push(file);
      });
      stream.on('end', function() {
        expect(files.length).toBe(1);
        expect(files[0].path).toBe(expectedPath);
        done();
      });
    });

    it('should support the ignore option with dot option', function(done) {
      var stream = globStream('./fixtures/*swag', { cwd: dir, dot: true, ignore: ['./fixtures/**'] });
      expect(stream).toExist();
      stream.on('error', function(err) {
        throw err;
      });
      stream.once('data', function(file) {
        throw new Error('file ' + file.path + ' should have been negated');
      });
      stream.once('end', done);
    });

    it('should merge ignore option and negative globs', function(done) {
      var globArray = [
        './fixtures/stuff/*.dmc',
        '!./fixtures/stuff/test.dmc',
      ];
      var stream = globStream(globArray, { cwd: dir, ignore: ['./fixtures/stuff/run.dmc'] });
      expect(stream).toExist();
      stream.on('error', function(err) {
        throw err;
      });
      stream.once('data', function(file) {
        throw new Error('file ' + file.path + ' should have been negated');
      });
      stream.once('end', done);
    });
  });
});
