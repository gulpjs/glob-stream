var gs = require('../');
var through2 = require('through2');
var should = require('should');
var path = require('path');
var join = path.join;
var sep = path.sep;

describe('glob-stream', function() {
  describe('create()', function() {
    it('should return a folder name stream from a glob', function(done) {
      var stream = gs.create('./fixtures/whatsgoingon', { cwd: __dirname });
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        should.exist(file.cwd);
        String(file.cwd).should.equal(__dirname);
        String(file.base).should.equal(join(__dirname, 'fixtures' + sep));
        String(join(file.path,'')).should.equal(join(__dirname, './fixtures/whatsgoingon'));
        done();
      });
    });

    it('should return only folder name stream from a glob', function(done) {
      var folderCount = 0;
      var stream = gs.create('./fixtures/whatsgoingon/*/', { cwd: __dirname });
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        String(join(file.path, '')).should.equal(join(__dirname, './fixtures/whatsgoingon/hey/'));
        folderCount++;
      });
      stream.on('end', function() {
        folderCount.should.equal(1);
        done();
      });
    });

    it('should return a file name stream from a glob', function(done) {
      var stream = gs.create('./fixtures/*.coffee', { cwd: __dirname });
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        should.exist(file.cwd);
        String(file.cwd).should.equal(__dirname);
        String(file.base).should.equal(join(__dirname, 'fixtures' + sep));
        String(join(file.path,'')).should.equal(join(__dirname, './fixtures/test.coffee'));
        done();
      });
    });

    it('should handle ( ) in directory paths', function(done) {
      var cwd = join(__dirname, './fixtures/has (parens)');
      var stream = gs.create('*.dmc', { cwd: cwd });
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        should.exist(file.cwd);
        String(file.cwd).should.equal(cwd);
        String(file.base).should.equal(cwd + sep);
        String(join(file.path,'')).should.equal(join(cwd, 'test.dmc'));
        done();
      });
    });

    it('should return a file name stream from a glob and respect state', function(done) {
      var stream = gs.create('./fixtures/stuff/*.dmc', { cwd: __dirname });
      var wrapper = stream.pipe(through2.obj(function(data, enc, cb) {
        this.pause();
        setTimeout(function() {
          this.push(data);
          cb();
          this.resume();
        }.bind(this), 500);
      }));

      var count = 0;

      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      wrapper.on('data', function() {
        count++;
      });
      wrapper.on('end', function() {
        count.should.equal(2);
        done();
      });
    });

    it('should return a correctly ordered file name stream for two globs and specified base', function(done) {
      var baseDir = join(__dirname, './fixtures');

      var globArray = [
        './whatsgoingon/hey/isaidhey/whatsgoingon/test.txt',
        './test.coffee',
        './whatsgoingon/test.js',
      ];
      var stream = gs.create(globArray, { cwd: baseDir, base: baseDir });

      stream.on('error', done);
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.base);
        file.base.should.equal(baseDir);
      });
      stream.on('end', function() {
        done();
      });
    });

    it('should return a correctly ordered file name stream for two globs and cwdbase', function(done) {
      var baseDir = join(__dirname, './fixtures');

      var globArray = [
        './whatsgoingon/hey/isaidhey/whatsgoingon/test.txt',
        './test.coffee',
        './whatsgoingon/test.js',
      ];
      var stream = gs.create(globArray, { cwd: baseDir, cwdbase: true });

      stream.on('error', done);
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.base);
        file.base.should.equal(baseDir);
      });
      stream.on('end', function() {
        done();
      });
    });

    it('should return a file name stream that does not duplicate', function(done) {
      var stream = gs.create(['./fixtures/test.coffee', './fixtures/test.coffee'], { cwd: __dirname });
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        should.exist(file.cwd);
        String(file.cwd).should.equal(__dirname);
        String(file.base).should.equal(join(__dirname, 'fixtures' + sep));
        String(file.path).should.equal(join(__dirname, './fixtures/test.coffee'));
        done();
      });
    });

    it('should return a file name stream that does not duplicate when piped twice', function(done) {
      var stream = gs.create('./fixtures/test.coffee', { cwd: __dirname });
      var stream2 = gs.create('./fixtures/test.coffee', { cwd: __dirname });
      stream2.pipe(stream);

      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        should.exist(file.cwd);
        String(file.cwd).should.equal(__dirname);
        String(file.base).should.equal(join(__dirname, 'fixtures' + sep));
        String(file.path).should.equal(join(__dirname, './fixtures/test.coffee'));
        done();
      });
    });


    it('should return a file name stream from a direct path', function(done) {
      var stream = gs.create('./fixtures/test.coffee', { cwd: __dirname });
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        should.exist(file.cwd);
        String(file.cwd).should.equal(__dirname);
        String(file.base).should.equal(join(__dirname, 'fixtures' + sep));
        String(file.path).should.equal(join(__dirname, './fixtures/test.coffee'));
        done();
      });
    });

    it('should not return a file name stream with dotfiles without dot option', function(done) {
      var stream = gs.create('./fixtures/*swag', { cwd: __dirname });
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.once('data', function() {
        throw new Error('It matched!');
      });
      stream.once('end', done);
    });

    it('should return a file name stream with dotfiles with dot option', function(done) {
      var stream = gs.create('./fixtures/*swag', { cwd: __dirname, dot: true });
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.once('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        should.exist(file.cwd);
        String(file.cwd).should.equal(__dirname);
        String(file.base).should.equal(join(__dirname, 'fixtures' + sep));
        String(file.path).should.equal(join(__dirname, './fixtures/.swag'));
        done();
      });
    });

    it('should return a file name stream with dotfiles negated', function(done) {
      var stream = gs.create(['./fixtures/*swag', '!./fixtures/**'], { cwd: __dirname, dot: true });
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.once('data', function() {
        throw new Error('It matched!');
      });
      stream.once('end', done);
    });

    it('should return a file name stream from a direct path and pause/buffer items', function(done) {
      var stream = gs.create('./fixtures/test.coffee', { cwd: __dirname });
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        should.exist(file.cwd);
        String(file.cwd).should.equal(__dirname);
        String(file.base).should.equal(join(__dirname, 'fixtures' + sep));
        String(file.path).should.equal(join(__dirname, './fixtures/test.coffee'));
        done();
      });
      stream.pause();
      setTimeout(function() {
        stream.resume();
      }, 1000);
    });

    it('should not fuck up direct paths with no cwd', function(done) {
      var stream = gs.create(join(__dirname, './fixtures/test.coffee'));
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        should.exist(file.cwd);
        String(file.cwd).should.equal(process.cwd());
        String(file.base).should.equal(join(__dirname, './fixtures/'));
        String(join(file.path,'')).should.equal(join(__dirname, './fixtures/test.coffee'));
        done();
      });
    });

    it('should return a correctly ordered file name stream for three globs with globstars', function(done) {
      var globArray = [
        join(__dirname, './fixtures/**/test.txt'),
        join(__dirname, './fixtures/**/test.coffee'),
        join(__dirname, './fixtures/**/test.js'),
      ];
      var stream = gs.create(globArray, { cwd: __dirname });

      var files = [];
      stream.on('error', done);
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        files.push(file);
      });
      stream.on('end', function() {
        files.length.should.equal(3);
        path.basename(files[0].path).should.equal('test.txt');
        path.basename(files[1].path).should.equal('test.coffee');
        path.basename(files[2].path).should.equal('test.js');
        done();
      });
    });

    it('should return a correctly ordered file name stream for two globs', function(done) {
      var globArray = [
        join(__dirname, './fixtures/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt'),
        join(__dirname, './fixtures/test.coffee'),
        join(__dirname, './fixtures/whatsgoingon/test.js'),
      ];
      var stream = gs.create(globArray, { cwd: __dirname });

      var files = [];
      stream.on('error', done);
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        files.push(file);
      });
      stream.on('end', function() {
        files.length.should.equal(3);
        files[0].path.should.equal(globArray[0]);
        files[1].path.should.equal(globArray[1]);
        files[2].path.should.equal(globArray[2]);
        done();
      });
    });

    it('should return a correctly ordered file name stream for two globs and custom base', function(done) {
        var baseDir = join(__dirname, './fixtures');

        var globArray = [
          './whatsgoingon/hey/isaidhey/whatsgoingon/test.txt',
          './test.coffee',
          './whatsgoingon/test.js',
        ];
        var stream = gs.create(globArray, { cwd: baseDir, cwdbase: true });

        stream.on('error', done);
        stream.on('data', function(file) {
          should.exist(file);
          should.exist(file.base);
          file.base.should.equal(baseDir);
        });
        stream.on('end', function() {
          done();
        });
      });

    it('should return a input stream for multiple globs, with negation (globbing)', function(done) {
      var expectedPath = join(__dirname, './fixtures/stuff/run.dmc');
      var globArray = [
        join(__dirname, './fixtures/stuff/*.dmc'),
        '!' + join(__dirname, './fixtures/stuff/test.dmc'),
      ];
      var stream = gs.create(globArray);

      var files = [];
      stream.on('error', done);
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        files.push(file);
      });
      stream.on('end', function() {
        files.length.should.equal(1);
        files[0].path.should.equal(expectedPath);
        done();
      });
    });

    it('should return a input stream for multiple globs, with negation (direct)', function(done) {
      var expectedPath = join(__dirname, './fixtures/stuff/run.dmc');
      var globArray = [
        join(__dirname, './fixtures/stuff/run.dmc'),
        '!' + join(__dirname, './fixtures/stuff/test.dmc'),
      ];
      var stream = gs.create(globArray);

      var files = [];
      stream.on('error', done);
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        files.push(file);
      });
      stream.on('end', function() {
        files.length.should.equal(1);
        files[0].path.should.equal(expectedPath);
        done();
      });
    });

    it('should return a input stream that can be piped to other input streams and remove duplicates', function(done) {
      var stream = gs.create(join(__dirname, './fixtures/stuff/*.dmc'));
      var stream2 = gs.create(join(__dirname, './fixtures/stuff/*.dmc'));

      stream2.pipe(stream);

      var files = [];
      stream.on('error', done);
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        files.push(file);
      });
      stream.on('end', function() {
        files.length.should.equal(2);
        done();
      });
    });

    it('should return a file name stream with negation from a glob', function(done) {
      var stream = gs.create(['./fixtures/**/*.js', '!./**/test.js'], { cwd: __dirname });
      should.exist(stream);
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
      var stream = gs.create(['./fixtures/*.coffee', './fixtures/whatsgoingon/*.coffee'], { cwd: __dirname });
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        should.exist(file.cwd);
        String(file.cwd).should.equal(__dirname);
        String(file.base).should.equal(join(__dirname, 'fixtures' + sep));
        String(join(file.path,'')).should.equal(join(__dirname, './fixtures/test.coffee'));
        done();
      });
    });

    it('should respect the globs array order', function(done) {
      var stream = gs.create(['./fixtures/stuff/*', '!./fixtures/stuff/*.dmc', './fixtures/stuff/run.dmc'], { cwd: __dirname });
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        should.exist(file.cwd);
        String(file.cwd).should.equal(__dirname);
        String(file.base).should.equal(join(__dirname, 'fixtures', 'stuff' + sep));
        String(join(file.path,'')).should.equal(join(__dirname, './fixtures/stuff/run.dmc'));
        done();
      });
    });

    it('should ignore leading negative globs', function(done) {
      var stream = gs.create(['!./fixtures/stuff/*.dmc', './fixtures/stuff/run.dmc'], { cwd: __dirname });
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        should.exist(file.cwd);
        String(file.cwd).should.equal(__dirname);
        String(file.base).should.equal(join(__dirname, 'fixtures', 'stuff' + sep));
        String(join(file.path,'')).should.equal(join(__dirname, './fixtures/stuff/run.dmc'));
        done();
      });
    });

    it('should handle RegExps as negative matchers', function(done) {
      var stream = gs.create(['./fixtures/stuff/*.dmc', /run/], { cwd: __dirname });
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        should.exist(file.cwd);
        String(file.cwd).should.equal(__dirname);
        String(file.base).should.equal(join(__dirname, 'fixtures', 'stuff' + sep));
        String(join(file.path,'')).should.equal(join(__dirname, './fixtures/stuff/run.dmc'));
        done();
      });
    });

    it('should throw on invalid glob argument', function() {
      gs.create.bind(gs, 42, { cwd: __dirname }).should.throw(/Invalid glob .* 0/);
      gs.create.bind(gs, ['.', 42], { cwd: __dirname }).should.throw(/Invalid glob .* 1/);
    });

    it('should throw on missing positive glob', function() {
      gs.create.bind(gs, '!c', { cwd: __dirname }).should.throw(/Missing positive glob/);
      gs.create.bind(gs, ['!a', '!b'], { cwd: __dirname }).should.throw(/Missing positive glob/);
    });

    it('should emit error on singular glob when file not found', function(done) {
      var stream = gs.create('notfound');
      should.exist(stream);
      stream.on('error', function(err) {
        err.should.match(/File not found with singular glob/);
        done();
      });
    });

    it('should emit error when a glob in multiple globs not found', function(done) {
      var stream = gs.create(['notfound', './fixtures/whatsgoingon'], { cwd: __dirname });
      should.exist(stream);
      stream.on('error', function(err) {
        err.should.match(/File not found with singular glob/);
        done();
      });
    });

    it('should resolve relative paths when root option is given', function(done) {
      var stream = gs.create('./fixtures/test.coffee', { cwd: __dirname, root: __dirname + '/fixtures' });
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        should.exist(file.cwd);
        String(file.cwd).should.equal(__dirname);
        String(file.base).should.equal(join(__dirname, 'fixtures' + sep));
        String(join(file.path,'')).should.equal(join(__dirname, './fixtures/test.coffee'));
        done();
      });
    });

    it('should resolve absolute paths when root option is given', function(done) {
      var stream = gs.create('/test.coffee', { cwd: __dirname, root: __dirname + '/fixtures' });
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        should.exist(file.cwd);
        String(file.cwd).should.equal(__dirname);
        String(file.base).should.equal(join(__dirname, 'fixtures' + sep));
        String(join(file.path,'')).should.equal(join(__dirname, './fixtures/test.coffee'));
        done();
      });
    });

    it('should not emit error on glob containing {} when not found', function(done) {
      var stream = gs.create('notfound{a,b}');
      should.exist(stream);
      stream.on('error', function() {
        throw new Error('Error was emitted');
      });

      stream.resume();
      stream.once('end', done);
    });

    it('should not emit error on singular glob when allowEmpty is true', function(done) {
      var stream = gs.create('notfound', { allowEmpty: true });
      should.exist(stream);
      stream.on('error', function() {
        throw new Error('Error was emitted');
      });

      stream.resume();
      stream.once('end', done);
    });

    it('should pass options to through2',function(done) {
      var stream = gs.create(['./fixtures/stuff/run.dmc'], { cwd: __dirname, objectMode: false });
      should.exist(stream);
      stream.on('error', function(err) {
        err.should.match(/Invalid non-string\/buffer chunk/);
        done();
      });
    });

  });
});
