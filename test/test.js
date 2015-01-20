"use strict";

//run on this script, then check if all the bad things show up.
var fs = require('fs');
var getOptimizationKillers = require('../');

var code = fs.readFileSync(__dirname + '/problems.js');

// small tests first that depend on the options
if (getOptimizationKillers('try {} finally {}').length !== 0) {
  throw new Error("allowLonelyTry is broken!");
}
if (getOptimizationKillers('function x() {try {} catch(err) {}}').length !== 0) {
  throw new Error("allowLonelyTry is broken!");
}

var killers = getOptimizationKillers(code, {
  ecmaVersion: 6,
  allowLonelyTry: false
});

var expected = [
  "line 1: global code: debugger statement",
  "line 4: function 'a': debugger statement",
  "line 7: function 'test': generator function",
  "line 10: function 'unnamed function': generator function",
  "line 13: global code: for .. of statement",
  "line 16: global code: try/finally statement",
  "line 17: global code: try/catch statement",
  "line 18: global code: try/catch/finally statement",
  "line 21: global code: object literal includes a get declaration",
  "line 24: global code: object literal includes a set declaration",
  "line 27: global code: object literal includes a __proto__ property",
  "line 31: global code: possible eval() call",
  "line 32: global code: possible eval() call",
  "line 34: global code: with statement",
  "line 38: global code: switch statement with more than 128 cases",
  "line 175: function 'c': possibly unsafe 'arguments' usage",
  "line 190: function 'f': possibly unsafe 'arguments' usage",
  "line 195: function 'f': reassignment of argument 'a' while 'arguments' " +
    "is referenced in the same function body",
  "line 196: function 'f': possibly unsafe 'arguments' usage",
  "line 211: function 'g': possibly unsafe 'arguments' usage",
  "line 221: function 'i': possibly unsafe 'arguments' usage",
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
