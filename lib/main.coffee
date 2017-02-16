es = require 'event-stream'
glob = require 'glob'

module.exports = 
  create: (globb, opt={}) ->
    throw new Error "Invalid or missing glob string" unless typeof globb is 'string'
    
    opt.silent ?= true
    opt.nonull ?= false

    stream = es.pause()

    globber = new glob.Glob globb, opt
    globber.on 'error', (e) ->
      stream.emit 'error', e

    globber.on 'end', ->
      stream.end()

    globber.on 'match', (filename) ->
      stream.write filename

    return stream