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
marten@procyon:~/git/is-optimizable$ ./bin/is-optimizable --harmony test/*
test/problems.js: global code: line 1: debugger statement
test/problems.js: function 'a': line 4: debugger statement
test/problems.js: function 'test': line 7: generator function
test/problems.js: function 'unnamed function': line 10: generator function
test/problems.js: global code: line 13: for .. of statement
test/problems.js: global code: line 16: try/finally statement
test/problems.js: global code: line 17: try/catch statement
test/problems.js: global code: line 18: try/catch/finally statement
test/problems.js: global code: line 21: object literal includes a get declaration
test/problems.js: global code: line 24: object literal includes a set declaration
test/problems.js: global code: line 27: object literal includes a __proto__ property
test/problems.js: global code: line 31: possible eval() call
test/problems.js: global code: line 32: possible eval() call
test/problems.js: global code: line 34: with statement
test/problems.js: global code: line 38: switch statement with more than 128 cases
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

- compound let assignment
- compound const assignment
- check arguments
- check for .. in
- smarter check for ``eval()``

PRs welcome!

License
-------

ISC
