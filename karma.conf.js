module.exports = function(config) {
  var generateBrowsers = require('./karma-sauce-generator.js')
  var customLaunchers = generateBrowsers([
    'last 3 versions',
    'not ie < 11'
  ]);

  config.set({
    frameworks: ['mocha'],
    concurrency: 4,
    customLaunchers: customLaunchers,
    browserDisconnectTolerance: 3,
    browserDisconnectTimeout: 60 * 1000,
    browserNoActivityTimeout: 45 * 1000,
    port: 9999,
    singleRun: true,
    browsers: Object.keys(customLaunchers),
    reporters: ['dots', 'saucelabs'],
    logLevel: 'ERROR',
  });
};
