"use strict";

//run on this script, then check if all the bad things show up.
var fs = require('fs');
var getOptimizationKillers = require('../');

var code = fs.readFileSync(__dirname + '/problems.js');

// a small test first that depends on the options
if (getOptimizationKillers('try {} finally {}').length !== 0) {
  throw new Error("allowLonelyTry is broken!");
}

var killers = getOptimizationKillers(code, {
  ecmaVersion: 6,
  allowLonelyTry: false
});

var expected = [
  "global code: line 1: debugger statement",
  "function 'a': line 4: debugger statement",
  "function 'test': line 7: generator function",
  "function 'unnamed function': line 10: generator function",
  "global code: line 13: for .. of statement",
  "global code: line 16: try/finally statement",
  "global code: line 17: try/catch statement",
  "global code: line 18: try/catch/finally statement",
  "global code: line 21: object literal includes a get declaration",
  "global code: line 24: object literal includes a set declaration",
  "global code: line 27: object literal includes a __proto__ property",
  "global code: line 31: possible eval() call",
  "global code: line 32: possible eval() call",
  "global code: line 34: with statement",
  "global code: line 38: switch statement with more than 128 cases",
];

var notInKillers = expected.filter(function (item) {
  return killers.indexOf(item) === -1;
});

var extraInKillers = killers.filter(function (item) {
  return expected.indexOf(item) === -1;
});

if (notInKillers.length) {
  console.warn('Expected but not reported:');
  console.warn(notInKillers.join('\n'));
}
if (extraInKillers.length) {
  console.warn('Reported but not expected:');
  console.warn(extraInKillers.join('\n'));
}

if (notInKillers.length || extraInKillers.length) {
  process.exit(1);
}
