var gs = require('../');
var should = require('should');
require('mocha');
var join = require('path').join;

describe('glob-stream', function() {
  describe('create()', function() {
    it('should return a file name stream from a glob', function(done) {
      var stream = gs.create(join(__dirname, "./fixtures/*.coffee"));
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        String(file.path).should.equal(join(__dirname, "./fixtures/test.coffee"));
        String(file.base).should.equal(join(__dirname, "./fixtures/"));
      });
      stream.on('end', function() {
        done();
      });
    });

    it('should return a file name stream from a deep glob', function(done) {
      var stream = gs.create(join(__dirname, "./fixtures/**/*.js"));
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        String(file.path).should.equal(join(__dirname, "./fixtures/whatsgoingon/test.js"));
        String(file.base).should.equal(join(__dirname, "./fixtures/"));
      });
      stream.on('end', function() {
        done();
      });
    });

    it('should return a file name stream with negation from a glob', function(done) {
      var stream = gs.create([join(__dirname, "./fixtures/**/*.js"), "!"+join(__dirname, "./fixtures/**/test.js")]);
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

    it('should return a file name stream with negation from a regex', function(done) {
      var stream = gs.create([join(__dirname, "./fixtures/**/*.js"), /nomatch.js/]);
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

    it('should return a file name stream with negation from a regex', function(done) {
      var stream = gs.create([join(__dirname, "./fixtures/**/*.js"), function(){
        return false;
      }]);
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

    it('should return a file name stream from a direct path', function(done) {
      var stream = gs.create(join(__dirname, "./fixtures/test.coffee"));
      should.exist(stream);
      stream.on('error', function(err) {
        throw err;
      });
      stream.on('data', function(file) {
        should.exist(file);
        should.exist(file.path);
        should.exist(file.base);
        String(file.path).should.equal(join(__dirname, "./fixtures/test.coffee"));
        String(file.base).should.equal(join(__dirname, "./fixtures/"));
      });
      stream.on('end', function() {
        done();
      });
    });

  });
});
