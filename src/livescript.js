self.LiveScript  = require('../lib/livescript');

self.onmessage = function(ev) {
  var data = JSON.parse(ev.data);
  var opts = data.options || {};
  var js = data.js;
  var result;
  var err

    try {
      result = self.LiveScript.compile(js, opts);
      if (opts.__eval == true) {
        result = eval(result)
      }
    } catch (e) {
      err = JSON.stringify(e, Object.getOwnPropertyNames(e))
    }

  self.postMessage(JSON.stringify({err: err, js: result}))
};
