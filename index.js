/**
 * Module dependencies
 */

var acorn = require('acorn');
var estraverse = require('estraverse');
var escodegen = require('escodegen');
var tags = require('./lib/supported-tags');
var createHash = require('crypto').createHash;
var camel = require('to-camel-case');
var eachFn = require('./lib/each');
var supportedProps = require('./lib/supported-props');

module.exports = function(ast, opts) {
  var template = new Template(ast, opts);
  return template.toString();
};

function Template(ast, opts) {
  if (!(this instanceof Template)) return new Template(ast, opts);
  this.ast = ast;
  this.opts = opts || {};
}

Template.prototype.push = function(str, indent) {
  this.indent(indent || 0);
  this.buffer += str;
};

Template.prototype.indent = function(num) {
  for (var i = 0; i < num; i++) this.push('  ');
};

Template.prototype.indentString = function(str, indent) {
  var ws = '\n';
  for (var i = 0; i < indent; i++) {
    ws += '  ';
  }
  return str.replace(/\n/g, ws);
};

Template.prototype.genSym = function(name) {
  this.symCount++;
  return '/** ' + name + ' **/' + '__ast2template_' + createHash('sha1')
    .update(this.symCount + '')
    .digest('hex')
    .slice(0, 10);
};

Template.prototype.tag = function(name) {
  if (!~tags.indexOf(name)) return JSON.stringify(name);
  if (this.usedTags[name]) return this.usedTags[name];
  return this.usedTags[name] = this.genSym(name);
};

Template.prototype.prependUsedTags = function() {
  var self = this;
  self.buffer = '\n\n' + self.buffer;
  Object.keys(this.usedTags).reverse().forEach(function(tag) {
    var name = self.usedTags[tag];
    self.buffer = 'var ' + name + ' = ' + JSON.stringify(tag) + ';\n' + self.buffer;
  });
  self.buffer = '/**\n * tag references\n */\n\n' + self.buffer;
};

Template.prototype.mapProp = function(key) {
  if (key.indexOf('data-') === 0 || key.indexOf('aria-') === 0) return key;
  if (key === 'class') return 'className';
  if (key === 'for') return 'htmlFor';
  var cameled = camel(key);
  if (~supportedProps.indexOf(cameled)) return cameled;
  return key;
};

Template.prototype.toString = function() {
  this.buffer = '';
  this.symCount = 0;
  this.usedTags = {};

  var dom = this.domVar = this.genSym('dom');
  var get = this.getVar = this.genSym('get');
  var nullVar = this.nullVar = this.genSym('null');
  var noop = this.noopVar = this.genSym('noop');

  this.selfCall = this.opts.selfCall || '()';
  var commonJS = this.opts.isCommonJS !== false ? 'module.exports = ' : '';
  var name = this.opts.name || '';

  this.push(eachFn.str + '\n\n');
  this.push('var ' + nullVar + ' = null;\n\n');
  this.push('function ' + noop + '(){}\n\n');
  this.push(commonJS + 'function ' + name + '(' + dom + ', ' + get + ', props, state) {\n');
  this.push('return (\n', 1);
  this.start(this.ast);
  this.push(');\n', 1);
  this.push('};\n');

  this.prependUsedTags();

  // TODO verify there are no undeclared variables

  var out = this.buffer;
  delete this.buffer;
  return out;
};

Template.prototype.start = function(ast) {
  if (Array.isArray(ast) && ast.length < 2) ast = ast[0];

  if (!Array.isArray(ast)) {
    this.traverse(ast, 2);
    this.push('\n');
    return;
  }

  this.push(this.domVar + '(' + this.tag('div') + ', ' + this.nullVar + ', ', 2);
  this.traverseChildren(ast, 2);
  this.push(')\n');
};

Template.prototype.traverseChildren = function(children, indent) {
  children = children || [];
  if (!children.length) return this.push(this.nullVar);

  var sym = this.genSym('arr');
  this.push('(function() {\n');
  this.push('var ' + sym + ' = [];\n', indent + 1);
  for (var i = 0, c; i < children.length; i++) {
    c = children[i] || {};
    if (c.buffer) this.push(sym + '[' + i + '] = (\n', indent + 1);
    this.traverse(c, indent + (c.buffer ? 2 : 1), i, sym);
    // if (!c.buffer) this.push(';'); // TODO do we need this?
    this.push('\n');
    if (c.buffer) this.push(');\n', indent + 1);
  }
  this.push('return ' + sym + ';\n', indent + 1);
  this.push('})' + this.selfCall, indent);
};

Template.prototype.traverse = function(node, indent, num, sym) {
  if (!node || !node.type) return this.push('""', indent);
  var name = 'visit_' + node.type;
  if (!this[name]) return this.push('""', indent);
  this[name](node, indent, num, sym);
};

Template.prototype.expr = function(str) {
  var ast = acorn.parse(str, {

  });

  var get = this.getVar;
  var noop = this.noopVar;
  var nullVar = this.nullVar;

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

  var out = escodegen.generate(result, {
    format: {
      indent: '',
      newline: '',
      compact: true,
      semicolons: false
    }
  });

  return out;
};

Template.prototype.visit_case = function(node, indent) {
  this.push('case ' + node.expression + ':\n', indent);
  this.push('return (\n', indent + 1);
  this.indent(indent + 2);
  this.traverseChildren(node.children, indent + 2);
  this.push('\n');
  this.push(');\n', indent + 1);
};

Template.prototype.visit_comment = function(node, indent) {
  this.push('/** <!--' + this.indentString(node.value || '', indent + 2) + '--> */', indent);
};

Template.prototype.visit_default = function(node, indent) {
  this.push('default:\n', indent);
  this.push('return (\n', indent + 1);
  this.indent(indent + 2);
  this.traverseChildren(node.children, indent + 2);
  this.push('\n');
  this.push(');\n', indent + 1);
};

Template.prototype.visit_each = function(node, indent) {
  if (!node.children || !node.children.length) return this.push(this.nullVar, indent);

  this.push(eachFn.name + '(', indent);
  this.push(this.expr(node.expression));
  this.push(', function(');
  this.push(node.value);
  this.push(', ');
  this.push(node.key);
  this.push(') {\n');
  this.push('return (\n', indent + 1);
  this.indent(indent + 2);
  this.traverseChildren(node.children, indent + 2);
  this.push('\n');
  this.push(');\n', indent + 1);
  this.push('}', indent);
  if (this.selfCall !== '()') this.push(', this');
  this.push(')');
};

Template.prototype.visit_expression = function(node, indent) {
  this.push(this.expr(node.expression), indent);
};

Template.prototype.visit_else = function(node, indent, index, sym) {
  if (!node.children || !node.children.length) return;

  this.push('else {\n', indent);
  this.push(sym + '[' + index + '] = (\n', indent + 1);
  this.indent(indent + 2);
  this.traverseChildren(node.children, indent + 2);
  this.push('\n');
  this.push(');\n', indent + 1);
  this.push('}', indent);
};

Template.prototype.visit_elseif = function(node, indent, index, sym) {
  if (!node.children || !node.children.length) return;

  this.push('else if (', indent);
  this.push(this.expr(node.expression));
  this.push(') {\n');
  this.push(sym + '[' + index + '] = (\n', indent + 1);
  this.indent(indent + 2);
  this.traverseChildren(node.children, indent + 2);
  this.push('\n');
  this.push(');\n', indent + 1);
  this.push('}', indent);
};

Template.prototype.visit_for = function(node, indent) {
  if (!node.children || !node.children.length) return this.push(this.nullVar, indent);

  var sym = this.genSym('arr');
  var count = this.genSym('count');

  this.push('(function() {\n', indent);
  this.push('var ' + count + ' = 0;\n', indent + 1);
  this.push('var ' + sym + ' = [];\n', indent + 1);
  this.push('for (', indent + 1);
  this.push(this.expr(node.expression));
  this.push(') {\n');
  this.push(sym + '[' + count + '++] = (\n', indent + 2);
  this.indent(indent + 3);
  this.traverseChildren(node.children, indent + 3);
  this.push('\n');
  this.push(');\n', indent + 2);
  this.push('}\n', indent + 1);
  this.push('return ' + sym + ';\n', indent + 1);
  this.push('})' + this.selfCall, indent);
};

Template.prototype.visit_if = function(node, indent, index, sym) {
  if (!node.children || !node.children.length) return;

  this.push('if (', indent);
  this.push(this.expr(node.expression));
  this.push(') {\n');
  this.push(sym + '[' + index + '] = (\n', indent + 1);
  this.indent(indent + 2);
  this.traverseChildren(node.children, indent + 2);
  this.push('\n');
  this.push(');\n', indent + 1);
  this.push('}', indent);
};

Template.prototype.visit_js_comment = function(node, indent) {
  this.push('/**' + this.indentString(node.value || '', indent + 2) + ' */', indent);
};

Template.prototype.visit_props = function(props, indent) {
  var keys = Object.keys(props);
  if (!keys.length) return this.push(this.nullVar);
  this.push('{\n');
  var self = this;
  keys.forEach(function(key, i) {
    self.push('"' + self.mapProp(key) + '"', indent + 1);
    self.push(': (');
    self.push(self.expr(props[key].expression));
    self.push(')');
    if (keys.length - 1 !== i) self.push(',');
    self.push('\n')
  });
  this.push('}', indent);
};

Template.prototype.visit_switch = function(node, indent) {
  if (!node.children || !node.children.length) return this.push(this.nullVar, indent);

  this.push('(function() {\n', indent);
  this.push('switch(', indent + 1);
  this.push(this.expr(node.expression));
  this.push(') {\n');
  var children = node.children || [];
  for (var i = 0; i < children.length; i++) {
    this.traverse(children[i], indent + 2);
  }
  this.push('}\n', indent + 1);
  this.push('})' + this.selfCall, indent);
};

Template.prototype.visit_tag = function(node, indent) {
  this.push(this.domVar + '(' + this.tag(node.name) + ', ', indent);

  this.visit_props(node.props || {}, indent + 1);

  var children = node.children || [];

  if (children.length === 1) {
    this.push(',\n');
    this.traverse(children[0], indent + 1);
  }
  if (children.length > 1) {
    this.push(',\n');
    this.traverseChildren(children, indent + 1);
  }
  this.push(')');
};

Template.prototype.visit_text = function(node, indent) {
  this.push(node.expression, indent);
};

Template.prototype.visit_unless = function(node, indent, index, sym) {
  if (!node.children || !node.children.length) return;

  this.push('if (!(', indent);
  this.push(this.expr(node.expression));
  this.push(')) {\n');
  this.push(sym + '[' + index + '] = (\n', indent + 1);
  this.indent(indent + 2);
  this.traverseChildren(node.children, indent + 2);
  this.push('\n');
  this.push(');\n', indent + 1);
  this.push('}', indent);
};
