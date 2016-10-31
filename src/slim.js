require('opal-webpack!./slim.rb')
hashify = require('../lib/js/hashify');

self.onmessage = function(e) {
  var data = JSON.parse(e.data);

  var result;
  var err;
  try {
    var opts = data.options || {}
    result = Opal.Opal.$slimBuilder(data.html, hashify(opts))
  } catch (e) {
    err = JSON.stringify(e, Object.getOwnPropertyNames(e))
  }

  postMessage(JSON.stringify({html: result, err: err}))
}
