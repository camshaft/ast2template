/**
 * Module dependencies
 */

var acorn = require('acorn');
var estraverse = require('estraverse');
var escodegen = require('escodegen');

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

module.exports = function(str, get, noop, nullVar) {
  var ast = typeof str !== 'string' ? str : tryParse(str);

  function member(node, args) {
    var prop = node.property;
    prop.type = 'Literal';
    prop.value = prop.value || prop.name;
    prop.raw = prop.raw || '"' + prop.name + '"';
    delete prop.name;
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

    return {
      args: args,
      root: obj
    };
  }

  var result = estraverse.replace(ast, {
    enter: function(node, parent) {
      if (node.type !== 'MemberExpression') return node;

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

  return escodegen.generate(result, {
    format: {
      indent: '',
      newline: '',
      compact: true,
      semicolons: false
    }
  });
}
