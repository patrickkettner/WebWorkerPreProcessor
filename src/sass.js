require('opal-webpack!./sass.rb')
hashify = require('../lib/js/hashify');
self.utf8 = require('utf8')

self.onmessage = function(e) {
  var data = JSON.parse(e.data);
  var result;
  var err;

  try {
    if (data.eval) {
      result = eval(data.eval)
    } else {
      var opts = data.options || {}
      result = Opal.Opal.$sassBuilder(data.css, hashify(opts))
    }
  } catch (e) {
    err = JSON.stringify(e, Object.getOwnPropertyNames(e))
  }

  postMessage(JSON.stringify({css: result, err: err}))
}
