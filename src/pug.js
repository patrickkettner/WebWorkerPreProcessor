self.Pug  = require('../lib/pug');

self.onmessage = function(ev) {
  var data = JSON.parse(ev.data);
  var html = data.html;
  var opts = data.options || {};

  self.Pug.render(html, opts, function(err, result) {
    self.postMessage(JSON.stringify({err: err, html: result}))
  })
};
