describe('livescript', function() {
  this.timeout(5 * 60 * 1000);
  var livescriptBuilder;
  var livescript;
  var run;

  var throes = "self.compileThrows = throws = (r) -> try\n  throw new Error(\"fn did not throw\")\ncatch\n  return true\n";
  var eq = "self.eq = (a,b) -> throw new Error('\"' + a + '\" not equal to \"' + b + '\"') unless a == b\n";
  var deepEqual = "self.deepEqual = (a,b) -> throw new Error('\"' + a + '\" not equal to \"' + b + '\"') unless a === b\n";
  var ok = "self.ok = (a) ->  throw new Error('\"' + a + '\" is not truthy') unless !!a\n";

  var flatten_ls = "flatten = (xs) -->\n  [].concat.apply [], [(if typeof! x is 'Array' then flatten x else x) for x in xs]\n";
  var fold_ls = "fold = foldl = (f, memo, xs) -->\n  for x in xs\n    memo = f memo, x\n  memo\n";
  var filter_ls = "filter = (f, xs) -->\n  [x for x in xs when f x]\n";
  var map_ls =  "map = (f, xs) -->\n  [f x for x in xs]\n";
  var even_ls = "even = (x) -> x % 2 == 0\n";

  before(function() {
    livescript = new Worker(__workerPath);


    run = function(result, cb) {
      expect(result.err).to.be(undefined);
      try {
        expect(eval(result.js)).to.be(true)
      } catch (e) {
        expect(e).to.be(undefined);
      }
      cb()
    }

    livescriptBuilder = function(str, opts, cb) {
      livescript.onmessage = function(e) {
        cb(JSON.parse(e.data));
      };

      livescript.postMessage(JSON.stringify({js: str, options: opts}));
    };


  })

  window.__testFiles.forEach(function(url) {

    describe(url, function() {
      var source = eq
      source += ok;
      source += throes;
      source += deepEqual;

      before(function (done) {
        $.ajax({
          url: url + '.ls',
          success: function(response) {
            source += response;
            if (url.match(/regex$/)) {
              // remove a broken test - https://github.com/gkz/LiveScript/issues/946
              source = source.replace('eq //#{\\\\}\\///$ //#{\\\\}\\///source', '')
            }
            // rather than include the entire prelude lib, we just inline the funcitons referenced since they are so small
            source = source.replace("{filter, even, map, fold} = require 'prelude-ls'", filter_ls + even_ls + map_ls + fold_ls)
            source = source.replace("{map} = require 'prelude-ls'", map_ls);
            source = source.replace("{flatten} = require 'prelude-ls'", flatten_ls);
            source += "\n/**/return true";
            done()
          },
          error: done
        })
      })

      it('runs correctly', function(done) {
        livescriptBuilder(source, {__eval: true}, function(response) {
          run(response, done)
        });
      });

    })
  })
})
