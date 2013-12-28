var gs = require('../');
var should = require('should');
require('mocha');
var path = require('path');
var join = path.join;

var sep = path.sep;

describe('glob-stream', function() {
  describe('create()', function() {
    it('should return a folder name stream from a glob', function(done) {
      var stream = gs.create("./fixtures/whatsgoingon", {cwd: __dirname});
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
        String(file.base).should.equal(join(__dirname, "fixtures"+sep));
        String(join(file.path,'')).should.equal(join(__dirname, "./fixtures/whatsgoingon"));
        done();
      });
    });

    it('should return a file name stream from a glob', function(done) {
      var stream = gs.create("./fixtures/*.coffee", {cwd: __dirname});
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
        String(file.base).should.equal(join(__dirname, "fixtures"+sep));
        String(join(file.path,'')).should.equal(join(__dirname, "./fixtures/test.coffee"));
        done();
      });
    });

    it('should return a correctly ordered file name stream for two globs and fullBase', function(done) {
        var baseDir = join(__dirname, "./fixtures");
        
        var globArray = [
          "./whatsgoingon/key/isaidhey/whatsgoingon/test.txt",
          "./test.coffee",
          "./whatsgoingon/test.js"
        ];
        var stream = gs.create(globArray, {cwd: baseDir, fullBase: true});

        var files = [];
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
      var stream = gs.create(["./fixtures/test.coffee", "./fixtures/test.coffee"], {cwd: __dirname});
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
        String(file.base).should.equal(join(__dirname, "fixtures"+sep));
        String(file.path).should.equal(join(__dirname, "./fixtures/test.coffee"));
        done();
      });
    });

    it('should return a file name stream from a direct path', function(done) {
      var stream = gs.create("./fixtures/test.coffee", {cwd: __dirname});
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
        String(file.base).should.equal(join(__dirname, "fixtures"+sep));
        String(file.path).should.equal(join(__dirname, "./fixtures/test.coffee"));
        done();
      });
    });

    it('should return a file name stream from a direct path and buffer contents', function(done) {
      var stream = gs.create("./fixtures/test.coffee", {cwd: __dirname});
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
        String(file.base).should.equal(join(__dirname, "fixtures"+sep));
        String(file.path).should.equal(join(__dirname, "./fixtures/test.coffee"));
        done();
      });
      stream.pause();
      setTimeout(function(){
        stream.resume();
      }, 1000);
    });

    it('should not fuck up direct paths with no cwd', function(done) {
      var stream = gs.create(join(__dirname, "./fixtures/test.coffee"));
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
        String(file.base).should.equal(join(__dirname, "./fixtures/"));
        String(join(file.path,'')).should.equal(join(__dirname, "./fixtures/test.coffee"));
        done();
      });
    });

    it('should return a correctly ordered file name stream for two globs', function(done) {
      var globArray = [
        join(__dirname, "./fixtures/whatsgoingon/hey/isaidhey/whatsgoingon/test.txt"),
        join(__dirname, "./fixtures/test.coffee"),
        join(__dirname, "./fixtures/whatsgoingon/test.js")
      ];
      var stream = gs.create(globArray, {cwd: __dirname});

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

    it('should return a input stream for multiple globs, with negation (globbing)', function(done) {
      var expectedPath = join(__dirname, "./fixtures/stuff/run.dmc");
      var globArray = [
        join(__dirname, "./fixtures/stuff/*.dmc"),
        '!' + join(__dirname, "./fixtures/stuff/test.dmc"),
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
      var expectedPath = join(__dirname, "./fixtures/stuff/run.dmc");
      var globArray = [
        join(__dirname, "./fixtures/stuff/run.dmc"),
        '!' + join(__dirname, "./fixtures/stuff/test.dmc"),
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

    it('should return a file name stream with negation from a glob', function(done) {
      var stream = gs.create(["./fixtures/**/*.js", "!./**/test.js"], {cwd: __dirname});
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        throw new Error("file "+file.path+" should have been negated");
      });
      stream.on('end', function() {
        done();
      });
    });

    it('should return a file name stream from two globs and a negative', function(done) {
      var stream = gs.create(["./fixtures/*.coffee", "./fixtures/whatsgoingon/*.coffee"], {cwd: __dirname});
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
        String(file.base).should.equal(join(__dirname, "fixtures"+sep));
        String(join(file.path,'')).should.equal(join(__dirname, "./fixtures/test.coffee"));
        done();
      });
    });

  });
});
