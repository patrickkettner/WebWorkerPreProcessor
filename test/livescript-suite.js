describe('livescript', function() {
  this.timeout(5 * 60 * 1000)
  var livescriptBuilder;
  var livescript;

  before(function() {
    livescript = new Worker(__workerPath)


      livescriptBuilder = function(str, opts, cb) {
        livescript.onmessage = function(e) {
          cb(JSON.parse(e.data));
        };

        livescript.postMessage(JSON.stringify({js: str, options: opts}));
      };
  });

  it('compiles', function(done) {
    livescriptBuilder('', {}, function(response) {
      expect(response.err).to.be(undefined);
      expect(response.js).to.not.be(undefined);
      done();
    })
  })

  after(function() {
    delete window.process;
  });
})
