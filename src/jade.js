self.Jade  = require('../lib/pug/lib/');

self.onmessage = function(ev) {
  var data = JSON.parse(ev.data);
  var html = data.html;
  var opts = data.options || {};

  self.Jade.render(html, opts, function(err, result) {
    self.postMessage(JSON.stringify({err: err, html: result}))
  })
};
