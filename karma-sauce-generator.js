const browserslist = require('browserslist');
const request = require('sync-request');
const res = request('GET', 'https://saucelabs.com/rest/v1/info/browsers/webdriver');

const lookup = (requestedBrowsers, cb) => {
  const sauce = JSON.parse(res.getBody().toString())
  let result = {};

  browserslist(requestedBrowsers)
    .map((browser) => {
      const data = browser.split(' ');
      let name = data[0];
      let ver = data[1];

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
