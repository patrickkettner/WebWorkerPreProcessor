self.Autoprefixer  = require('../lib/autoprefixer/lib/autoprefixer');

self.onmessage = function(ev) {
  self.Autoprefixer.render(css, opts, function(err, result) {
    self.postMessage(JSON.stringify({err: err, css: result}))
  })
}
