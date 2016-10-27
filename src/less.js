self.Less  = require('../lib/less');

var sortVer = require('semver-compare');
var version = self.Less.version.join('.');

self.onmessage = function(ev) {
  var data = JSON.parse(ev.data);
  var css = data.css;
  var opts = data.options || {};

  if (sortVer(version, '1.7.4') < 1) {

    var parser = new self.Less.Parser(opts);
    parser.parse(css, function (err, tree) {
      var compiled;

      if (!err) {
        try {
          compiled = tree.toCSS(opts);
        } catch (e) {
          err = e;
        }
      }

      self.postMessage(JSON.stringify({
        err: err,
        css: compiled
      }));

    }, opts);
  } else {

    self.Less.render(css, opts, function(err, result) {
      if (typeof result === 'object') {
        result = result.css
      }
      self.postMessage(JSON.stringify({err: err, css: result}))
    })
  }
};
