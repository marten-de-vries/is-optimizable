"use strict";

var parse = require('acorn').parse;
var walk = require('acorn/util/walk');
var extend = require('extend');
var compare = require('alphanumeric-sort').compare;

var SCOPE_HOLDERS = [
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

    var container = getContainer(ancestors, SCOPE_HOLDERS);
    var name;
    if (container.type === 'Program') {
      name = "global code";
    } else {
      var funcName = (container.id || {}).name || "unnamed function";
      name = "function '" + funcName + "'";
    }
    killers.push('line ' + line + ': ' + name + ': ' + reason);
  }

  function checkEval(node, ancestors) {
    if (node.name === 'eval') {
      addKiller('possible eval() call', node, ancestors);
    }
  }

  // first pass
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
        SCOPE_HOLDERS.indexOf(parent.type) !== -1 &&
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
    Identifier: function (node, ancestors) {
      checkEval(node, ancestors);

      if (node.name !== 'arguments') {
        return;
      }

      // mark container as 'using arguments'
      var container = getContainer(ancestors, SCOPE_HOLDERS);
      container.referencesArguments = true;

      // check for unsafe argument use
      var parent = ancestors[ancestors.length - 2];
      var grandParent = ancestors[ancestors.length - 3];
      var isPropertyRead = (
        parent.type === 'MemberExpression' &&
        parent.object === node &&
        (
          ['UpdateExpresion', 'AssignmentExpression'].indexOf(grandParent.type) === -1 ||
          grandParent.right === parent
        )
      );
      var forLoopParent = getContainer(ancestors, ['ForStatement']);
      var isSafePropertyRead = isPropertyRead && (
        parent.property.name === 'length' ||
        (
          //for loop
          forLoopParent &&
          forLoopParent.init &&
          nameOf(forLoopParent.init) === nameOf(parent.property)
        )
      );
      var isApplyCall = (
        parent.type === 'CallExpression' &&
        parent.callee.type === 'MemberExpression' &&
        parent.callee.property.name === 'apply' &&
        parent.arguments[1] === node
      );
      var isExpressionStatement = parent.type === 'ExpressionStatement';
      var isSafeArgumentUse = (
        isSafePropertyRead ||
        isApplyCall ||
        isExpressionStatement
      );
      if (!isSafeArgumentUse) {
        addKiller("possibly unsafe 'arguments' usage", node, ancestors);
      }
    },
    MemberExpression: function (node, ancestors) {
      checkEval(node.property, ancestors);
    },
    WithStatement: function (node, ancestors) {
      addKiller('with statement', node, ancestors);
    },
    SwitchStatement: function (node, ancestors) {
      /* istanbul ignore else */
      if (node.cases.length > 128) {
        addKiller('switch statement with more than 128 cases', node, ancestors);
      }
    },
    //TODO: for/in
  });

  function checkReassignmentWhileArgumentsReferenced(name, ancestors) {
    var container = getContainer(ancestors, SCOPE_HOLDERS);

    var isBad = (
      container.referencesArguments &&
      container.params.map(nameOf).indexOf(name) !== -1
    );
    if (isBad) {
      var node = ancestors[ancestors.length - 1];
      var msg = (
        "reassignment of argument '" +
        name +
        "' while 'arguments' is referenced in the same function body"
      );
      addKiller(msg, node, ancestors);
    }
  }

  // second pass
  walk.ancestor(ast, {
    AssignmentExpression: function (node, ancestors) {
      var name = nameOf(node.left);
      checkReassignmentWhileArgumentsReferenced(name, ancestors);
    },
    UpdateExpression: function (node, ancestors) {
      var name = nameOf(node.argument);
      checkReassignmentWhileArgumentsReferenced(name, ancestors);
    },
  });

  return killers.sort(compare);
};

function nameOf(key) {
  if (key.type === 'VariableDeclaration') {
    return nameOf(key.declarations[0].id);
  }
  return key.name || key.value;
}

function getContainer(ancestors, containerTypes) {
  var container;
  for (var i = ancestors.length; i-- > 0; ) {
    container = ancestors[i];
    if (containerTypes.indexOf(container.type) !== -1) {
      break;
    }
  }
  return container;
}
