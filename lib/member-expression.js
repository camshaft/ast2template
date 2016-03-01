/**
 * Module dependencies
 */

var acorn = require('acorn');
var estraverse = require('estraverse');
var escodegen = require('escodegen');

var DEFAULT_GLOBALS = [
  'process',
  'global',
  'module',
  'require',
  'Buffer',
  'window',
  'document',
  'browser',
  'console',
  'Object',
  'Function',
  'Boolean',
  'Symbol',
  'Error',
  'EvalError',
  'InternalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
  'Number',
  'Math',
  'Date',
  'String',
  'RegExp',
  'Array',
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'ArrayBuffer',
  'DataView',
  'JSON',
  'Promise',
  'Generator',
  'GeneratorFunction',
  'Reflect',
  'Proxy',
  'Intl'
];

exports = module.exports = function(str, get, noop, nullVar, globalNames, indent) {
  globalNames = globalNames || DEFAULT_GLOBALS;
  var ast = typeof str !== 'string' ? str : tryParse(str);

  var result = estraverse.replace(ast, {
    enter: function(node, parent) {
      node.leftHandSide = parent.type === 'AssignmentExpression' || parent.leftHandSide;
      if (node.type !== 'MemberExpression' || node.leftHandSide) return node;
      if (isGlobal(node, globalNames)) return node;

      var conf = member(node, []);

      node.type = 'CallExpression';
      node.callee = {
        type: 'Identifier',
        name: get
      };
      node.arguments = [
        {
          type: 'ArrayExpression',
          elements: conf.args
        }
      ];

      if (conf.root) node.arguments.push(conf.root);

      if (parent.type === 'CallExpression' && parent.callee === node) {
        if (node.arguments.length === 1) node.arguments.push({
          type: 'Identifier',
          name: nullVar
        });

        node.arguments.push({
          type: 'Identifier',
          name: noop
        });
      }
    }
  });

  return exports.toString(result, indent);
};

exports.toString = function(ast, indent) {
  var format = typeof indent === 'number' ? {
    indent: {
      style: '  ',
      base: indent
    },
    newline: '\n',
    compact: false,
    semicolons: true
  } : {
    indent: {
      style: '',
      base: 0
    },
    newline: '',
    compact: true,
    semicolons: false
  };

  return escodegen.generate(ast, {
    format: format
  });
};

function parse(str) {
  return acorn.parse(str, {
    ecmaVersion: 6
  });
}

function tryParse(str) {
  try {
    return parse(str);
  } catch (e) {
    try {
      return parse('(' + str + ')');
    } catch (_) {
      throw e;
    }
  }
}

function isGlobal(node, names) {
  if (node.object) return isGlobal(node.object, names);
  return !!~names.indexOf(node.name);
}

function member(node, args) {
  var prop = node.property;

  if (!node.computed) {
    prop.type = 'Literal';
    prop.value = typeof prop.value === 'undefined' ? prop.name : prop.value;
    prop.raw = typeof prop.raw === 'undefined' ? '"' + prop.name + '"' : prop.raw;
  }

  args.unshift(prop);

  var obj = node.object;
  if (obj && obj.type === 'MemberExpression') return member(obj, args);

  if (obj.name === '_') {
    args.unshift({
      type: 'Literal',
      value: '',
      raw: '""'
    });
    return {
      args: args
    };
  }

  if (obj.type === 'ThisExpression') obj = {
    type: 'Identifier',
    name: 'self'
  };

  return {
    args: args,
    root: obj
  };
}
