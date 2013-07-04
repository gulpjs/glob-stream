gs = require '../'
should = require 'should'
require 'mocha'

{join} = require 'path'

# TODO: test back-pressure

describe 'glob-stream', ->
  describe 'create()', ->
    it 'should return a file name stream from a glob', (done) ->
      stream = gs.create join __dirname, "./fixtures/*.coffee"
      should.exist stream
      stream.on 'error', (err) -> throw err
      stream.on 'data', (file) ->
        should.exist file
        String(file).should.equal join __dirname, "./fixtures/test.coffee"

      stream.on 'end', -> done()