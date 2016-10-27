describe('pug', function() {
  this.timeout(5 * 60 * 1000)
    var pugBuilder;
  var pug;

  before(function() {
    pug = new Worker(__workerPath)


      pugBuilder = function(str, opts, cb) {
        pug.onmessage = function(e) {
          cb(JSON.parse(e.data));
        };

        pug.postMessage(JSON.stringify({html: str, options: opts}));
      };
  });

  var bannedFunctions = [
    /extends /
  ]

  window.__testFiles.forEach(function(url) {

    describe(url, function() {
      var source = {};

      before(function(done) {
        var htmlUrl = url + '.html';
        var pugUrl = url + '.pug';

        $.when(
          $.ajax({
            url: pugUrl,
            success: function(response) {
              source.pug = response.replace('!!! 5', 'doctype html');
            },
            error: done
          }),
          $.ajax({
            url: htmlUrl,
            success: function(response) {
              source.result = response;
            },
            error: done
          })
        ).always(function() {
          done();
        })
      })

      it('runs correctly', function(done) {
        if (source.pug && !bannedFunctions.some(function(fn){return !!source.pug.match(fn)})) {

          pugBuilder(source.pug, {filename: 'foo.html', cache: false}, function(response) {
            if (response.err === null) { response.err = undefined; }
            expect(response.err).to.be(undefined);
            expect(response.html).to.not.be(undefined);
            expect(response.html).to.eql(source.result);
            done();
          })
        } else {
          this.test.title = 'includes a banned function...skipping...';
          this.test.skip();
          done();
        }
      });

    })
  })
})
