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
        should.exist file.path
        should.exist file.base
        String(file.path).should.equal join __dirname, "./fixtures/test.coffee"
        String(file.base).should.equal join __dirname, "./fixtures/"

      stream.on 'end', -> done()

    it 'should return a file name stream from a deep glob', (done) ->
      stream = gs.create join __dirname, "./fixtures/**/*.js"
      should.exist stream
      stream.on 'error', (err) -> throw err
      stream.on 'data', (file) ->
        should.exist file
        should.exist file.path
        should.exist file.base
        String(file.path).should.equal join __dirname, "./fixtures/whatsgoingon/test.js"
        String(file.base).should.equal join __dirname, "./fixtures/"

      stream.on 'end', -> done()