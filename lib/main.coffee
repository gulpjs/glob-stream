es = require 'event-stream'
glob = require 'glob'
path = require 'path'

module.exports = 
  create: (globb, opt={}) ->
    throw new Error "Invalid or missing glob string" unless typeof globb is 'string'
    
    opt.silent ?= true
    opt.nonull ?= false

    stream = es.pause()

    globber = new glob.Glob globb, opt

    basePath = path.normalize globber.minimatch.set[0]
      .map((s) -> if typeof(s) is 'string' then s else '')
      .join(path.sep)

    globber.on 'error', (e) ->
      stream.emit 'error', e

    globber.on 'end', ->
      stream.end()

    globber.on 'match', (filename) ->
      file =
        base: basePath
        path: filename

      stream.write file

    return stream