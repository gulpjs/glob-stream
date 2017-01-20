var stream = require('../stream');
var expect = require('expect');
var miss = require('mississippi');

var concat = miss.concat;
var pipe = miss.pipe;

describe('GlobStream', function() {
  it('emits an error if it is not first in the stream', function(done) {
    var gs1 = stream('./fixtures/whatsgoingon/**/*.txt', [], { cwd: __dirname, });
    var gs2 = stream('./fixtures/whatsgoingon/**/*.txt', [], { cwd: __dirname, });

    pipe([
      gs1,
      gs2,
    ]);
  });

  it('emits an error if there are no matches', function(done) {
    var gs = stream(
      './fixtures/whatsgoingon/kojaslkjas.txt',
      [],
      { cwd: __dirname, }
    );

    gs.once('error', function(err) {
      expect(err.message).toMatch(/^File not found with singular glob/g);
      done();
    });
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
