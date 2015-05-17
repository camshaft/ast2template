/**
 * Module dependencies
 */

var acorn = require('acorn');
var tags = require('./lib/supported-tags');
var createHash = require('crypto').createHash;
var camel = require('to-camel-case');
var eachFn = require('./lib/each');
var mergeFn = require('./lib/merge');
var memberExpression = require('./lib/member-expression');
var safeExpression = require('./lib/safe-expression');
var supportedProps = require('./lib/supported-props');
var debug = require('debug')('ast2template');

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
  this.prepends.push(str);
};

Template.prototype.append = function(str) {
  this.appends.push(str);
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
  this.prepend('/**\n * tag references\n */\n\n');
  Object.keys(this.usedTags).forEach(function(tag) {
    var name = self.usedTags[tag];
    self.prepend(self.constStr() + ' ' + name + ' = ' + JSON.stringify(tag) + ';\n');
  });
  this.prepend('\n\n');
};

Template.prototype.mapProp = function(key) {
  if (key === KEY_PROP) return this.opts.keyName;
  if (this.opts.passThroughProps) return key;
  if (key.indexOf('data-') === 0 || key.indexOf('aria-') === 0) return key;
  if (key === 'class') return 'className';
  if (key === 'for') return 'htmlFor';
  var cameled = camel(key);
  if (~supportedProps.indexOf(cameled)) return cameled;
  return key;
};

Template.prototype.toString = function() {
  this.buffer = [];
  this.prepends = [];
  this.appends = [];
  this.symCount = 0;
  this.usedTags = {};

  var dom = this.domVar = 'DOM';
  var get = this.getVar = '$get';
  var yieldVar = this.yieldVar = '$yield';
  var nullVar = this.nullVar = this.genSym('null');
  var noop = this.noopVar = this.genSym('noop');

  this.selfCall = this.opts.selfCall || '()';
  var commonJS = this.opts.isCommonJS !== false && this.opts.autoExport !== false ? 'exports.render = ' : '';
  var name = this.opts.name || '';

  if (this.opts.root) this.push('var __ = require(' + JSON.stringify(this.opts.root) + ');\n');
  else this.push('var __ = {};\n');

  this.push(this.constStr() + ' ' + nullVar + ' = null;\n\n');
  this.push('function ' + noop + '(){}\n\n');

  this.push(commonJS + 'function ' + name + '(' + dom + ', ' + get + ', props, state, ' + yieldVar + ', params, query, forms, t, error) {\n');
  this.push('var self = this;\n', 1);
  this.start(this.ast);
  this.push('};\n');

  this.prependUsedTags();

  var out = this.prepends.concat(this.buffer).concat(this.appends).map(function(part) {
    return typeof part === 'function' ? part() : part;
  }).join('');
  delete this.buffer;

  // TODO verify there are no undeclared variables

  debug('output', out);

  return out;
};

Template.prototype.pushEach = function() {
  if (this._hasIncludedEach) return;
  this._hasIncludedEach = true;
  var eachPath = JSON.stringify(require.resolve('./lib/each'));

  var str = this.opts.isCommonJS !== false ?
    this.constStr() + ' ' + eachFn.name + ' = require(' + eachPath + ');\n\n' :
    eachFn.toString() + '\n\n';
  this.prepend(str);
};

Template.prototype.pushSafeExpression = function() {
  if (this._hasIncludedSafeExpression) return;
  this._hasIncludedSafeExpression = true;
  var str = this.opts.isCommonJS !== false ?
    this.constStr() + ' ' + safeExpression.name + ' = require(' + JSON.stringify(require.resolve('./lib/safe-expression')) + ');\n\n' :
    safeExpression.toString() + '\n\n';
  this.prepend(str);
};

Template.prototype.pushMerge = function() {
  if (this._hasIncludedMerge) return;
  this._hasIncludedMerge = true;
  var mergePath = JSON.stringify(require.resolve('./lib/merge'));

  var str = this.opts.isCommonJS !== false ?
        this.constStr() + ' ' + mergeFn.name + ' = require(' + mergePath + ');\n\n' :
        mergeFn.toString() + '\n\n';
  this.prepend(str);
};

Template.prototype.start = function(ast) {
  if (!ast) return this.push('return ' + this.nullVar + ';\n', 1);

  var isArray = Array.isArray(ast);

  if (isArray && ast.length >= 2 && !this.opts.wrapRoot) return this.traverseChildren(ast, 0, true);

  this.push('return (\n', 1);
  if (isArray && ast.length < 2) {
    this.traverse(ast[0], 2);
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

  if (children.length === 1 && children[0] && children[0].buffer) {
    if (removeSelfCall) this.push('return (\n', indent + 1);
    this.traverse(children[0], indent + 2);
    if (removeSelfCall) {
      this.push('\n');
      this.push(');\n', indent + 1);
    }
    return;
  }

  var buffered = countBufferedChildren(children);
  if (buffered < 2) return this.traverseSingleBufferedChild(children, indent, removeSelfCall, buffered);

  var sym = this.genSym('arr');
  if (!removeSelfCall) this.push('(function() {\n');

  var counter = 0;
  function statement(current) {
    return current ? (counter - 1) : '; ' + sym + '[' + (counter++) + '] = ';
  }

  this.push(function() {
    // http://jsperf.com/init-array-static/3
    return 'var ' + sym + ' = new Array(' + counter + ');\n';
  }, indent + 1);

  for (var i = 0, c; i < children.length; i++) {
    c = children[i] || {};
    if (c.buffer) this.push(statement() + '(\n', indent + 1);
    this.traverse(c, indent + (c.buffer ? 2 : 1), statement);
    this.push('\n');
    if (c.buffer) this.push(');\n', indent + 1);
  }

  this.push('return ' + sym + ';\n', indent + 1);
  if (!removeSelfCall) this.push('})' + this.selfCall, indent);
};

Template.prototype.traverseSingleBufferedChild = function(children, indent, removeSelfCall, buffered) {
  var sym = this.genSym('res');

  var i = 0;

  function statement(current) {
    if (current) return false;
    return i + 1 === children.length ?
      '; return ' :
      '; ' + sym + ' = ';
  }

  if (!removeSelfCall) this.push('(function() {\n');

  this.push('var ' + sym + ';\n', indent + 1);

  for (var c; i < children.length; i++) {
    c = children[i] || {};
    if (c.buffer) this.push(statement() + '(\n', indent + 1);
    this.traverse(c, indent + (c.buffer ? 2 : 1), statement);
    this.push('\n');
    if (c.buffer) this.push(');\n', indent + 1);
  }

  if (buffered) this.push('return ' + sym + ';\n', indent + 1);
  if (!removeSelfCall) this.push('})' + this.selfCall, indent);
};

Template.prototype.traverse = function(node, indent, num) {
  if (!node || !node.type) return this.push(this.nullVar, indent);
  var name = 'visit_' + node.type;
  if (!this[name]) return this.push(this.nullVar, indent);
  this[name](node, indent, num);
};

Template.prototype.expr = function(str, line) {
  var get = this.getVar;
  var noop = this.noopVar;
  var nullVar = this.nullVar;
  if (this.opts.nativePath) return typeof str === 'object' ? memberExpression.toString(str) : str;
  if (typeof str === 'boolean') return str;

  try {
    return memberExpression(str, get, noop, nullVar, this.opts.globals);
  } catch (e) {
    throw invalidExpression(str, line);
  }
};

Template.prototype.visit_named_block = function(node, indent) {
  var args = node.args ? 'function ' + node.args + ' {' : '(';
  this.push('self[' + JSON.stringify(node.name) + '] = ' + args + '\n', indent);
  var i = node.args ? indent : indent - 1;
  if (node.args) {
    this.push(this.getVar + ' = this.g;\n', indent + 2);
    this.push('t = this.t;\n', indent + 1);
    this.push('return (\n', indent + 1);
  }
  this.traverseChildren(node.children, i);
  this.push('\n');
  if (node.args) this.push(');\n', indent + 1);
  this.push(node.args ? '}' : ')', indent);
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
  var pre = typeof index === 'undefined' ? this.nullVar : '';
  this.push(pre + '/** <!--' + this.indentString(node.value || '', indent + 2) + '--> */', indent);
};

Template.prototype.visit_const = function(node, indent) {
  this.prepend(this.constStr() + ' ' + node.expression + ';\n', indent);
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
  this.push(this.expr(node.expression, node.line));
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

Template.prototype.visit_export = function(node, indent) {
  var expr = node.expression;
  if (!/\; *$/.test(expr)) expr += ';';
  this.append('export ' + expr + '\n\n');
};

Template.prototype.visit_expression = function(node, indent) {
  var out = this.expr(node.expression, node.line);
  if (!node.expression.buffer || out.indexOf('t(') === 0) return this.push(out, indent);
  this.pushSafeExpression();
  var expr = safeExpression.name + '(' + out +
        ', (process.env.NODE_ENV !== "production" ? [' +
          JSON.stringify(node.expression) + ', ' + (node.line || 0) +
          '] : null))';
  this.push(expr, indent);
};

Template.prototype.visit_else = function(node, indent, statement) {
  if (!node.children || !node.children.length) return;

  this.push('else {\n', indent);
  this.push(statement() + '(\n', indent + 1);
  this.indent(indent + 2);
  this.traverseChildren(node.children, indent + 2);
  this.push('\n');
  this.push(');\n', indent + 1);
  this.push('}', indent);
};

Template.prototype.visit_elseif = function(node, indent, statement) {
  if (!node.children || !node.children.length) return;

  this.push('else if (', indent);
  this.push(this.expr(node.expression, node.line));
  this.push(') {\n');
  this.push(statement() + '(\n', indent + 1);
  this.indent(indent + 2);
  this.traverseChildren(node.children, indent + 2);
  this.push('\n');
  this.push(');\n', indent + 1);
  this.push('}', indent);
};

Template.prototype.visit_filter = function(node, indent) {
  var resolve = this.opts.resolveFilter;
  if (!resolveFilter) return console.error('Missing resolveFilter option in ast2template');
  var as = node.attrs.as;
  if (as) this.prepend('var ' + as + ' = ');
  delete node.attrs.as;
  this.prepend('require(' +
      JSON.stringify(resolveFilter(node.name, node.content, node.attrs)) +
      ');\n');
};

Template.prototype.visit_for = function(node, indent) {
  if (!node.children || !node.children.length) return this.push(this.nullVar, indent);

  var sym = this.genSym('arr');
  var count = this.genSym('count');

  var str = node.expression;
  var expr;
  try {
    expr = this.expr(str, node.line);
  } catch (err) {
    // add support for "for (var k of ...)"
    var match = str.match(/^( *(?:var|let) +[a-zA-Z_][a-zA-Z0-9_]* +of +)(.*)/);
    if (!match) throw err;

    // TODO why are you cutting of the last ) jade?
    try {
      expr = match[1] + this.expr(match[2] + ')');
    } catch (e) {
      expr = match[1] + this.expr(match[2]);
    }
  }

  this.push('(function() {\n', indent);
  this.push('var ' + count + ' = 0;\n', indent + 1);
  this.push('var ' + sym + ' = [];\n', indent + 1);
  this.push('for (', indent + 1);
  this.push(expr);
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

Template.prototype.visit_function = function(node, indent, statement) {
  this.push('function ' + node.expression + '{\n', indent);
  this.traverseChildren(node.children, indent + 2, true);
  this.push('}')
};

Template.prototype.visit_if = function(node, indent, statement) {
  if (!node.children || !node.children.length) return;

  if (!statement) {
    this.push('(', indent);
    this.push(this.expr(node.expression, node.line));
    this.push(') && ');
    return this.traverseChildren(node.children, indent);
  }

  this.push('if (', indent);
  this.push(this.expr(node.expression, node.line));
  this.push(') {\n');
  this.push(statement() + '(\n', indent + 1);
  this.indent(indent + 2);
  this.traverseChildren(node.children, indent + 2);
  this.push('\n');
  this.push(');\n', indent + 1);
  this.push('}', indent);
};

Template.prototype.visit_import = function(node, indent) {
  // for some reason our transform doesn't support wildcard
  var matches = node.expression.match(/ *\* *as *([^ ]+) *from *(.+)/);
  if (!matches) return this.prepend('import ' + node.expression + ';\n');
  this.prepend('var ' + matches[1] + ' = require(' + matches[2] + ');\n');
};

Template.prototype.visit_js_comment = function(node, indent, index) {
  var pre = typeof index === 'undefined' ? this.nullVal : '';
  this.push(pre + '/**' + this.indentString(node.value || '', indent + 2) + ' */', indent);
};

Template.prototype.visit_props = function(props, indent, $index) {
  props = JSON.parse(JSON.stringify(props));
  var mergeProp = props['&props'] ? props['&props'].expressions : [];
  delete props['&props'];

  if (props.style) {
    if (props.style.expressions.length === 1) {
      props.style.expression = props.style.expressions[0];
    } else {
      mergeProp = mergeProp.concat(props.style.expressions);
      delete props.style;
    }
  }

  var keys = Object.keys(props);

  if (this.opts.keyName &&
      typeof $index !== 'undefined' &&
      $index(true) !== false &&
      !~keys.indexOf(this.opts.keyName)) keys.push(KEY_PROP);

  if (!keys.length && !mergeProp.length) return this.push(this.nullVar);

  mergeProp = mergeProp.map(function(prop) {
    return this.expr(prop);
  }.bind(this));

  if (mergeProp.length) this.pushMerge();
  this.push(mergeProp.length ? mergeFn.name + '({\n' : '{\n');
  var self = this;
  keys.forEach(function(key, i) {
    self.push(JSON.stringify(self.mapProp(key)), indent + 1);
    self.push(': (');

    var prop = props[key];
    if (key === KEY_PROP) {
      self.push($index(true));
    } else if (key === 'class') {
      self.visit_prop_class(prop, indent);
    } else {
      self.visit_prop_expression(prop, indent);
    }

    self.push(')');
    if (keys.length - 1 !== i) self.push(',');
    self.push('\n');
  });

  var ending = mergeProp.length ?
    '}, ' + mergeProp.join(', ') + ')' :
    '}';
  this.push(ending, indent);
};

Template.prototype.visit_prop_expression = function(prop, indent) {
  if (!Array.isArray(prop.expression)) return this.push(this.expr(prop.expression, prop.line));

  var hasArgs = !!prop.args;

  if (hasArgs) {
    var args = prop.args.replace('(', '').replace(')', '').split(/ *, */);
    this.push('(function' + '(' + args.join(', ') + ') {\n');
    this.push(this.getVar + ' = this.g;\n', indent + 2);
    this.push('t = this.t;\n', indent + 2);
  }

  this.traverseChildren(prop.expression, indent + 1, hasArgs);

  if (hasArgs) this.push('})', 1 + indent);
};

Template.prototype.visit_prop_class = function(klass, indent) {
  var self = this;

  // TODO sort the classes and put the expressions at the back

  var out = (klass.expressions).map(function(c) {
    var wrapped = '(' + c + ')';

    try {
      var ast = acorn.parse(wrapped, {
        ecmaVersion: 6
      });
    } catch (e) {
      throw invalidExpression(c);
    }

    var expr = ast.body[0].expression;

    if (expr.type === 'Literal') return c;
    if (expr.type === 'Identifier') return c; //TODO include runtime class toggle lib
    if (expr.type !== 'ObjectExpression') return '(' + self.expr(ast) + ')';

    var exprs = expr.properties.map(function(prop) {
      // convert identifiers
      if (prop.key.type === 'Identifier') {
        prop.key = {
          type: 'Literal',
          start: prop.key.start,
          end: prop.key.end,
          value: prop.key.name,
          raw: JSON.stringify(prop.key.name)
        };
      }

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

Template.prototype.visit_tag = function(node, indent, statement) {
  if (node.name === 't') return this.visit_translate(node, indent, statement);
  this.push(this.domVar + '(' + this.tag(node.name) + ', ', indent);

  this.visit_props(node.props || {}, indent + 1, statement);

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

Template.prototype.visit_translate = function(node, indent, statement) {
  var props = node.props;

  var path = props.path;
  delete props.path;

  var defaultValue = props['_'] ?
    '(process.env.NODE_ENV !== "production" ? ' + props['_'].expression + ' : ' + this.nullVar + ')' :
    this.nullVar;
  delete props['_'];

  this.push('t(' + this.expr(path.expression, path.line) + ', ', indent);
  this.visit_props(node.props || {}, indent + 1, statement);
  this.push(',' + defaultValue + ', true)');
};

Template.prototype.visit_unless = function(node, indent, statement) {
  if (!node.children || !node.children.length) return;

  this.push('if (!(', indent);
  this.push(this.expr(node.expression, node.line));
  this.push(')) {\n');
  this.push(statement() + '(\n', indent + 1);
  this.indent(indent + 2);
  this.traverseChildren(node.children, indent + 2);
  this.push('\n');
  this.push(');\n', indent + 1);
  this.push('}', indent);
};

Template.prototype.visit_var = function(node, indent) {
  this.push(this.expr('var ' + node.expression, node.line) + ';\n', indent);
};

Template.prototype.visit_yield = function(node, indent, statement) {
  var name = node.name ? JSON.stringify(node.name) : '';
  var pre = statement ? statement() : '';
  var args = node.args && !/^ *\( *\)$/.test(node.args) ?
        node.args.replace(/^ *\(/, ', ') :
        ')';
  this.push(pre + this.expr(this.yieldVar + '(' + name + args, indent));
};

function invalidExpression(expr, line) {
  return new Error('invalid expression: ' + JSON.stringify(expr) + lineString(line));
}

function lineString(line) {
  return line ? ' (' + line + ')' : '';
}

var fakeBuffers = {
  else: true,
  elseif: true,
  if: true,
  unless: true,
  yield: true
};
function countBufferedChildren(children) {
  return children.reduce(function(acc, child) {
    return child && (child.buffer || child.type in fakeBuffers) ? acc + 1 : acc;
  }, 0);
}
