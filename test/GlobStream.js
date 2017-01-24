var stream = require('../stream');
var expect = require('expect');
var miss = require('mississippi');

var concat = miss.concat;
var finished = miss.finished;
var pipe = miss.pipe;

describe('GlobStream', function() {
  it('emits an error if there are no matches', function(done) {
    var gs = stream(
      './fixtures/whatsgoingon/kojaslkjas.txt',
      [],
      { cwd: __dirname, }
    );

    finished(
      gs,
      function(err) {
        expect(err.message).toMatch(/^File not found with singular glob/g);
        done();
      }
    );
  });

  it('throws an error if you try to write to it', function(done) {
    var gs = stream(
      './fixtures/whatsgoingon/lkasdkl.txt',
      [],
      { cwd: __dirname, }
    );

    try {
      gs.write({});
    } catch (err) {
      expect(err.message).toExist();
      done();
    }
  });

  it('does not throw an error if you try to push to it', function(done) {
    var gs = stream(
      './fixtures/whatsgoingon/lkasdkl.txt',
      [],
      { cwd: __dirname, }
    );

    gs.push({});
    done();
  });

  it('finishes and passes the one matched file to the next pipe', function(done) {
    function assert(files) {
      expect(files.length).toBe(1);
      expect(files[0].path).toMatch(/\/test.txt$/g);
    }

    pipe([
      stream('./fixtures/whatsgoingon/**/*.txt', [], { cwd: __dirname, }),
      concat(assert),
    ], done);
  });

  it('finishes and passes the multiple matched files to the next pipe', function(done) {
    function assert(files) {
      expect(files.length).toBe(3);
      files.sort();
      expect(files[0].path).toMatch(/\/has\s\(parens\)\/test.dmc$/);
      expect(files[1].path).toMatch(/\/stuff\/run.dmc$/);
      expect(files[2].path).toMatch(/\/stuff\/test.dmc$/);
    }

    pipe([
      stream('./fixtures/**/*.dmc', [], { cwd: __dirname, }),
      concat(assert),
    ], done);
  });
});
