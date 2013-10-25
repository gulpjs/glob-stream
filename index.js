var es = require('event-stream');
var glob = require('glob');
var path = require('path');

module.exports = {
  create: function(globString, opt) {
    if (typeof globString !== 'string') {
      throw new Error("Invalid or missing glob string");
    }

    if (!opt) opt = {};
    if (typeof opt.silent !== 'boolean') opt.silent = true;
    if (typeof opt.nonull !== 'boolean') opt.nonull = false;

    
    var stream = es.pause();
    var globber = new glob.Glob(globString, opt);
    var rules = globber.minimatch.set[0];
    var basePath = path.normalize(rules.map(function(s, idx) {
      if (typeof s === 'string' && idx !== rules.length-1) {
        return s;
      } else {
        return '';
      }
    }).join(path.sep));

    globber.on('error', stream.emit.bind(stream, 'error'));
    globber.on('end', function(){
      stream.end();
    });
    globber.on('match', function(filename) {
      stream.write({
        base: basePath,
        path: filename
      });
    });

    return stream;
  }
};
