is-optimizable
==============

[![Build Status](https://travis-ci.org/marten-de-vries/is-optimizable.svg?branch=master)](https://travis-ci.org/marten-de-vries/is-optimizable)
[![Dependency Status](https://david-dm.org/marten-de-vries/is-optimizable.svg)](https://david-dm.org/marten-de-vries/is-optimizable)
[![devDependency Status](https://david-dm.org/marten-de-vries/is-optimizable/dev-status.svg)](https://david-dm.org/marten-de-vries/is-optimizable#info=devDependencies)

A tool that checks for V8 optimization killers. Based on the list on the
[bluebird wiki][].

[bluebird wiki]: https://github.com/petkaantonov/bluebird/wiki/Optimization-killers

Usage
-----

```

Usage: is-optimizable <files>... [options]

files     The list of files to check optimizability for.

Options:
   --encoding              Input file encoding  [UTF-8]
   --harmony               Parse as ES6
   --disallow-lonely-try   Don't allow try/catch/finally as only thing inside a function.

```

Example
-------

```
marten@procyon:~/git/is-optimizable$ ./bin/is-optimizable --harmony test/problems.js
test/problems.js: line 1: global code: debugger statement
test/problems.js: line 4: function 'a': debugger statement
test/problems.js: line 7: function 'test': generator function
test/problems.js: line 10: function 'unnamed function': generator function
test/problems.js: line 13: global code: for .. of statement
test/problems.js: line 16: global code: try/finally statement
test/problems.js: line 17: global code: try/catch statement
test/problems.js: line 18: global code: try/catch/finally statement
test/problems.js: line 21: global code: object literal includes a get declaration
test/problems.js: line 24: global code: object literal includes a set declaration
test/problems.js: line 27: global code: object literal includes a __proto__ property
test/problems.js: line 31: global code: possible eval() call
test/problems.js: line 32: global code: possible eval() call
test/problems.js: line 34: global code: with statement
test/problems.js: line 38: global code: switch statement with more than 128 cases
test/problems.js: line 175: function 'c': possibly unsafe 'arguments' usage
test/problems.js: line 190: function 'f': possibly unsafe 'arguments' usage
test/problems.js: line 195: function 'f': reassignment of argument 'a' while 'arguments' is referenced in the same function body
test/problems.js: line 196: function 'f': possibly unsafe 'arguments' usage
test/problems.js: line 211: function 'g': possibly unsafe 'arguments' usage
test/problems.js: line 221: function 'i': possibly unsafe 'arguments' usage
marten@procyon:~/git/is-optimizable$ 
```

Ignore lines
------------

You can ignore warnings by adding a comment containing the text 
'is-optimizable ignore next' exactly *one* line ahead of the line
causing the error. E.g.:

```javascript
var a = 1;
try {} finally {}
var b = 2;
```

becomes:

```javascript
var a = 1;
/* is-optimizable ignore next */
try {} finally {}
var b = 2;
```

Wishlist/TODO
-------------

- compound let assignment - rare so not yet implemented
- compound const assignment - rare so not yet implemented
- check for .. in - it's efficiency is largely runtime dependant though.

PRs welcome!

License
-------

ISC
