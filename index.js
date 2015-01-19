"use strict";

var parse = require('acorn').parse;
var walk = require('acorn/util/walk');
var extend = require('extend');

var CONTAINERS = [
  'FunctionExpression',
  'FunctionDeclaration',
  'ArrowExpression',
  'Program',
];

module.exports = function getOptimizationKillers(code, opts) {
  var ignoredLines = [];
  opts = extend({allowLonelyTry: true}, opts, {
    locations: true,
    onComment: function (block, text, start, end, startInfo, endInfo) {
      if (text.indexOf('is-optimizable ignore next') !== -1) {
        ignoredLines.push(startInfo.line + 1);
      }
    },
  });
  var ast = parse(code, opts);
  var killers = [];

  function addKiller(reason, node, ancestors) {
    var line = node.loc.start.line;
    if (ignoredLines.indexOf(line) !== -1) {
      return;
    }

    var container;
    for (var i = ancestors.length; i-- > 0; ) {
      container = ancestors[i];
      if (CONTAINERS.indexOf(container.type) !== -1) {
        break;
      }
    }
    var name;
    if (container.type === 'Program') {
      name = "global code";
    } else {
      var funcName = (container.id || {}).name || "unnamed function";
      name = "function '" + funcName + "'";
    }
    killers.push(name + ': line ' + line + ': ' + reason);
  }

  function checkIdentifier(node, ancestors) {
    if (node.name === 'eval') {
      addKiller('possible eval() call', node, ancestors);
    }
  }

  walk.ancestor(ast, {
    Function: function (node, ancestors) {
      if (node.generator) {
        addKiller('generator function', node, ancestors);
      }
    },
    ForOfStatement: function (node, ancestors) {
      addKiller('for .. of statement', node, ancestors);
    },
    TryStatement: function (node, ancestors) {
      var parent = ancestors[ancestors.length - 2];
      var isLonelyTry = (
        CONTAINERS.indexOf(parent.type) !== -1 &&
        parent.body.length === 1
      );
      if (opts.allowLonelyTry && isLonelyTry) {
        return;
      }
      var name = ['try'];
      if (node.handler) {
        name.push('catch');
      }
      if (node.finalizer) {
        name.push('finally');
      }
      addKiller(name.join('/') + ' statement', node, ancestors);
    },
    //TODO: compound let assignment
    //TODO: compound const assignment
    ObjectExpression: function (node, ancestors) {
      function addObjLitKiller(property, problem) {
        var msg = "object literal includes a " + problem;
        addKiller(msg, property, ancestors);
      }
      node.properties.forEach(function (property) {
        if (['get', 'set'].indexOf(property.kind) !== -1) {
          addObjLitKiller(property, property.kind + " declaration");
        }
        if (nameOf(property.key) === '__proto__') {
          addObjLitKiller(property, "__proto__ property");
        }
      });
    },
    DebuggerStatement: function (node, ancestors) {
      addKiller('debugger statement', node, ancestors);
    },
    Identifier: checkIdentifier,
    MemberExpression: function (node, ancestors) {
      checkIdentifier(node.property, ancestors);
    },
    WithStatement: function (node, ancestors) {
      addKiller('with statement', node, ancestors);
    },
    //TODO: arguments
    SwitchStatement: function (node, ancestors) {
      /* istanbul ignore else */
      if (node.cases.length > 128) {
        addKiller('switch statement with more than 128 cases', node, ancestors);
      }
    },
    //TODO: for/in
  });

  return killers;
};

function nameOf(key) {
  return key.name || key.value;
}
