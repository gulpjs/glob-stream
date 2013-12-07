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
        String(file.path).should.equal(join(__dirname, "./fixtures/whatsgoingon"));
        String(file.base).should.equal(join(__dirname, "./fixtures"));
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
        String(file.path).should.equal(join(__dirname, "./fixtures/test.coffee"));
        String(file.base).should.equal(join(__dirname, "./fixtures"));
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
        String(file.path).should.equal(join(__dirname, "./fixtures/test.coffee"));
        String(file.base).should.equal(join(__dirname, "./fixtures"));
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

  });
});
