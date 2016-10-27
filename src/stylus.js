require('../lib/js/Function.prototype.name')()
self.Stylus  = require('../lib/stylus/lib/stylus.js');
self.funcs = require('raw!../lib/stylus/lib/functions/index.styl')

self.onmessage = function(ev) {
  var data = JSON.parse(ev.data);
  var css = data.css;
  var opts = data.options || {};

  var ren = function(str, cb, withoutFuncs) {
    var css = str;

    if (!withoutFuncs) {
      css = self.funcs + "\n\n" + str;
    }

    self.Stylus.render(css, opts, function(err, css) {
      if (err && err.message.indexOf('ParseError') && !withoutFuncs) {
        ren(str, cb, true);
      } else {
        cb(err, css)
      }
    })
  }

  ren(css, function(err, css) {
    self.postMessage(JSON.stringify({err: err, css: css}))
  })
};
