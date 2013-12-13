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
        String(file.base).should.equal("fixtures"+sep);
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
        String(file.base).should.equal("fixtures"+sep);
        String(join(file.path,'')).should.equal(join(__dirname, "./fixtures/test.coffee"));
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
        String(file.base).should.equal("fixtures"+sep);
        String(file.path).should.equal(join(__dirname, "./fixtures/test.coffee"));
        done();
      });
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
        join(__dirname, "./fixtures/whatsgoingon/key/isaidhey/whatsgoingon/test.txt"),
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
        files.length.should.equal(2);
        files[0].path.should.equal(globArray[0]);
        files[1].path.should.equal(globArray[1]);
        done();
      });
    });

    it('should return a file name stream with negation from a glob', function(done) {
      var stream = gs.create(["./fixtures/**/*.js", "!./fixtures/**/test.js"], {cwd: __dirname});
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        throw "file should have been negated";
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
        String(file.base).should.equal("fixtures"+sep);
        String(join(file.path,'')).should.equal(join(__dirname, "./fixtures/test.coffee"));
        done();
      });
    });

  });
});
