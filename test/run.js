//
//	Execute nodeunit test suite
//
reporter = require('nodeunit').reporters.default;
reporter.run(['unit'], null, function () { console.log('end'); });
