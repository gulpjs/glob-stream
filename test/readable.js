'use strict';

var expect = require('expect');
var miss = require('mississippi');

var stream = require('../readable');

function deWindows(p) {
  return p.replace(/\\/g, '/');
}

var pipe = miss.pipe;
var concat = miss.concat;
var through = miss.through;

var dir = deWindows(__dirname);

describe('readable stream', function() {

  it('emits an error if there are no matches', function(done) {
    function assert(err) {
      expect(err.message).toMatch(/^File not found with singular glob/g);
      done();
    }

    pipe([
      stream('notfound', [], { cwd: dir }),
      concat(),
    ], assert);
  });

  it('throws an error if you try to write to it', function(done) {
    var gs = stream('notfound', [], { cwd: dir });

    try {
      gs.write({});
    } catch (err) {
      expect(err).toExist();
      done();
    }
  });

  it('does not throw an error if you push to it', function(done) {
    var stub = {
      cwd: dir,
      base: dir,
      path: dir,
    };

    var gs = stream('./fixtures/test.coffee', [], { cwd: dir });

    gs.push(stub);

    function assert(pathObjs) {
      expect(pathObjs.length).toEqual(2);
      expect(pathObjs[0]).toEqual(stub);
    }

    pipe([
      gs,
      concat(assert),
    ], done);
  });

  it('accepts a file path', function(done) {
    var expected = {
      cwd: dir,
      base: dir + '/fixtures',
      path: dir + '/fixtures/test.coffee',
    };

    function assert(pathObjs) {
      expect(pathObjs.length).toBe(1);
      expect(pathObjs[0]).toMatch(expected);
    }

    pipe([
      stream('./fixtures/test.coffee', [], { cwd: dir }),
      concat(assert),
    ], done);
  });

  it('accepts a glob', function(done) {
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
      expect(pathObjs).toEqual(expected);
    }

    pipe([
      stream('./fixtures/**/*.dmc', [], { cwd: dir }),
      concat(assert),
    ], done);
  });

  it('pauses the globber upon backpressure', function(done) {
    var gs = stream('./fixtures/**/*.dmc', [], { cwd: dir, highWaterMark: 1 });

    var spy = expect.spyOn(gs._globber, 'pause').andCallThrough();

    function waiter(pathObj, _, cb) {
      setTimeout(function() {
        cb(null, pathObj);
      }, 500);
    }

    function assert(pathObjs) {
      expect(pathObjs.length).toEqual(3);
      expect(spy.calls.length).toEqual(2);
      spy.restore();
    }

    pipe([
      gs,
      through.obj({ highWaterMark: 1 }, waiter),
      concat(assert),
    ], done);
  });
});
