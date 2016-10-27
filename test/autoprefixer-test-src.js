function requireAll(requireContext) {
  return requireContext.keys().map(requireContext);
}

var should = require('should');
var tests = requireAll(require.context(__dirname + "/../lib/autoprefixer/test/", false, /^\.\/.*\.coffee$/));

module.exports = tests;
