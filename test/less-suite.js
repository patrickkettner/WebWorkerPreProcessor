describe('less', function() {
  this.timeout(5 * 60 * 1000)
    var lessBuilder;
  var less;

  before(function() {
    less = new Worker(__workerPath)


      lessBuilder = function(str, opts, cb) {
        less.onmessage = function(e) {
          cb(JSON.parse(e.data));
        };

        less.postMessage(JSON.stringify({css: str, options: opts}));
      };
  });

  var bannedFunctions = [
    new RegExp('data-uri\\('),
        /@import/,
        /@plugin/
  ]

  window.__testFiles.forEach(function(url) {
    var testName = url.split('/').pop();

    describe(url, function() {
      var isErrorTest = !!url.match(/\/(no-js-)?errors\//);
      var source = {};

      before(function(done) {
        var cssUrl = url.replace(/test\/less/, 'test/css') + '.css';
        var lessUrl = url + '.less';
        var errorUrl = url + '.txt';

        $.when(
          $.ajax({
            url: lessUrl,
            success: function(response) {
              // stupid simple shim for ./test/less/javascript.less
              response = response.replace("process.title", "'node'")
                source.less = response;
            },
            error: done
          }),
          $.ajax({
            url: isErrorTest ? errorUrl : cssUrl,
            success: function(response) {
              source.result = response;
            },
            error: function() {
              if (url.match(/\/sourcemaps-empty/)) {
                source.result = '';
              }
            }
          })
        ).always(function() {
          done();
        })
      })

      it('runs correctly', function(done) {
        if (source.less && !bannedFunctions.some(function(fn){return !!source.less.match(fn)})) {

          var opts = {
            strictMath: true
          };

          if (source.less.match(/@my-color/)) {
            opts.modifyVars =  opts.modifyVars || {};
            opts.modifyVars["my-color"] = "red";
          }
          if (url.match(/modifyVars/)) {
            opts.modifyVars = {
              "the-border": "1px",
              "base-color": "#111",
              "red": "#842210"
            }
          }
          if (url.match(/strict-units/)) {
            opts.strictUnits = true;
          }
          if (url.match(/globalVars/)) {
            opts.banner = "/**\n  * Test\n  */\n"
            opts.errorReporting = "console";
            opts.globalVars = {
              "the-border": "1px",
              "base-color": "#111",
              "red": "#842210",
              "@global-var": "red"
            }
          }
          if (url.match(/compression/)) {
            opts.compress = true;
          }
          if (url.match(/\/errors\//)) {
            opts.strictUnits = true;
          }
          if (url.match(/no-js-errors/)) {
            opts.strictUnits = true;
            opts.javascriptEnabled = false;
          }
          if (url.match(/legacy/)) {
            opts.strictMath = false;
            opts.strictUnits = false;
          }
          if (url.match(/no-strict-math/)) {
            opts.strictMath = false;
          }

          lessBuilder(source.less, opts, function(response) {
            if (response.err === null) { response.err = undefined; }

            if (isErrorTest) {
              expect(response.err).to.not.be(undefined);
              expect(response.css).to.be(undefined);
              expect(source.result).to.contain(response.err.message);
            } else {
              expect(response.err).to.be(undefined);
              expect(response.css).to.not.be(undefined);
              expect(response.css).to.eql(source.result);
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

  after(function() {
    delete window.process;
  });
})
