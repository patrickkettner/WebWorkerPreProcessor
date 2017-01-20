module.exports = function(config) {
  var customLaunchers = {};
  var generateBrowsers;

  if (config.fullRun) {
    generateBrowsers = require('./karma-sauce-generator.js')
    customLaunchers = generateBrowsers([
      'last 3 versions',
      'not ie < 11'
    ]);
  }

  config.set({
    sauceLabs: {
      tunnelIdentifier: 'WebWorkerPreProcessor-Tunnel'
    },
    frameworks: ['mocha'],
    concurrency: 4,
    customLaunchers: customLaunchers,
    browserDisconnectTolerance: 3,
    browserDisconnectTimeout: 180 * 1000,
    browserNoActivityTimeout: 180 * 1000,
    port: 9999,
    singleRun: true,
    browsers: Object.keys(customLaunchers),
    reporters: ['dots', 'saucelabs'],
    logLevel: 'ERROR',
  });
};
