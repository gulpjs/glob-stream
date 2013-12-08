var gs = require('../');
var should = require('should');
require('mocha');
var join = require('path').join;

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
        String(file.base).should.equal("fixtures/");
        String(file.path).should.equal(join(__dirname, "./fixtures/whatsgoingon"));
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
        String(file.base).should.equal("fixtures/");
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
        String(file.base).should.equal("fixtures/");
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
        String(file.path).should.equal(join(__dirname, "./fixtures/test.coffee"));
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
        String(file.base).should.equal("fixtures/");
        String(file.path).should.equal(join(__dirname, "./fixtures/test.coffee"));
        done();
      });
    });

  });
});
