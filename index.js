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

var KEY_PROP = '__ast2template_key_prop';

module.exports = function(ast, opts) {
  var template = new Template(ast, opts);
  return template.toString();
};

function Template(ast, opts) {
  if (!(this instanceof Template)) return new Template(ast, opts);
  this.ast = ast;
  this.opts = opts || {};
  if (typeof this.opts.keyName === 'undefined') this.opts.keyName = 'key';
}

Template.prototype.push = function(str, indent) {
  this.indent(indent || 0);
  this.buffer.push(str);
};

Template.prototype.prepend = function(str) {
  this.buffer.unshift(str);
};

Template.prototype.indent = function(num) {
  for (var i = 0; i < num; i++) this.push('  ');
};

Template.prototype.indentString = function(str, indent) {
  var ws = '\n';
  for (var i = 0; i < indent; i++) {
    ws += this.opts.indent || '  ';
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
  if (name.charAt(0).toUpperCase() === name.charAt(0)) return name;
  if (!~tags.indexOf(name)) return JSON.stringify(name);
  if (this.usedTags[name]) return this.usedTags[name];
  return this.usedTags[name] = this.genSym(name);
};

Template.prototype.constStr = function() {
  return this.opts.useConst ? 'const' : 'var';
};

Template.prototype.prependUsedTags = function() {
  var self = this;
  var prepend = ['/**\n * tag references\n */\n\n'];
  Object.keys(this.usedTags).forEach(function(tag) {
    var name = self.usedTags[tag];
    prepend.push(self.constStr() + ' ' + name + ' = ' + JSON.stringify(tag) + ';\n');
  });
  prepend.push('\n\n');
  self.buffer = prepend.concat(self.buffer);
};

Template.prototype.mapProp = function(key) {
  if (key === KEY_PROP) return this.opts.keyName;
  if (key.indexOf('data-') === 0 || key.indexOf('aria-') === 0) return key;
  if (key === 'class') return 'className';
  if (key === 'for') return 'htmlFor';
  var cameled = camel(key);
  if (~supportedProps.indexOf(cameled)) return cameled;
  return key;
};

Template.prototype.toString = function() {
  this.buffer = [];
  this.symCount = 0;
  this.usedTags = {};

  var dom = this.domVar = 'DOM';
  var get = this.getVar = '$get';
  var nullVar = this.nullVar = this.genSym('null');
  var yieldVar = this.yieldVar = this.genSym('yield');
  var noop = this.noopVar = this.genSym('noop');

  this.selfCall = this.opts.selfCall || '()';
  var commonJS = this.opts.isCommonJS !== false && this.opts.autoExport !== false ? 'module.exports = ' : '';
  var name = this.opts.name || '';

  this.push(this.constStr() + ' ' + nullVar + ' = null;\n\n');
  this.push('function ' + noop + '(){}\n\n');
  this.push(commonJS + 'function ' + name + '(' + dom + ', ' + get + ', ' + yieldVar + ', props, state, params, t) {\n');
  this.start(this.ast);
  this.push('};\n');

  this.prependUsedTags();

  var out = this.buffer.map(function(part) {
    return typeof part === 'function' ? part() : part;
  }).join('');
  delete this.buffer;

  // TODO verify there are no undeclared variables

  return out;
};

Template.prototype.pushEach = function() {
  if (this._hasIncludedEach) return;
  this._hasIncludedEach = true;
  var str = this.opts.isCommonJS !== false ?
    this.constStr() + ' ' + eachFn.name + ' = require(' + JSON.stringify(require.resolve('./lib/each')) + ');\n\n' :
    eachFn.toString() + '\n\n';
  this.buffer.unshift(str);
};

Template.prototype.start = function(ast) {
  var isArray = Array.isArray(ast);

  if (isArray && ast.length >= 2 && !this.opts.wrapRoot) return this.traverseChildren(ast, 0, true);

  this.push('return (\n', 1);
  if (isArray && ast.length < 2) {
    this.traverse(ast, 2);
  } else {
    this.push(this.domVar + '(' + this.tag('div') + ', ' + this.nullVar + ', ', 2);
    this.traverseChildren(ast, 2);
    this.push(')');
  }
  this.push('\n');
  this.push(');\n', 1);
};

Template.prototype.traverseChildren = function(children, indent, removeSelfCall) {
  children = children || [];
  if (!children.length) return this.push(this.nullVar);

  var sym = this.genSym('arr');
  if (!removeSelfCall) this.push('(function() {\n');

  var counter = 0;
  function index(current) {
    return current ? (counter - 1) : counter++;
  }

  this.push(function() {
    // http://jsperf.com/init-array-static
    return 'var ' + sym + ' = new Array(' + counter + ');\n';
  }, indent + 1);

  for (var i = 0, c; i < children.length; i++) {
    c = children[i] || {};
    if (c.buffer) this.push(';' + sym + '[' + index() + '] = (\n', indent + 1);
    this.traverse(c, indent + (c.buffer ? 2 : 1), index, sym);
    this.push('\n');
    if (c.buffer) this.push(');\n', indent + 1);
  }

  this.push('return ' + sym + ';\n', indent + 1);
  if (!removeSelfCall) this.push('})' + this.selfCall, indent);
};

Template.prototype.traverse = function(node, indent, num, sym) {
  if (!node || !node.type) return this.push(this.nullVar, indent);
  var name = 'visit_' + node.type;
  if (!this[name]) return this.push(this.nullVar, indent);
  this[name](node, indent, num, sym);
};

Template.prototype.expr = function(str) {
  var ast = typeof str !== 'string' ? str : acorn.parse(str, {
    ecmaVersion: 6
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

Template.prototype.visit_comment = function(node, indent, index) {
  this.push(this.nullVar + '/** <!--' + this.indentString(node.value || '', indent + 2) + '--> */', indent);
  if (typeof index !== 'undefined') this.push(';');
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

  this.pushEach();
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
  this.push(sym + '[' + index() + '] = (\n', indent + 1);
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
  this.push(sym + '[' + index() + '] = (\n', indent + 1);
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
  this.push(sym + '[' + index() + '] = (\n', indent + 1);
  this.indent(indent + 2);
  this.traverseChildren(node.children, indent + 2);
  this.push('\n');
  this.push(');\n', indent + 1);
  this.push('}', indent);
};

Template.prototype.visit_import = function(node, indent) {
  var ast = acorn.parse('import ' + node.expression, {ecmaVersion: 6});
  var body = ast.body[0]
  var specifiers = body.specifiers;
  if (specifiers.length !== 1 || specifiers[0]['default'] !== true) return this.prepend('import ' + node.expression + ';\n');
  var spec = specifiers[0].id;
  this.prepend('var ' + spec.name + ' = require(' + body.source.raw + ');\n');
};

Template.prototype.visit_js_comment = function(node, indent, index) {
  var pre = typeof index === 'undefined' ? this.nullVal : '';

  this.push(pre + '/**' + this.indentString(node.value || '', indent + 2) + ' */', indent);
};

Template.prototype.visit_props = function(props, indent, $index) {
  var keys = Object.keys(props);

  if (this.opts.keyName && typeof $index !== 'undefined' && !~keys.indexOf(this.opts.keyName)) keys.push(KEY_PROP);

  if (!keys.length) return this.push(this.nullVar);

  this.push('{\n');
  var self = this;
  keys.forEach(function(key, i) {
    self.push('"' + self.mapProp(key) + '"', indent + 1);
    self.push(': (');

    var prop = props[key];
    if (key === KEY_PROP) {
      self.push($index(true));
    } else if (key === 'class') {
      self.visit_prop_class(prop, indent, $index);
    } else {
      Array.isArray(prop.expression) ?
        self.traverseChildren(prop.expression, indent + 1) :
        self.push(self.expr('(' + prop.expression + ')'));
    }

    self.push(')');
    if (keys.length - 1 !== i) self.push(',');
    self.push('\n');
  });
  this.push('}', indent);
};

Template.prototype.visit_prop_class = function(klass, indent, $index) {
  var self = this;

  // TODO sort the classes and put the expressions at the back

  var out = (klass.expressions).map(function(c) {
    var wrapped = '(' + c + ')';

    var ast = acorn.parse(wrapped, {
      ecmaVersion: 6
    });

    var expr = ast.body[0].expression;

    if (expr.type === 'Literal') return c;
    if (expr.type === 'Identifier') return c; //TODO include runtime class toggle lib
    if (expr.type !== 'ObjectExpression') return '(' + self.expr(ast) + ')';

    var exprs = expr.properties.map(function(prop) {
      var cond = {
        type: 'ConditionalExpression',
        test: prop.value,
        consequent: prop.key,
        alternate: {type: 'Literal', value: '', raw: '""'}
      };

      return self.expr({
        type: 'Program',
        body: [{
          type: 'ExpressionStatement',
          expression: cond
        }]
      });
    }).join(' + " " + ');

    return '(' + exprs + ')';
  }).join(' + " " + ');

  this.push(out);
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

Template.prototype.visit_tag = function(node, indent, index) {
  if (node.name === 't') return this.visit_translate(node, indent, index);
  this.push(this.domVar + '(' + this.tag(node.name) + ', ', indent);

  this.visit_props(node.props || {}, indent + 1, index);

  var children = node.children || [];

  if (children.length === 1) {
    this.push(',\n');
    this.traverse(children[0], indent + 1);
  }
  if (children.length > 1) {
    this.push(',\n');
    this.indent(indent + 1);
    this.traverseChildren(children, indent + 1);
  }
  this.push('\n')
  this.push(')', indent);
};

Template.prototype.visit_text = function(node, indent) {
  this.push(node.expression, indent);
};

Template.prototype.visit_translate = function(node, indent, index) {
  var props = node.props;

  var path = props.path;
  delete props.path;

  var defaultValue = props['-'] ?
    '(process.env.NODE_ENV !== "production" ? ' + props['-'].expression + ' : ' + this.nullVar + ')' :
    this.nullVar;
  delete props['-'];

  this.push('t(' + this.expr(path.expression) + ', ', indent);
  this.visit_props(node.props || {}, indent + 1, index);
  this.push(',' + defaultValue + ', true)');
};

Template.prototype.visit_unless = function(node, indent, index, sym) {
  if (!node.children || !node.children.length) return;

  this.push('if (!(', indent);
  this.push(this.expr(node.expression));
  this.push(')) {\n');
  this.push(sym + '[' + index() + '] = (\n', indent + 1);
  this.indent(indent + 2);
  this.traverseChildren(node.children, indent + 2);
  this.push('\n');
  this.push(');\n', indent + 1);
  this.push('}', indent);
};

Template.prototype.visit_var = function(node, indent) {
  this.push('var ' + this.expr(node.expression) + ';\n', indent);
};

Template.prototype.visit_yield = function(node, indent, index, sym) {
  this.push(this.yieldVar + '()', indent);
};
