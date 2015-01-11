/**
 * Module dependencies
 */

var Blarney = require('blarney');
var flatten = require('./utils').flatten;

module.exports = function(seed) {
  var b = new Blarney(seed);
  var l = 84;
  var arr = new Array(l);
  for (var i = 0, out; i < l; i++) {
    arr[i] = new Test(b);
    process.stdout.write('-');
  }
  return arr;
};

function Test(b) {
  this.b = b;
  var conf = this._children();
  this.input = conf[0];
  this.output = flatten(conf[1]);
}

Test.prototype._children = function() {
  var l = this.b.weightedPick([0,1,2,3,4,5,6,7,8,12,14,16,18,20]);

  if (l === 0) return [null, null];

  var input = [], output = [], conf;

  for (var i = 0; i < l; i++) {
    conf = this._node();
    input[i] = conf[0];
    output[i] = flatten(conf[1]);
  }
  return [input, output];
};

Test.prototype._set_children = function(node) {
  var input = node[0];
  var output = node[1];
  if (!input.children) input.children = null;
  if (!output.children) output.children = null;
  if (this.b.frac() < 0.12) {
    var conf = this._children();
    if (!input.children) input.children = conf[0];
    if (!output.children) output.children = flatten(conf[1]);
  }
  return node;
};

var types = [
  'comment',
  'each',
  'expression',
  'text',
  'tag',
];

Test.prototype._node = function(i) {
  var fn = '_' + this.b.pick(types);
  return this[fn](i);
};

Test.prototype._comment = function() {
  return [
    {
      type: 'comment',
      value: this.b.words()
    }
  , null];
};

Test.prototype._each = function(i) {
  var expr = this.b.pick([
    '[1,2,3]',
    '{"1": true, "2": false, "3": true}',
    '[]',
    '{}'
  ]);

  var input = {
    type: 'each',
    expression: expr,
    value: 'item',
    key: '$index',
    buffer: true
  };

  var output = {

  };

  var conf = this._set_children([input, output]);

  var children = conf[1].children;

  if (children && expr !== '[]' && expr !== '{}') return [input, [children, children, children]];
  return [input, null];
};

Test.prototype._expression = function() {
  var expr = this.b.pick([
    ['params.foobar', null],
    ['"this is a string"', 'this is a string'],
    ['[1,2,3,4,5]', [1,2,3,4,5]]
  ]);

  return [{
    type: 'expression',
    expression: expr[0],
    buffer: true
  }, expr[1]]
};

var tags = [
  'div',
  'span',
  'pre',
  'p',
  'section'
];

Test.prototype._tag = function(i) {
  var tag = this.b.pick(tags);

  var input = {
    type: 'tag',
    name: tag,
    buffer: true
  };

  var output = {
    tag: tag,
    props: {}
  };

  return this._set_children([input, output]);
};

Test.prototype._text = function() {
  var str = this.b.words();
  return [{
    type: 'text',
    expression: JSON.stringify(str),
    buffer: true
  }, str];
};
