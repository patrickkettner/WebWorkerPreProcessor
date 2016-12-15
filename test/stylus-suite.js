describe('stylus', function() {
  this.timeout(5 * 60 * 1000)
  var stylusBuilder;
  var stylus;

  before(function() {
    stylus = new Worker(__workerPath)

      stylusBuilder = function(str, opts, cb) {
        stylus.onmessage = function(e) {
          cb(JSON.parse(e.data));
        };

        stylus.postMessage(JSON.stringify({css: str, options: opts}));
      };

  });

  var bannedFunctions = [
    '@import',
    '@require',
    'image-size\\(',
    'use\\('
  ].map(function(f) {
    return new RegExp(f);
  })

  var bannedFileNames = [
    'index',
    '/import.',
    '.json',
    '\/convert',
    'functions.url',
    'image-size',
    '/require',
    '/mixins/'
  ].map(function(f) {
    return new RegExp(f)
  })

  window.__testFiles.forEach(function(url) {
    var testName = url.split('/').pop();
    // if the url does not match a banned filename
    if (!bannedFileNames.some(function(fn){return !!url.match(fn)})) {

      describe(url, function() {
        var data = {};

        before(function(done) {

          $.when(
              $.ajax({
                url: url + '.styl',
                success: function(response) {
                  data.styl = response;
                }
              }),
              $.ajax({
                url: url + '.css',
                success: function(response) {
                  data.css = response;
                }
              })
              ).then(function() {
                done();
              })
        })

        it('runs correctly', function(done) {
          // if the file contains functions that don't actually work in this env,
          // then skip it
          if (data.styl && !bannedFunctions.some(function(fn){return !!data.styl.match(fn)})) {
            var opts = {}
            if (url.indexOf('compress') !== -1) {
              opts.compress = true
            }

            if (url.indexOf('prefix.') !== -1) {
              opts.prefix = 'prefix-'
            }

            stylusBuilder(data.styl, opts, function(response) {
              if (response.err === null) { response.err = undefined; }

              expect(response.err).to.be(undefined);
              expect(response.css).to.not.be(undefined);
              expect(typeof response.css).to.be('string');
              expect(response.css.trim()).to.eql(data.css.trim());
              done();
            })
          } else {
            this.test.title = 'include a banned function...skipping...';
            this.test.skip();
            done();
          }
        })
      });
    }
  });
});
