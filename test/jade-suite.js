describe('jade', function() {
  this.timeout(5 * 60 * 1000)
    var jadeBuilder;
  var jade;

  before(function() {
    jade = new Worker(__workerPath)


      jadeBuilder = function(str, opts, cb) {
        jade.onmessage = function(e) {
          cb(JSON.parse(e.data));
        };

        jade.postMessage(JSON.stringify({html: str, options: opts}));
      };
  });

  var bannedFunctions = [
    /extends /,
    /include /
  ]

  window.__testFiles.forEach(function(url) {

    describe(url, function() {
      var isErrorTest = !!url.match(/\/anti-cases\//);
      var pretty = !url.match(/test\/browser\/index/);
      var source = {};

      before(function(done) {
        var htmlUrl = url + '.html';
        var jadeUrl = url + '.jade';

        $.when(
            $.ajax({
              url: jadeUrl,
              success: function(response) {
                source.jade = response.replace('!!! 5', 'doctype html');
              },
              error: done
            }),
            $.ajax({
              url: htmlUrl,
              success: function(response) {
                source.result = response;
              },
              error: function() { }
            })
            ).always(function() {
          done();
        })
      })

      it('runs correctly', function(done) {
        if (source.jade && !bannedFunctions.some(function(fn){return !!source.jade.match(fn)})) {

          jadeBuilder(source.jade, {self: true,pretty: pretty}, function(response) {
            if (response.err === null) { response.err = undefined; }

            if (isErrorTest) {
              expect(response.err).to.not.be(undefined);
              expect(response.html).to.be(undefined);
            } else {
              expect(response.err).to.be(undefined);
              expect(response.html).to.not.be(undefined);
              expect(response.html.trim()).to.eql(source.result.trim());
            }

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
