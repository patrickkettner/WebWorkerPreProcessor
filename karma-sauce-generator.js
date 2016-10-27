var browserslist = require('browserslist');
var request = require('sync-request');

var res = request('GET', 'https://saucelabs.com/rest/v1/info/browsers/webdriver');


function lookup(requestedBrowsers, cb) {
  var result = {};
  var sauce = JSON.parse(res.getBody().toString())
    //console.log(sauce);

  browserslist(requestedBrowsers)
    .map((browser) => {
      var data = browser.split(' ');
      var name = data[0];
      var ver = data[1];

      switch (name) {
        case 'edge':
          name = 'microsoftedge';
          break;
        case 'ie':
          name = 'internet explorer';
          break;
        case 'ie_mob':
        case 'ios_saf':
          return;
      }

      return {
        base: 'SauceLabs',
        browserName: name,
        version: ver
      };
  })
  .filter(b => !!b)
  .filter((b) => sauce.some((sB) => sB.api_name === b.browserName && sB.short_version === b.version))
  .forEach(b => result[`sl_${b.browserName}_${b.version}`] = b)

  return result;
}

module.exports = lookup
